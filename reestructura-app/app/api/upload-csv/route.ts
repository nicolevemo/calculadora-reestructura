import { NextResponse } from "next/server";

import {
  coerceRowsToStrings,
  uploadPayloadSchema,
  validateCsvRows,
} from "@/lib/csv";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AuthGestor =
  | { ok: true; uploadedBy: string | null }
  | { ok: false; response: NextResponse };

async function authorizeGestorUpload(
  supabase: ReturnType<typeof createClient>
): Promise<AuthGestor> {
  if (isDevAuthBypass()) {
    if (!isDevServerDataOverride()) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "En modo bypass local agregá SUPABASE_SERVICE_ROLE_KEY en .env.local para insertar datos.",
          },
          { status: 403 }
        ),
      };
    }
    return { ok: true, uploadedBy: null };
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
        { error: "Solo gestores o administradores pueden cargar CSV." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, uploadedBy: user.id };
}

function createUploadWriteClient() {
  if (isDevAuthBypass() && isDevServerDataOverride()) {
    return createClient();
  }
  return createAdminClient();
}

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = uploadPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const auth = await authorizeGestorUpload(supabase);
    if (!auth.ok) return auth.response;

    let writeClient;
    try {
      writeClient = createUploadWriteClient();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Falta SUPABASE_SERVICE_ROLE_KEY para registrar la carga.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { filename, week_of, notes, rows: rawRows } = parsed.data;
    const stringRows = coerceRowsToStrings(rawRows as Record<string, unknown>[]);
    const validated = validateCsvRows(stringRows);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Errores de validación en el CSV", details: validated.errors },
        { status: 400 }
      );
    }

    const insertRows = validated.rows;

    const { data: upload, error: upErr } = await writeClient
      .from("shortlist_uploads")
      .insert({
        filename,
        week_of: week_of ?? null,
        notes: notes?.trim() || null,
        uploaded_by: auth.uploadedBy,
        client_count: 0,
        status: "activo",
      })
      .select("id")
      .single();

    if (upErr || !upload) {
      return NextResponse.json(
        { error: upErr?.message ?? "No se pudo registrar la carga" },
        { status: 500 }
      );
    }

    const payload = insertRows.map((r) => ({
      upload_id: upload.id,
      af: r.af,
      nombre: r.nombre,
      telefono: r.telefono,
      vehiculo: r.vehiculo,
      plataforma: r.plataforma,
      originacion_vehiculo: r.originacion_vehiculo,
      plazo_remanente: r.plazo_remanente,
      adeudo: r.adeudo,
      semana: r.semana,
      semana_siguiente: r.semana_siguiente,
      ingresos_api: r.ingresos_api,
      viajes_api: r.viajes_api,
      pago_en_dia: false,
      monto_pago_dia: 0,
      bucket: null,
      origination_date: null,
      api_uber: false,
      api_didi: false,
      ci: null,
      energia_adicional: null,
    }));

    const { error: insErr } = await writeClient.from("clientes").insert(payload);

    if (insErr) {
      await writeClient.from("shortlist_uploads").delete().eq("id", upload.id);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { error: countErr } = await writeClient
      .from("shortlist_uploads")
      .update({ client_count: insertRows.length })
      .eq("id", upload.id);

    if (countErr) {
      return NextResponse.json(
        {
          ok: true,
          warning: countErr.message,
          uploadId: upload.id,
          inserted: insertRows.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      uploadId: upload.id,
      inserted: insertRows.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
