import { redirect } from "next/navigation";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

import { InvitarUsuariosForm } from "./invitar-form";

export default async function InvitarPage() {
  let callerRole: UserRole = "admin";

  if (!isDevAuthBypass()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    callerRole = (profile?.role as UserRole | undefined) ?? "agente";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invitar usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Se guarda el registro en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            invited_users
          </code>{" "}
          y Supabase envía el correo de invitación. El invitado define su
          contraseña y entra con correo + contraseña.
        </p>
        {isDevAuthBypass() ? (
          <p className="mt-2 text-sm text-amber-800">
            En modo bypass, <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/invite</code>{" "}
            sigue exigiendo sesión real: las invitaciones fallarán hasta que desactives el bypass y
            entres con una cuenta.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Requiere migración{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              04-supabase-schema-addendum.sql
            </code>
            , variable{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_APP_URL
            </code>{" "}
            y en Supabase → Authentication → URL configuration:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              …/auth/callback
            </code>{" "}
            y{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              …/auth/callback/set-password
            </code>
            .
          </p>
        )}
      </div>
      <InvitarUsuariosForm callerRole={callerRole} />
    </div>
  );
}
