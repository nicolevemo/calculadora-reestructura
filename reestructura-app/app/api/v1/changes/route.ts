import { NextResponse } from "next/server";

import { parseSinceQuery } from "@/lib/api/v1/clientes";
import { getIntegrationReadClient, jsonError } from "@/lib/api/v1/server";
import { STATUS_ORDER } from "@/lib/constants";
import type { ApiV1Change } from "@/lib/api/v1/types";
import type { CallStatus } from "@/lib/types";

function isCallStatus(value: string | null | undefined): value is CallStatus {
  return !!value && (STATUS_ORDER as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const parsedSince = parseSinceQuery(new URL(request.url).searchParams);
  if (!parsedSince.ok) {
    return jsonError(parsedSince.error, 400);
  }
  const since = parsedSince.since;

  const supabase = getIntegrationReadClient();
  if ("error" in supabase) {
    return jsonError(supabase.error, 500);
  }

  const { data, error } = await supabase
    .from("actividad_log")
    .select(
      "accion, estado_anterior, estado_nuevo, payload, created_at, cliente:clientes(af)"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) {
    return jsonError(error.message, 500);
  }

  const changes: ApiV1Change[] = (data ?? []).map((row) => {
    const cliente = row.cliente as { af?: string } | { af?: string }[] | null;
    const af = Array.isArray(cliente) ? cliente[0]?.af ?? null : cliente?.af ?? null;

    return {
      af,
      accion: String(row.accion),
      estado_anterior: isCallStatus(row.estado_anterior as string)
        ? (row.estado_anterior as CallStatus)
        : null,
      estado_nuevo: isCallStatus(row.estado_nuevo as string)
        ? (row.estado_nuevo as CallStatus)
        : null,
      payload: (row.payload as Record<string, unknown> | null) ?? null,
      timestamp: String(row.created_at),
    };
  });

  return NextResponse.json({ changes });
}
