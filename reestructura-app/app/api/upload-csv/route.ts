import { NextResponse } from "next/server";

import {
  coerceRowsToStrings,
  uploadPayloadSchema,
  validateCsvRows,
} from "@/lib/csv";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
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

    const { data: upload, error: upErr } = await supabase
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
      bucket: r.bucket,
      origination_date: r.origination_date,
      plazo_remanente: r.plazo_remanente,
      adeudo: r.adeudo,
      semana: r.semana,
      pago_en_dia: r.pago_en_dia,
      monto_pago_dia: r.monto_pago_dia,
      api_uber: r.api_uber,
      api_didi: r.api_didi,
      ingresos_api: r.ingresos_api,
      viajes_api: r.viajes_api,
      ci: r.ci,
      energia_adicional: r.energia_adicional,
    }));

    const { error: insErr } = await supabase.from("clientes").insert(payload);

    if (insErr) {
      await supabase.from("shortlist_uploads").delete().eq("id", upload.id);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { error: countErr } = await supabase
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
