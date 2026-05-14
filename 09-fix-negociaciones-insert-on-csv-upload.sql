-- ============================================================
-- Fix: CSV upload crea clientes y el trigger inserta negociaciones
-- ============================================================
-- Sin política INSERT en negociaciones (o trigger sin SECURITY DEFINER),
-- la carga CSV falla con "new row violates row-level security policy".
-- Correr en Supabase SQL Editor.
-- ============================================================

create or replace function public.create_default_negociacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.negociaciones (cliente_id, status, last_activity_at)
  values (new.id, 'listo_contactar', now())
  on conflict (cliente_id) do nothing;
  return new;
end;
$$;

drop policy if exists "gestor_insert_negociaciones" on public.negociaciones;
create policy "gestor_insert_negociaciones"
  on public.negociaciones for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('gestor', 'admin')
    )
  );
