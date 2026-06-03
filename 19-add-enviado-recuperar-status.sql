-- ============================================================
-- Migración 19: nuevo estado de negociación "Enviado a Recuperar"
-- ============================================================
-- Ejecutar en Supabase → SQL Editor.
-- Postgres no permite eliminar valores de un enum, sólo agregar.
-- Idempotente gracias a IF NOT EXISTS / duplicate_object.
-- ============================================================

do $$ begin
  alter type public.call_status add value if not exists 'enviado_recuperar';
exception
  when duplicate_object then null;
end $$;
