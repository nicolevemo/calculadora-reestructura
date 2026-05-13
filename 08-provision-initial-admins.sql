-- ============================================================
-- Provisionar admins iniciales en producción
-- ============================================================
-- Correr en Supabase SQL Editor si entraste con Microsoft y quedaste
-- con role = agente aunque en local usás bypass admin.
-- ============================================================

update public.profiles
set role = 'admin'
where lower(email) = lower('nicole.sigmaringo@vemo.com.mx');

insert into public.invited_users (email, role, full_name, accepted_at)
values ('nicole.sigmaringo@vemo.com.mx', 'admin', 'Nicole Sigmaringo', now())
on conflict (email) do update
  set role = excluded.role,
      full_name = excluded.full_name,
      accepted_at = coalesce(public.invited_users.accepted_at, excluded.accepted_at),
      revoked_at = null;
