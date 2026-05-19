import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/session-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** DELETE /api/clientes/:id — solo admin. Elimina el cliente y todo en cascada. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { role } = await getSessionProfile(supabase, user);
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden eliminar clientes" }, { status: 403 });
  }

  const { id } = params;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("clientes").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
