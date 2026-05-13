import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfiguredAppOrigin } from "@/lib/request-origin";
import type { UserRole } from "@/lib/types";

const inviteBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["agente", "gestor", "admin"]),
  full_name: z.string().max(200).optional().nullable(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveAppOrigin(request: Request) {
  const fromHeader = request.headers.get("origin")?.trim();
  if (fromHeader?.startsWith("http")) return fromHeader.replace(/\/$/, "");
  return getConfiguredAppOrigin();
}

async function getCaller() {
  if (isDevAuthBypass()) {
    return {
      user: { id: "00000000-0000-0000-0000-000000000000" },
      role: "admin" as UserRole,
    };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (role !== "gestor" && role !== "admin") return null;

  return { user, role };
}

/** Listado de invitaciones (requiere `invited_users` del addendum SQL). */
export async function GET(request: Request) {
  const caller = await getCaller();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    let query = admin
      .from("invited_users")
      .select(
        "id, email, role, full_name, invited_at, accepted_at, revoked_at, invited_by"
      )
      .order("invited_at", { ascending: false });

    if (caller.role === "gestor") {
      query = query.eq("role", "agente");
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === "42P01" || error.message.includes("invited_users")) {
        return NextResponse.json(
          {
            error:
              "La tabla invited_users no existe. Ejecutá 04-supabase-schema-addendum.sql en Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Crear/actualizar fila en invited_users y enviar email de invitación (Supabase Auth). */
export async function POST(request: Request) {
  const caller = await getCaller();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = inviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, role, full_name } = parsed.data;
  const emailNorm = normalizeEmail(email);

  if (caller.role === "gestor" && role !== "agente") {
    return NextResponse.json(
      { error: "Los gestores solo pueden invitar con rol agente." },
      { status: 403 }
    );
  }

  const origin = resolveAppOrigin(request);
  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Definí NEXT_PUBLIC_APP_URL con la URL pública (https://…). Se usa para el enlace del mail de invitación.",
      },
      { status: 500 }
    );
  }

  const redirectTo = `${origin}/auth/callback/set-password`;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Config inválida";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const row = {
    email: emailNorm,
    role,
    full_name: full_name?.trim() || null,
    invited_by: isDevAuthBypass() ? null : caller.user.id,
    revoked_at: null as string | null,
  };

  const { error: upsertError } = await admin.from("invited_users").upsert(row, {
    onConflict: "email",
  });

  if (upsertError) {
    if (
      upsertError.code === "42P01" ||
      upsertError.message.includes("invited_users")
    ) {
      return NextResponse.json(
        {
          error:
            "La tabla invited_users no existe. Ejecutá 04-supabase-schema-addendum.sql en Supabase.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(emailNorm, {
      redirectTo,
      data: {
        full_name: full_name?.trim() || "",
      },
    });

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message },
      { status: inviteError.status ?? 400 }
    );
  }

  return NextResponse.json({
    success: true,
    user_id: inviteData.user?.id ?? null,
  });
}
