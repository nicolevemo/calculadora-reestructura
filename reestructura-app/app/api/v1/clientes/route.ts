import { NextResponse } from "next/server";

import {
  dashboardRowToApiCliente,
  parseClientesListQuery,
} from "@/lib/api/v1/clientes";
import { getIntegrationReadClient, jsonError } from "@/lib/api/v1/server";
import type { ClienteDashboardRow } from "@/lib/types";

export async function GET(request: Request) {
  const parsed = parseClientesListQuery(new URL(request.url).searchParams);
  if (typeof parsed === "string") {
    return jsonError(parsed, 400);
  }

  const supabase = getIntegrationReadClient();
  if ("error" in supabase) {
    return jsonError(supabase.error, 500);
  }

  let query = supabase
    .from("v_clientes_dashboard")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.since) {
    query = query.gte("last_activity_at", parsed.since);
  }

  const { data, error, count } = await query.range(
    parsed.offset,
    parsed.offset + parsed.limit - 1
  );

  if (error) {
    return jsonError(error.message, 500);
  }

  const rows = (data ?? []) as ClienteDashboardRow[];

  return NextResponse.json({
    data: rows.map((row) => dashboardRowToApiCliente(row)),
    pagination: {
      total: count ?? rows.length,
      limit: parsed.limit,
      offset: parsed.offset,
    },
  });
}
