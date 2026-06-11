"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Campos editables = mismos que vienen del CSV (carga del Excel).
 * Solo administradores pueden modificarlos desde la vista de detalle.
 */
const updateClienteFieldsSchema = z.object({
  clienteId: z.string().uuid(),
  af: z.string().min(1, "AF requerido").max(120),
  nombre: z.string().min(1, "Nombre requerido").max(500),
  telefono: z.string().max(80).nullable(),
  vehiculo: z.string().max(200).nullable(),
  plataforma: z.string().min(1, "Plataforma requerida").max(120),
  originacion_vehiculo: z.enum(["new", "used"]).nullable(),
  plazo_remanente: z
    .number()
    .int("Plazo remanente debe ser entero")
    .positive("Plazo remanente debe ser > 0")
    .max(520),
  adeudo: z.number().finite().nonnegative("Adeudo no puede ser negativo"),
  semana: z.number().finite().nonnegative("Semana no puede ser negativa"),
  semana_siguiente: z
    .number()
    .finite()
    .nonnegative("Semana siguiente no puede ser negativa"),
  ingresos_api: z.number().finite().nullable(),
  viajes_api: z.number().int().nonnegative().nullable(),
});

export type UpdateClienteFieldsInput = z.infer<typeof updateClienteFieldsSchema>;

export async function updateClienteFields(
  raw: UpdateClienteFieldsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const parsed = updateClienteFieldsSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors
        .map((e) => `${e.path.join(".") || "campo"}: ${e.message}`)
        .join("; ");
      return { ok: false, error: `Datos inválidos. ${msg}` };
    }
    const input = parsed.data;

    const supabase = createClient();

    // Solo ADMINS (o dev bypass con override) pueden editar
    let agentId: string | null = null;
    if (isDevAuthBypass() && isDevServerDataOverride()) {
      // dev local con service role
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: "No autenticado" };

      const { role } = await getSessionProfile(supabase, user);
      if (role !== "admin") {
        return {
          ok: false,
          error: "Solo administradores pueden editar los datos del cliente.",
        };
      }
      agentId = user.id;
    }

    // Las RLS sobre clientes no permiten UPDATE — usamos el cliente service role.
    let writeClient;
    try {
      writeClient =
        isDevAuthBypass() && isDevServerDataOverride()
          ? createClient()
          : createAdminClient();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Falta SUPABASE_SERVICE_ROLE_KEY para actualizar el cliente.";
      return { ok: false, error: message };
    }

    const updatePayload = {
      af: input.af.trim(),
      nombre: input.nombre.trim(),
      telefono: input.telefono?.trim() || null,
      vehiculo: input.vehiculo?.trim() || null,
      plataforma: input.plataforma.trim(),
      originacion_vehiculo: input.originacion_vehiculo,
      plazo_remanente: input.plazo_remanente,
      adeudo: input.adeudo,
      semana: input.semana,
      semana_siguiente: input.semana_siguiente,
      ingresos_api: input.ingresos_api,
      viajes_api: input.viajes_api,
      updated_at: new Date().toISOString(),
    };

    // Verificar que el cliente exista antes de actualizar
    const { data: existing, error: ex } = await writeClient
      .from("clientes")
      .select("id")
      .eq("id", input.clienteId)
      .maybeSingle();

    if (ex) return { ok: false, error: ex.message };
    if (!existing) return { ok: false, error: "Cliente no encontrado" };

    const { error: upErr } = await writeClient
      .from("clientes")
      .update(updatePayload)
      .eq("id", input.clienteId);

    if (upErr) return { ok: false, error: upErr.message };

    // Auditoría — registramos la edición en actividad_log
    try {
      await writeClient.from("actividad_log").insert({
        cliente_id: input.clienteId,
        agente_id: agentId,
        accion: "cliente_editado",
        estado_anterior: null,
        estado_nuevo: null,
        payload: updatePayload,
      });
    } catch (e) {
      console.error("[updateClienteFields] actividad_log", e);
    }

    revalidatePath(`/cliente/${input.clienteId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado al guardar el cliente.";
    console.error("[updateClienteFields]", e);
    return { ok: false, error: msg };
  }
}
