-- ============================================================
-- ADDENDUM: Acceso por invitación + API keys
-- ============================================================
-- Correr DESPUÉS de `02-supabase-schema.sql`.
-- También es idempotente.
-- ============================================================


-- ============================================================
-- 1. ACCESO POR INVITACIÓN
-- ============================================================

create table if not exists invited_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'agente',
  full_name text,
  invited_by uuid references profiles(id) on delete set null,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  notes text
);

create index if not exists idx_invited_email on invited_users(lower(email));

-- Trigger: cuando se crea un profile (vía Supabase Auth tras click en magic link),
-- si el email está en invited_users, asignar su rol y marcar como aceptado.
create or replace function assign_role_from_invitation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
begin
  select role, full_name into v_role, v_full_name
  from invited_users
  where lower(email) = lower(new.email)
    and revoked_at is null
  limit 1;

  if v_role is not null then
    new.role := v_role;
    if v_full_name is not null and (new.full_name is null or new.full_name = '') then
      new.full_name := v_full_name;
    end if;
    update invited_users
      set accepted_at = now()
      where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_role_from_invitation on profiles;
create trigger trg_assign_role_from_invitation
  before insert on profiles
  for each row execute function assign_role_from_invitation();

-- RLS: solo admins pueden leer/escribir invited_users
alter table invited_users enable row level security;

drop policy if exists "admin_manage_invitations" on invited_users;
create policy "admin_manage_invitations"
  on invited_users for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ============================================================
-- 2. API KEYS PARA INTEGRACIONES EXTERNAS (COBRANZAS)
-- ============================================================

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,        -- SHA-256 del key plaintext, NUNCA guardar plaintext
  key_prefix text not null,             -- primeros 12 chars del key, para identificar visualmente
  scopes text[] not null default array['read'],
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  notes text
);

create index if not exists idx_api_keys_hash on api_keys(key_hash);
create index if not exists idx_api_keys_revoked on api_keys(revoked_at) where revoked_at is null;

alter table api_keys enable row level security;

drop policy if exists "admin_manage_api_keys" on api_keys;
create policy "admin_manage_api_keys"
  on api_keys for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ============================================================
-- 3. LOG DE USO DE LA API
-- ============================================================

create table if not exists api_usage_log (
  id bigserial primary key,
  api_key_id uuid references api_keys(id) on delete cascade,
  endpoint text not null,
  method text not null default 'GET',
  status_code int not null,
  response_time_ms int,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_api_usage_key_date on api_usage_log(api_key_id, created_at desc);
create index if not exists idx_api_usage_date on api_usage_log(created_at desc);

alter table api_usage_log enable row level security;

drop policy if exists "admin_read_api_usage" on api_usage_log;
create policy "admin_read_api_usage"
  on api_usage_log for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "service_insert_api_usage" on api_usage_log;
create policy "service_insert_api_usage"
  on api_usage_log for insert
  with check (true);  -- el service_role bypasea RLS de todos modos


-- ============================================================
-- 4. PRIMERA INVITACIÓN: HACETE ADMIN A VOS MISMA
-- ============================================================
-- Ejecutar UNA VEZ después de crear tu propio user en Supabase Auth:
--
--   1. En Supabase → Authentication → Users → "Invite user" → ponete tu email
--   2. Click en el magic link, entrá a la app
--   3. Ejecutá esta sentencia en SQL Editor:
--
--      update profiles
--      set role = 'admin'
--      where email = 'nicole.sigmaringo@vemo.com.mx';
--
--      insert into invited_users (email, role, full_name, accepted_at)
--      values ('nicole.sigmaringo@vemo.com.mx', 'admin', 'Nicole Sigmaringo', now())
--      on conflict (email) do nothing;
--
-- ============================================================
-- FIN DEL ADDENDUM
-- ============================================================
