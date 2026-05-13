-- ============================================================
-- ADDENDUM: Bono pronto pago (marcación en detalle de cliente)
-- ============================================================
-- Correr en Supabase SQL Editor después de 02 y 05 (si aplica).
-- Idempotente: agrega columna y recrea la vista con la nueva
-- columna al **final** del SELECT.
-- ============================================================

alter table negociaciones
  add column if not exists bono_pronto_pago boolean not null default false;

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
