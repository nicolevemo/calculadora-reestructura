-- ============================================================
-- Reset datos de shortlist / clientes (demo → go-live)
-- ============================================================
-- Ejecutar en Supabase → SQL Editor ANTES de la primera carga real.
--
-- BORRA:
--   - actividad_log (historial de llamadas)
--   - negociaciones (estados, asignaciones, exportaciones)
--   - clientes (filas del CSV)
--   - shortlist_uploads (registro de cada carga CSV)
--
-- NO BORRA:
--   - profiles, invited_users, auth.users
--   - api_keys, api_usage_log
-- ============================================================

begin;

-- Conteos previos (solo informativo en el resultado del editor)
do $$
declare
  n_uploads int;
  n_clientes int;
  n_neg int;
  n_log int;
begin
  select count(*) into n_uploads from public.shortlist_uploads;
  select count(*) into n_clientes from public.clientes;
  select count(*) into n_neg from public.negociaciones;
  select count(*) into n_log from public.actividad_log;
  raise notice 'Antes del reset: uploads=%, clientes=%, negociaciones=%, actividad_log=%',
    n_uploads, n_clientes, n_neg, n_log;
end $$;

delete from public.actividad_log;
delete from public.negociaciones;
delete from public.clientes;
delete from public.shortlist_uploads;

-- Reinicia el serial del log (opcional, deja IDs desde 1 en la nueva operación)
alter sequence if exists public.actividad_log_id_seq restart with 1;

commit;

-- Verificación
select
  (select count(*) from public.shortlist_uploads) as uploads,
  (select count(*) from public.clientes) as clientes,
  (select count(*) from public.negociaciones) as negociaciones,
  (select count(*) from public.actividad_log) as actividad_log;
