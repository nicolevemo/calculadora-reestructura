import type { SupabaseClient } from "@supabase/supabase-js";

export type AssignableAgent = {
  id: string;
  full_name: string;
  email: string;
};

export async function listAssignableAgents(
  supabase: SupabaseClient
): Promise<AssignableAgent[]> {
  const { data: agents, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "agente")
    .order("full_name", { ascending: true });

  if (error) throw error;

  const { data: revoked, error: revokedError } = await supabase
    .from("invited_users")
    .select("email")
    .not("revoked_at", "is", null);

  const revokedEmails = new Set<string>();
  if (!revokedError) {
    for (const row of revoked ?? []) {
      revokedEmails.add(String(row.email).trim().toLowerCase());
    }
  }

  return (agents ?? [])
    .filter((row) => !revokedEmails.has(String(row.email).trim().toLowerCase()))
    .map((row) => ({
      id: String(row.id),
      full_name: String(row.full_name ?? "").trim() || String(row.email),
      email: String(row.email),
    }));
}
