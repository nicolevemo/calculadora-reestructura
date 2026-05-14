import { dashboardRowToApiNegociacion } from "@/lib/api/v1/clientes";
import { getIntegrationReadClient, jsonError } from "@/lib/api/v1/server";
import type { ClienteDashboardRow } from "@/lib/types";

export async function loadClienteByAf(af: string) {
  const supabase = getIntegrationReadClient();
  if ("error" in supabase) {
    return { error: jsonError(supabase.error, 500) };
  }

  const { data, error } = await supabase
    .from("v_clientes_dashboard")
    .select("*")
    .eq("af", af)
    .maybeSingle();

  if (error) {
    return { error: jsonError(error.message, 500) };
  }
  if (!data) {
    return { error: jsonError("Cliente no encontrado", 404) };
  }

  return { row: data as ClienteDashboardRow };
}

export async function loadNegociacionByAf(af: string) {
  const loaded = await loadClienteByAf(af);
  if ("error" in loaded && loaded.error) {
    return loaded;
  }

  return {
    data: dashboardRowToApiNegociacion(loaded.row),
  };
}
