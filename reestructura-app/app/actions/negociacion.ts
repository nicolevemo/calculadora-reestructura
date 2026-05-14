"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { calculate } from "@/lib/calculator";
import { isClienteExportado } from "@/lib/cliente-export";
import { RULES } from "@/lib/constants";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";
import type { CalculatorClientInput, CallStatus } from "@/lib/types";

const CALL_STATUSES: [CallStatus, ...CallStatus[]] = [
  "listo_contactar",
  "sin_respuesta",
  "en_negociacion",
  "aceptado",
  "rechazado",
  "necesita_revision",
];

const saveNegociacionSchema = z.object({
  clienteId: z.string().uuid(),
  negociacionId: z.string().uuid(),
  status: z.enum(CALL_STATUSES),
  pago_intencion: z.number().finite().nullable(),
  fecha_compromiso: z.string().nullable(),
  motivo_rechazo: z.string().max(4000).nullable(),
  notes: z.string().max(8000).nullable(),
  bono_pronto_pago: z.coerce.boolean(),
});

export type SaveNegociacionInput = z.infer<typeof saveNegociacionSchema>;

function toClientInput(row: {
  adeudo: unknown;
  semana: unknown;
  semana_siguiente?: unknown;
  plazo_remanente: unknown;
  pago_en_dia: unknown;
  monto_pago_dia: unknown;
}): CalculatorClientInput {
  const semanaSiguiente = Number(row.semana_siguiente);
  return {
    adeudo: Number(row.adeudo),
    semana: Number(row.semana),
    semana_siguiente:
      Number.isFinite(semanaSiguiente) && semanaSiguiente >= 0 ? semanaSiguiente : undefined,
    plazo_remanente: Number(row.plazo_remanente),
    pago_en_dia: Boolean(row.pago_en_dia),
    monto_pago_dia: Number(row.monto_pago_dia ?? 0),
  };
}

export async function saveNegociacion(
  raw: SaveNegociacionInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const parsed = saveNegociacionSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Datos inválidos" };
    }
    const input = parsed.data;

    const supabase = createClient();

    /**
     * `negociaciones.last_activity_by` y `actividad_log.agente_id` referencian `profiles(id)`.
     * Si el usuario existe en Auth pero aún no tiene fila en `profiles`, guardar su UUID rompe el FK.
     */
    let lastActivityBy: string | null = null;
    if (!isDevAuthBypass() || !isDevServerDataOverride()) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { ok: false, error: "No autenticado" };
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      lastActivityBy = profile?.id ?? null;
    }

    const { data: cliente, error: ce } = await supabase
      .from("clientes")
      .select("id, adeudo, semana, semana_siguiente, plazo_remanente, pago_en_dia, monto_pago_dia")
      .eq("id", input.clienteId)
      .single();

    if (ce || !cliente) {
      return { ok: false, error: "Cliente no encontrado" };
    }

    const { data: existing, error: ne } = await supabase
      .from("negociaciones")
      .select("id, status, intentos, cliente_id, exported_at")
      .eq("id", input.negociacionId)
      .single();

    if (ne || !existing || existing.cliente_id !== input.clienteId) {
      return { ok: false, error: "Negociación no encontrada" };
    }

    if (isClienteExportado(existing.exported_at as string | null)) {
      return {
        ok: false,
        error: "Este cliente ya fue exportado a cartera y no admite cambios.",
      };
    }

    const ci = toClientInput(cliente);

    const pi =
      input.pago_intencion != null && Number.isFinite(input.pago_intencion) && input.pago_intencion > 0
        ? input.pago_intencion
        : null;

    if (pi != null) {
      const calc = calculate(ci, pi);
      if (!calc.isValid) {
        return {
          ok: false,
          error:
            "El pago de intención debe estar entre el mínimo ($5.000) y el 50% del saldo total.",
        };
      }
    }

    const needsDeal = input.status === "aceptado" || input.status === "en_negociacion";
    if (needsDeal) {
      if (!input.fecha_compromiso?.trim()) {
        return {
          ok: false,
          error: "La fecha de compromiso es obligatoria para Aceptado o En negociación.",
        };
      }
      if (pi == null) {
        return { ok: false, error: "Indicá el pago de intención acordado." };
      }
    }

    if (input.status === "rechazado" && !input.motivo_rechazo?.trim()) {
      return { ok: false, error: "Completá el motivo de rechazo." };
    }

    let intentos = Math.min(
      RULES.MAX_INTENTOS,
      Math.max(0, Math.floor(Number(existing.intentos ?? 0)))
    );
    if (input.status === "sin_respuesta" && existing.status !== "sin_respuesta") {
      intentos = Math.min(RULES.MAX_INTENTOS, intentos + 1);
    }

    const { error: up } = await supabase
      .from("negociaciones")
      .update({
        status: input.status,
        intentos,
        pago_intencion: pi,
        fecha_compromiso: input.fecha_compromiso?.trim() || null,
        motivo_rechazo: input.motivo_rechazo?.trim() || null,
        notes: input.notes?.trim() || null,
        bono_pronto_pago: input.bono_pronto_pago,
        last_activity_by: lastActivityBy,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", input.negociacionId);

    if (up) return { ok: false, error: up.message };

    revalidatePath(`/cliente/${input.clienteId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado al guardar";
    console.error("[saveNegociacion]", e);
    return { ok: false, error: msg };
  }
}
