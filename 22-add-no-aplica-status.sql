-- Migracion 22: nuevo estado de negociacion "no_aplica" (No aplica)
-- Ejecutar en Supabase SQL Editor despues de 02-21. Idempotente.

do $$ begin
  alter type public.call_status add value if not exists 'no_aplica';
exception
  when duplicate_object then null;
end $$;
