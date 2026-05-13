import { NextResponse } from "next/server";

/**
 * El PDF se genera en el cliente desde la ficha del cliente (`ClienteCommsPanel`) para descarga local.
 * Este endpoint queda reservado por si más adelante se sirve PDF desde Storage (Sprint 4+).
 */
export async function GET(
  _request: Request,
  { params }: { params: { clienteId: string } }
) {
  return NextResponse.json(
    {
      message:
        "El PDF se descarga desde la página del cliente con el botón «Descargar PDF (local)». No se genera en este endpoint.",
      clienteId: params.clienteId,
    },
    { status: 404 }
  );
}
