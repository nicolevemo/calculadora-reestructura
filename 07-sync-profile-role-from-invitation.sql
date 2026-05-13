-- ============================================================
-- Sincronizar rol de profiles con invited_users (producción)
-- ============================================================
-- Correr en Supabase SQL Editor después de 04-supabase-schema-addendum.sql.
-- Arregla usuarios que quedaron con role = agente aunque fueron invitados
-- como gestor/admin (p. ej. login con Microsoft antes del trigger).
-- ============================================================

create or replace function public.sync_my_role_from_invitation()
returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_role user_role;
  v_full_name text;
  v_current_role user_role;
begin
  if v_uid is null then
    return null;
  end if;

  select email into v_email
  from public.profiles
  where id = v_uid;

  if v_email is null then
    select email into v_email
    from auth.users
    where id = v_uid;
  end if;

  if v_email is null then
    return null;
  end if;

  select role, full_name
  into v_role, v_full_name
  from public.invited_users
  where lower(email) = lower(v_email)
    and revoked_at is null
  limit 1;

  if v_role is null then
    select role into v_current_role from public.profiles where id = v_uid;
    return v_current_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  select
    u.id,
    u.email,
    coalesce(nullif(trim(v_full_name), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
    v_role
  from auth.users u
  where u.id = v_uid
  on conflict (id) do update
    set role = excluded.role,
        full_name = case
          when coalesce(public.profiles.full_name, '') = '' and excluded.full_name <> ''
            then excluded.full_name
          else public.profiles.full_name
        end,
        email = excluded.email;

  update public.invited_users
  set accepted_at = coalesce(accepted_at, now())
  where lower(email) = lower(v_email);

  return v_role;
end;
$$;

revoke all on function public.sync_my_role_from_invitation() from public;
grant execute on function public.sync_my_role_from_invitation() to authenticated;

-- Si entraste con Microsoft sin invitación previa, promové tu usuario una vez:
--   update public.profiles set role = 'admin' where email = 'tu-correo@empresa.com';
--   insert into public.invited_users (email, role, full_name, accepted_at)
--   values ('tu-correo@empresa.com', 'admin', 'Tu nombre', now())
--   on conflict (email) do update set role = excluded.role, accepted_at = coalesce(invited_users.accepted_at, now());
