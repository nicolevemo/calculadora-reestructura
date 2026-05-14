import { NextResponse } from "next/server";
import { z } from "zod";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { listPlatformUsers, updatePlatformUserRole } from "@/lib/platform-users";
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
    const users = await listPlatformUsers(admin);
    return NextResponse.json({ users });
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
    const user = await updatePlatformUserRole(admin, userId, role as UserRole);
    return NextResponse.json({ user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    if (message === "Usuario no encontrado") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
