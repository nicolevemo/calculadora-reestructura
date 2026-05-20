-- Migración 18: detección de AFs duplicados al subir CSV

-- 1. Columna en clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS is_duplicate boolean NOT NULL DEFAULT false;

-- 2. Recrear la vista (DROP + CREATE para evitar error de columnas)
DROP VIEW IF EXISTS public.v_clientes_dashboard;

CREATE VIEW public.v_clientes_dashboard AS
SELECT
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
  c.is_duplicate,

  n.id             AS negociacion_id,
  n.status,
  n.intentos,
  n.pago_intencion,
  n.fecha_compromiso,
  n.motivo_rechazo,
  n.notes,
  n.pdf_enviado_at,
  n.assigned_to,
  n.last_activity_at,
  p.full_name      AS assigned_to_name,
  u.week_of        AS upload_week_of,
  u.filename       AS upload_filename,
  n.exported_at,
  n.exported_by,
  n.bono_pronto_pago
FROM public.clientes c
LEFT JOIN public.negociaciones n  ON n.cliente_id = c.id
LEFT JOIN public.profiles p       ON p.id = n.assigned_to
LEFT JOIN public.shortlist_uploads u ON u.id = c.upload_id;
