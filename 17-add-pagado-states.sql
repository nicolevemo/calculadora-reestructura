-- Migración 17: nuevos estados de cierre y pago
-- Ejecutar en Supabase SQL editor

-- 1. Agregar valores al enum call_status
--    (Postgres no permite eliminar valores de enum, solo agregar)
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'pendiente_firma';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'firmado';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'aplicado';

-- 2. Nuevas columnas en negociaciones
ALTER TABLE negociaciones
  ADD COLUMN IF NOT EXISTS motivo_cierre text,
  ADD COLUMN IF NOT EXISTS fecha_pago    date;

-- 3. Actualizar la vista del dashboard para incluir los nuevos campos
--    (la vista v_clientes_dashboard suele proyectar negociaciones.*)
--    Si la vista usa SELECT *, se actualiza sola. Si es explícita, hay que recrearla.
--    Verificar con: \d v_clientes_dashboard en psql o inspeccionar en Supabase.
