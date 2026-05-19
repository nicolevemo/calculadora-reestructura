import { redirect } from "next/navigation";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";

import { ReporteDiarioForm } from "./reporte-diario-form";

export default async function ReporteDiarioPage() {
  if (!isDevAuthBypass()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { role } = await getSessionProfile(supabase, user);
    if (role !== "admin") redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reporte Diario</h1>
        <p className="text-sm text-muted-foreground">
          Genera y descarga el reporte operativo del día. Solo visible para admins.
        </p>
      </div>
      <ReporteDiarioForm />
    </div>
  );
}
