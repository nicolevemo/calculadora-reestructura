-- ============================================================
-- PLATAFORMA DE REESTRUCTURA — SCHEMA INICIAL
-- ============================================================
-- Cómo usar: copiar TODO este archivo y pegarlo en
-- Supabase → SQL Editor → New query → Run.
-- Es idempotente (puedes correrlo varias veces sin romper nada).
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- 2. ENUMS
-- ============================================================
do $$ begin
  create type user_role as enum ('gestor', 'agente', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_status as enum (
    'listo_contactar',
    'sin_respuesta',
    'en_negociacion',
    'aceptado',
    'rechazado',
    'necesita_revision'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type upload_status as enum ('procesando', 'activo', 'archivado');
exception when duplicate_object then null; end $$;


-- ============================================================
-- 3. TABLA: profiles
-- Extiende auth.users con rol y nombre completo
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'agente',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: cuando se registra un user en auth.users, crear profile automáticamente
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- 4. TABLA: shortlist_uploads
-- Cada CSV subido por el gestor
-- ============================================================
create table if not exists shortlist_uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text,
  uploaded_at timestamptz default now(),
  uploaded_by uuid references profiles(id) on delete set null,
  client_count int default 0,
  status upload_status default 'activo',
  week_of date,
  notes text
);

create index if not exists idx_uploads_uploaded_at on shortlist_uploads(uploaded_at desc);


-- ============================================================
-- 5. TABLA: clientes
-- Cada fila del CSV se convierte en un cliente
-- ============================================================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references shortlist_uploads(id) on delete cascade,

  -- Identificación
  af text not null,
  nombre text not null,
  telefono text,

  -- Características del vehículo / contrato
  vehiculo text,
  plataforma text,
  bucket text,
  origination_date date,
  plazo_remanente int not null check (plazo_remanente > 0),

  -- Datos financieros (vienen del CSV)
  adeudo numeric(12,2) not null,            -- Saldo Vencido
  semana numeric(12,2) not null,            -- Renta semana siguiente
  pago_en_dia boolean default false,
  monto_pago_dia numeric(12,2) default 0,

  -- API y telemetría
  api_uber boolean default false,
  api_didi boolean default false,
  ingresos_api numeric(12,2),
  viajes_api int,
  ci text,
  energia_adicional numeric(12,2),

  -- Otros
  comments_originales text,
  created_at timestamptz default now()
);

create index if not exists idx_clientes_upload on clientes(upload_id);
create index if not exists idx_clientes_af on clientes(af);


-- ============================================================
-- 6. TABLA: negociaciones
-- Estado y datos de la llamada que captura el agente
-- ============================================================
create table if not exists negociaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade unique,

  status call_status not null default 'listo_contactar',
  intentos int default 0 check (intentos >= 0 and intentos <= 10),

  pago_intencion numeric(12,2),
  fecha_compromiso date,
  motivo_rechazo text,
  notes text,

  pdf_enviado_at timestamptz,
  pdf_storage_path text,

  assigned_to uuid references profiles(id) on delete set null,
  last_activity_at timestamptz default now(),
  last_activity_by uuid references profiles(id) on delete set null,

  exported_at timestamptz,
  exported_by uuid references profiles(id) on delete set null,

  bono_pronto_pago boolean not null default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_negociaciones_status on negociaciones(status);
create index if not exists idx_negociaciones_assigned on negociaciones(assigned_to);


-- ============================================================
-- 7. TABLA: actividad_log
-- Auditoría — quién hizo qué y cuándo
-- ============================================================
create table if not exists actividad_log (
  id bigserial primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  agente_id uuid references profiles(id) on delete set null,
  accion text not null,
  estado_anterior call_status,
  estado_nuevo call_status,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_actividad_cliente on actividad_log(cliente_id);
create index if not exists idx_actividad_fecha on actividad_log(created_at desc);


-- ============================================================
-- 8. TRIGGER: auto-crear negociación cuando se inserta un cliente
-- ============================================================
create or replace function create_default_negociacion()
returns trigger
language plpgsql
as $$
begin
  insert into negociaciones (cliente_id, status, last_activity_at)
  values (new.id, 'listo_contactar', now())
  on conflict (cliente_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_negociacion on clientes;
create trigger trg_create_negociacion
  after insert on clientes
  for each row execute function create_default_negociacion();


-- ============================================================
-- 9. TRIGGER: updated_at automático
-- ============================================================
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_negociaciones_updated_at on negociaciones;
create trigger trg_negociaciones_updated_at
  before update on negociaciones
  for each row execute function update_updated_at_column();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();


-- ============================================================
-- 10. TRIGGER: log de cambios de estado
-- ============================================================
create or replace function log_status_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    insert into actividad_log (cliente_id, agente_id, accion, estado_anterior, estado_nuevo, payload)
    values (
      new.cliente_id,
      new.last_activity_by,
      'status_change',
      old.status,
      new.status,
      jsonb_build_object(
        'pago_intencion', new.pago_intencion,
        'intentos', new.intentos,
        'fecha_compromiso', new.fecha_compromiso
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_status_change on negociaciones;
create trigger trg_log_status_change
  after update on negociaciones
  for each row execute function log_status_change();


-- ============================================================
-- 11. VISTA: dashboard de clientes
-- Tabla unificada que usa el frontend para listar
-- ============================================================
create or replace view v_clientes_dashboard as
select
  c.id,
  c.upload_id,
  c.af,
  c.nombre,
  c.telefono,
  c.vehiculo,
  c.plataforma,
  c.bucket,
  c.plazo_remanente,
  c.adeudo,
  c.semana,
  c.pago_en_dia,
  c.monto_pago_dia,
  c.api_uber,
  c.api_didi,
  c.ingresos_api,
  c.viajes_api,
  c.created_at,

  n.id           as negociacion_id,
  n.status,
  n.intentos,
  n.pago_intencion,
  n.fecha_compromiso,
  n.motivo_rechazo,
  n.notes,
  n.pdf_enviado_at,
  n.assigned_to,
  n.last_activity_at,
  p.full_name    as assigned_to_name,
  u.week_of      as upload_week_of,
  u.filename     as upload_filename,
  n.exported_at,
  n.exported_by,
  n.bono_pronto_pago
from clientes c
left join negociaciones n on n.cliente_id = c.id
left join profiles p       on p.id = n.assigned_to
left join shortlist_uploads u on u.id = c.upload_id;


-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
alter table profiles            enable row level security;
alter table shortlist_uploads   enable row level security;
alter table clientes            enable row level security;
alter table negociaciones       enable row level security;
alter table actividad_log       enable row level security;

-- Limpiar policies viejas si existen (idempotencia)
drop policy if exists "auth_read_profiles" on profiles;
drop policy if exists "self_update_profiles" on profiles;
drop policy if exists "auth_read_uploads" on shortlist_uploads;
drop policy if exists "gestor_insert_uploads" on shortlist_uploads;
drop policy if exists "auth_read_clientes" on clientes;
drop policy if exists "gestor_insert_clientes" on clientes;
drop policy if exists "auth_read_negociaciones" on negociaciones;
drop policy if exists "auth_update_negociaciones" on negociaciones;
drop policy if exists "auth_read_actividad" on actividad_log;
drop policy if exists "auth_insert_actividad" on actividad_log;

-- PROFILES: cualquier autenticado lee, cada uno actualiza el suyo
create policy "auth_read_profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "self_update_profiles"
  on profiles for update
  using (auth.uid() = id);

-- SHORTLIST UPLOADS: leen todos, solo gestor/admin inserta
create policy "auth_read_uploads"
  on shortlist_uploads for select
  using (auth.role() = 'authenticated');

create policy "gestor_insert_uploads"
  on shortlist_uploads for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('gestor','admin')
    )
  );

-- CLIENTES: leen todos, solo gestor/admin inserta
create policy "auth_read_clientes"
  on clientes for select
  using (auth.role() = 'authenticated');

create policy "gestor_insert_clientes"
  on clientes for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('gestor','admin')
    )
  );

-- NEGOCIACIONES: cualquier autenticado lee y actualiza
create policy "auth_read_negociaciones"
  on negociaciones for select
  using (auth.role() = 'authenticated');

create policy "auth_update_negociaciones"
  on negociaciones for update
  using (auth.role() = 'authenticated');

-- ACTIVIDAD LOG: cualquier autenticado lee e inserta
create policy "auth_read_actividad"
  on actividad_log for select
  using (auth.role() = 'authenticated');

create policy "auth_insert_actividad"
  on actividad_log for insert
  with check (auth.role() = 'authenticated');


-- ============================================================
-- 13. SEED DATA (opcional, comentar en producción)
-- ============================================================
-- Después de crear tu primer usuario, ejecutá manualmente:
--
--   update profiles set role = 'gestor' where email = 'nicole.sigmaringo@vemo.com.mx';
--
-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
