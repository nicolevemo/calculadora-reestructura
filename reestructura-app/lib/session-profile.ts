import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { UserRole } from "@/lib/types";

export async function syncProfileRoleFromInvitation(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.rpc("sync_my_role_from_invitation");
  if (!error) return;

  const code = (error as { code?: string }).code;
  if (code === "42883" || code === "PGRST202") {
    return;
  }
}

export async function getSessionProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ fullName: string; role: UserRole }> {
  await syncProfileRoleFromInvitation(supabase);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name?.trim() || user.email || "Usuario";
  const role = (profile?.role as UserRole | undefined) ?? "agente";

  return { fullName, role };
}
