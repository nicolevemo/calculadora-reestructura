-- ============================================================
-- Asignación de clientes a agentes (auditoría + permisos)
-- ============================================================
-- Correr en Supabase SQL Editor después de 02–09.
-- Idempotente.
-- ============================================================

alter table public.negociaciones
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_negociaciones_assigned_by on public.negociaciones(assigned_by);

-- Solo gestor/admin puede cambiar assigned_to (defensa en profundidad; la app también valida).
create or replace function public.protect_negociacion_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.assigned_to is distinct from old.assigned_to then
    if not exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('gestor', 'admin')
    ) then
      raise exception 'Solo gestor o admin puede cambiar la asignación del cliente';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_negociacion_assignment on public.negociaciones;
create trigger trg_protect_negociacion_assignment
  before update on public.negociaciones
  for each row execute function public.protect_negociacion_assignment();

-- Auditoría en actividad_log
create or replace function public.log_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.assigned_to is distinct from old.assigned_to then
    insert into public.actividad_log (
      cliente_id,
      agente_id,
      accion,
      estado_anterior,
      estado_nuevo,
      payload
    )
    values (
      new.cliente_id,
      new.assigned_by,
      'assignment_change',
      null,
      null,
      jsonb_build_object(
        'assigned_to_anterior', old.assigned_to,
        'assigned_to_nuevo', new.assigned_to,
        'assigned_at', new.assigned_at
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_assignment_change on public.negociaciones;
create trigger trg_log_assignment_change
  after update on public.negociaciones
  for each row execute function public.log_assignment_change();
