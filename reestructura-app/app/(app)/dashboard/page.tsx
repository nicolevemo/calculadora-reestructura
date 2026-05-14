import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardClients } from "@/components/dashboard-clients";
import { listAssignableAgents } from "@/lib/assignable-agents";
import {
  DEV_AUTH_MOCK,
  isDevAuthBypass,
  isDevServerDataOverride,
} from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";
import type { ClienteDashboardRow, UserRole } from "@/lib/types";

/** `*` evita romper si aún no corriste la migración con `exported_at` / `exported_by` en la vista. */
const DASHBOARD_SELECT = "*";

export default async function DashboardPage() {
  const supabase = createClient();
  let fullName = "";
  let role: UserRole = "agente";
  let currentUserId: string | null = null;

  if (isDevAuthBypass()) {
    fullName = DEV_AUTH_MOCK.fullName;
    role = DEV_AUTH_MOCK.role;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    currentUserId = user.id;
    const sessionProfile = await getSessionProfile(supabase, user);
    fullName = sessionProfile.fullName;
    role = sessionProfile.role;
  }

  const canAssign = role === "gestor" || role === "admin";

  const canRead = !isDevAuthBypass() || isDevServerDataOverride();
  let rows: ClienteDashboardRow[] = [];
  let loadError: string | null = null;
  let assignableAgents: Awaited<ReturnType<typeof listAssignableAgents>> = [];

  if (canRead) {
    const { data, error } = await supabase
      .from("v_clientes_dashboard")
      .select(DASHBOARD_SELECT)
      .order("created_at", { ascending: false });

    if (error) loadError = error.message;
    else rows = (data ?? []) as ClienteDashboardRow[];

    try {
      assignableAgents = await listAssignableAgents(supabase);
    } catch (e) {
      console.error("[dashboard] assignable agents", e);
    }
  }

  const greeting = (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Hola <span className="font-medium text-foreground">{fullName}</span>
        {", "}
        rol:{" "}
        <span className="font-medium capitalize text-foreground">{role}</span>
      </p>
      {!canRead && isDevAuthBypass() ? (
        <p className="text-sm text-amber-800">
          Para listar clientes sin sesión, agregá{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> junto con el
          bypass (solo local).
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-sm text-destructive">Error al cargar la vista: {loadError}</p>
      ) : null}
      {canRead && !loadError && rows.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p className="font-medium">No hay clientes en la vista</p>
          <p className="mt-1 text-amber-900/90">
            Si acabás de cargar un CSV, probá <strong>actualizar la página (F5)</strong>. Con modo bypass
            local, confirmá que tenés{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            en <code className="rounded bg-white/80 px-1 py-0.5 text-xs">.env.local</code> (el mismo
            servidor que inserta los datos tiene que poder leerlos).
          </p>
          {(role === "gestor" || role === "admin") && (
            <p className="mt-2">
              ¿Todavía no subiste el shortlist?{" "}
              <Link
                href="/gestor/cargar"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Ir a Cargar CSV
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}
      <DashboardClients
        greeting={greeting}
        rows={canRead ? rows : []}
        showGestorHint={false}
        canExportCsv={role === "gestor" || role === "admin"}
        assignableAgents={assignableAgents}
        canAssign={canAssign}
        currentUserId={currentUserId}
      />
    </div>
  );
}
