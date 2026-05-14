import { NextResponse } from "next/server";

import { loadNegociacionByAf } from "@/lib/api/v1/queries";
import { jsonError } from "@/lib/api/v1/server";

type RouteContext = {
  params: { af: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const af = decodeURIComponent(params.af).trim();
  if (!af) {
    return jsonError("AF inválido", 400);
  }

  const loaded = await loadNegociacionByAf(af);
  if ("error" in loaded) {
    return loaded.error;
  }

  return NextResponse.json(loaded.data);
}
