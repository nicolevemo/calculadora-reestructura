-- ============================================================
-- Nuevo estado de negociación: cerrado
-- ============================================================
-- Ejecutar en Supabase → SQL Editor (idempotente).
-- ============================================================

do $$ begin
  alter type public.call_status add value if not exists 'cerrado';
exception
  when duplicate_object then null;
end $$;
