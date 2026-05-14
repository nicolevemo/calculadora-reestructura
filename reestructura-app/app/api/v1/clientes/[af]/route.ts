import { NextResponse } from "next/server";

import { dashboardRowToApiCliente } from "@/lib/api/v1/clientes";
import { loadClienteByAf } from "@/lib/api/v1/queries";
import { jsonError } from "@/lib/api/v1/server";

type RouteContext = {
  params: { af: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const af = decodeURIComponent(params.af).trim();
  if (!af) {
    return jsonError("AF inválido", 400);
  }

  const loaded = await loadClienteByAf(af);
  if ("error" in loaded) {
    return loaded.error;
  }

  return NextResponse.json(dashboardRowToApiCliente(loaded.row));
}
