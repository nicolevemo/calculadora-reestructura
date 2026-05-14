import { NextResponse } from "next/server";
import { z } from "zod";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["agente", "gestor", "admin"]),
});

async function requireAdmin() {
  if (isDevAuthBypass()) {
    return { userId: "00000000-0000-0000-0000-000000000000" as const };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { role } = await getSessionProfile(supabase, user);
  if (role !== "admin") return null;

  return { userId: user.id };
}

export async function GET() {
  const caller = await requireAdmin();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const caller = await requireAdmin();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { userId, role } = parsed.data;

  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ role: role as UserRole })
      .eq("id", userId)
      .select("id, email, full_name, role, created_at, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const email = String(existing.email ?? "").trim().toLowerCase();
    if (email) {
      await admin
        .from("invited_users")
        .update({ role: role as UserRole })
        .eq("email", email);
    }

    return NextResponse.json({ user: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
