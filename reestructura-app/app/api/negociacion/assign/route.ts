import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isClienteExportado } from "@/lib/cliente-export";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";

const assignBodySchema = z.object({
  clienteId: z.string().uuid(),
  negociacionId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
});

async function authorizeAssign(
  supabase: ReturnType<typeof createClient>
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (isDevAuthBypass()) {
    if (!isDevServerDataOverride()) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "En modo bypass local agregá SUPABASE_SERVICE_ROLE_KEY en .env.local para asignar.",
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
        { error: "Solo gestores o administradores pueden asignar clientes." },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const auth = await authorizeAssign(supabase);
  if (!auth.ok) return auth.response;

  const parsed = assignBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const input = parsed.data;

  const { data: neg, error: negError } = await supabase
    .from("negociaciones")
    .select("id, cliente_id, exported_at")
    .eq("id", input.negociacionId)
    .single();

  if (negError || !neg || neg.cliente_id !== input.clienteId) {
    return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
  }

  if (isClienteExportado(neg.exported_at as string | null)) {
    return NextResponse.json(
      { error: "Este cliente ya fue exportado y no admite cambios de asignación." },
      { status: 409 }
    );
  }

  if (input.assignedTo) {
    const { data: agent, error: agentError } = await supabase
      .from("profiles")
      .select("id, role, email")
      .eq("id", input.assignedTo)
      .maybeSingle();

    if (agentError || !agent || agent.role !== "agente") {
      return NextResponse.json({ error: "El agente seleccionado no es válido." }, { status: 400 });
    }
  }

  let assignedBy: string | null = null;
  if (!isDevAuthBypass() || !isDevServerDataOverride()) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      assignedBy = profile?.id ?? null;
    }
  }

  const { error: updateError } = await supabase
    .from("negociaciones")
    .update({
      assigned_to: input.assignedTo,
      assigned_at: input.assignedTo ? new Date().toISOString() : null,
      assigned_by: input.assignedTo ? assignedBy : null,
    })
    .eq("id", input.negociacionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/cliente/${input.clienteId}`);

  return NextResponse.json({ ok: true });
}
