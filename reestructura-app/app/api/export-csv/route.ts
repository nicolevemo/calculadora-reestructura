import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { STATUS_ORDER } from "@/lib/constants";
import { isClienteExportado } from "@/lib/cliente-export";
import { exportDashboardRowsToCsv } from "@/lib/export-csv";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type { CallStatus, ClienteDashboardRow } from "@/lib/types";

function isCallStatus(s: string): s is CallStatus {
  return (STATUS_ORDER as readonly string[]).includes(s);
}

type AuthExport =
  | { ok: true }
  | { ok: false; response: NextResponse };

async function authorizeGestorExport(
  supabase: ReturnType<typeof createClient>
): Promise<AuthExport> {
  if (isDevAuthBypass()) {
    if (!isDevServerDataOverride()) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "En modo bypass local agregá SUPABASE_SERVICE_ROLE_KEY en .env.local para exportar.",
          },
          { status: 403 }
        ),
      };
    }
    return { ok: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { role } = await getSessionProfile(supabase, user);

  if (role !== "gestor" && role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Solo gestores o administradores pueden exportar." },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

/** FK `exported_by` → `profiles`; null si no hay fila de perfil. */
async function resolveExportedByProfileId(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  if (isDevAuthBypass() && isDevServerDataOverride()) {
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.id ?? null;
}

const postExportSchema = z.object({
  clienteIds: z.array(z.string().uuid()).min(1).max(1000),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const uploadId = searchParams.get("upload_id");

    if (statusParam && !isCallStatus(statusParam)) {
      return NextResponse.json({ error: "Parámetro status inválido" }, { status: 400 });
    }

    const supabase = createClient();
    const auth = await authorizeGestorExport(supabase);
    if (!auth.ok) return auth.response;

    const { data, error } = await fetchAllRows<ClienteDashboardRow>((from, to) => {
      let query = supabase
        .from("v_clientes_dashboard")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusParam) {
        query = query.eq("status", statusParam);
      }
      if (uploadId?.trim()) {
        query = query.eq("upload_id", uploadId.trim());
      }

      return query.range(from, to);
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const rows = data;
    const csv = exportDashboardRowsToCsv(rows);

    const slug = statusParam ?? "todos";
    const safeSlug = slug.replace(/[^a-z0-9_-]/gi, "_");
    const filename = `reestructura-export-${safeSlug}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Exporta solo los `clienteIds` indicados, marca `negociaciones.exported_at`
 * (y `exported_by` si hay perfil) y devuelve el CSV.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const auth = await authorizeGestorExport(supabase);
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    const parsed = postExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enviá { clienteIds: string[] } con al menos un UUID." },
        { status: 400 }
      );
    }

    const { clienteIds } = parsed.data;

    const { data, error } = await supabase
      .from("v_clientes_dashboard")
      .select("*")
      .in("id", clienteIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ClienteDashboardRow[];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron clientes para los ids indicados." },
        { status: 404 }
      );
    }

    const alreadyExported = rows.filter((row) => isClienteExportado(row.exported_at));
    if (alreadyExported.length > 0) {
      return NextResponse.json(
        {
          error:
            "Uno o más clientes seleccionados ya fueron exportados y no pueden volver a exportarse.",
        },
        { status: 409 }
      );
    }

    const exportedBy = await resolveExportedByProfileId(supabase);
    const exportedAt = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("negociaciones")
      .update({
        exported_at: exportedAt,
        exported_by: exportedBy,
      })
      .in("cliente_id", rows.map((r) => r.id));

    if (upErr) {
      return NextResponse.json(
        { error: `No se pudo registrar la exportación: ${upErr.message}` },
        { status: 500 }
      );
    }

    const csv = exportDashboardRowsToCsv(rows);
    const filename = `reestructura-export-seleccion-${new Date().toISOString().slice(0, 10)}.csv`;

    revalidatePath("/dashboard");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
