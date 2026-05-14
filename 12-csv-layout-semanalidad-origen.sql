-- ============================================================
-- CSV layout: semanalidad siguiente + originación new/used
-- ============================================================
-- Correr en Supabase SQL Editor después de 02–11.
-- Idempotente.
-- ============================================================

alter table public.clientes
  add column if not exists semana_siguiente numeric(12,2),
  add column if not exists originacion_vehiculo text;

update public.clientes
set semana_siguiente = semana
where semana_siguiente is null;

alter table public.clientes
  alter column semana_siguiente set not null;

alter table public.clientes
  drop constraint if exists clientes_originacion_vehiculo_check;

alter table public.clientes
  add constraint clientes_originacion_vehiculo_check
  check (
    originacion_vehiculo is null
    or lower(originacion_vehiculo) in ('new', 'used')
  );

drop view if exists public.v_clientes_dashboard;

create view public.v_clientes_dashboard as
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
  c.semana_siguiente,
  c.originacion_vehiculo,
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
from public.clientes c
left join public.negociaciones n on n.cliente_id = c.id
left join public.profiles p       on p.id = n.assigned_to
left join public.shortlist_uploads u on u.id = c.upload_id;
