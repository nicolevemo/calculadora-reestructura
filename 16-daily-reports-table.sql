-- ============================================================
-- REPORTE DIARIO — tabla de persistencia
-- Cómo usar: Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists daily_reports (
  id            uuid primary key default gen_random_uuid(),
  -- Un solo reporte por día calendario (zona America/Mexico_City)
  report_date   date not null unique,
  generated_at  timestamptz not null default now(),
  generated_by  uuid references profiles(id) on delete set null,

  -- Horario operativo configurable por el admin antes de exportar
  horario_inicio text not null default '14:00',
  horario_fin    text not null default '17:30',

  -- Campos manuales que el admin llena antes de guardar
  actividades   jsonb not null default '[]'::jsonb,  -- string[]
  next_steps    jsonb not null default '[]'::jsonb,  -- string[]

  -- Snapshot de los datos al momento de guardar
  snapshot_data jsonb not null default '{}'::jsonb,

  updated_at    timestamptz not null default now()
);

create index if not exists idx_daily_reports_date on daily_reports(report_date desc);

-- RLS: solo admin puede crear/editar; todos los autenticados pueden leer
alter table daily_reports enable row level security;

drop policy if exists "daily_reports_select" on daily_reports;
create policy "daily_reports_select"
  on daily_reports for select
  using (auth.role() = 'authenticated');

drop policy if exists "daily_reports_insert" on daily_reports;
create policy "daily_reports_insert"
  on daily_reports for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "daily_reports_update" on daily_reports;
create policy "daily_reports_update"
  on daily_reports for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger updated_at
drop trigger if exists trg_daily_reports_updated_at on daily_reports;
create trigger trg_daily_reports_updated_at
  before update on daily_reports
  for each row execute function update_updated_at_column();
