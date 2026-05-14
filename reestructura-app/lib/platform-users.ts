import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { UserRole } from "@/lib/types";

export type PlatformUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type InvitationRow = {
  email: string;
  role: UserRole;
  full_name: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function deriveFullName(profileName: string | null | undefined, authUser: User): string {
  const trimmed = profileName?.trim();
  if (trimmed) return trimmed;

  const meta = authUser.user_metadata?.full_name;
  if (typeof meta === "string" && meta.trim()) return meta.trim();

  const email = authUser.email;
  if (email) return email.split("@")[0] ?? "";

  return "";
}

async function listAuthUsers(admin: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function loadProfilesById(admin: SupabaseClient, authUsers: User[]) {
  const profileById = new Map<string, ProfileRow>();
  const ids = authUsers.map((user) => user.id);
  if (ids.length === 0) return profileById;

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .in("id", ids);

  if (error) throw error;

  for (const row of data ?? []) {
    profileById.set(String(row.id), row as ProfileRow);
  }

  return profileById;
}

async function loadInvitationsByEmail(admin: SupabaseClient, authUsers: User[]) {
  const inviteByEmail = new Map<string, InvitationRow>();
  const emails = Array.from(
    new Set(authUsers.map((user) => normalizeEmail(user.email)).filter(Boolean))
  );
  if (emails.length === 0) return inviteByEmail;

  const { data, error } = await admin
    .from("invited_users")
    .select("email, role, full_name")
    .in("email", emails);

  if (error) {
    if (error.code === "42P01" || error.message.includes("invited_users")) {
      return inviteByEmail;
    }
    throw error;
  }

  for (const row of data ?? []) {
    inviteByEmail.set(normalizeEmail(String(row.email)), row as InvitationRow);
  }

  return inviteByEmail;
}

export async function listPlatformUsers(admin: SupabaseClient): Promise<PlatformUser[]> {
  const authUsers = await listAuthUsers(admin);
  const profileById = await loadProfilesById(admin, authUsers);
  const inviteByEmail = await loadInvitationsByEmail(admin, authUsers);

  const missingProfiles: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  }[] = [];
  const users: PlatformUser[] = [];

  for (const authUser of authUsers) {
    const profile = profileById.get(authUser.id);
    const email = authUser.email?.trim() || normalizeEmail(authUser.email);
    const invite = inviteByEmail.get(normalizeEmail(email));
    const fullName = deriveFullName(profile?.full_name, authUser) || invite?.full_name?.trim() || "";
    const role = (profile?.role ?? invite?.role ?? "agente") as UserRole;
    const createdAt = profile?.created_at ?? authUser.created_at ?? new Date().toISOString();
    const updatedAt = profile?.updated_at ?? createdAt;

    if (!profile) {
      missingProfiles.push({
        id: authUser.id,
        email,
        full_name: fullName,
        role,
      });
    }

    users.push({
      id: authUser.id,
      email,
      full_name: fullName || null,
      role,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  if (missingProfiles.length > 0) {
    const { error } = await admin.from("profiles").upsert(missingProfiles, { onConflict: "id" });
    if (error) throw error;
  }

  users.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return users;
}

export async function updatePlatformUserRole(
  admin: SupabaseClient,
  userId: string,
  role: UserRole
): Promise<PlatformUser> {
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) throw authError;
  if (!authData.user) {
    throw new Error("Usuario no encontrado");
  }

  const authUser = authData.user;
  const email = authUser.email?.trim() || normalizeEmail(authUser.email);
  const inviteByEmail = await loadInvitationsByEmail(admin, [authUser]);
  const invite = inviteByEmail.get(normalizeEmail(email));
  const fullName = deriveFullName(undefined, authUser) || invite?.full_name?.trim() || "";

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
      },
      { onConflict: "id" }
    )
    .select("id, email, full_name, role, created_at, updated_at")
    .single();

  if (updateError) throw updateError;

  if (email) {
    await admin.from("invited_users").update({ role }).eq("email", normalizeEmail(email));
  }

  return {
    id: String(updated.id),
    email: String(updated.email),
    full_name: updated.full_name?.trim() || null,
    role: updated.role as UserRole,
    created_at: String(updated.created_at),
    updated_at: String(updated.updated_at),
  };
}
