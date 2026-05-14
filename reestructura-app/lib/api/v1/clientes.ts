import { calculate } from "@/lib/calculator";
import { STATUS_ORDER } from "@/lib/constants";
import { dashboardRowToCalculatorInput } from "@/lib/export-csv";
import type { CallStatus, ClienteDashboardRow } from "@/lib/types";

import type { ApiV1Calculo, ApiV1Cliente, ApiV1Negociacion } from "./types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function isCallStatus(value: string | null | undefined): value is CallStatus {
  return !!value && (STATUS_ORDER as readonly string[]).includes(value);
}

function resolvePagoIntencion(row: ClienteDashboardRow): number {
  if (
    row.pago_intencion != null &&
    Number.isFinite(Number(row.pago_intencion)) &&
    Number(row.pago_intencion) > 0
  ) {
    return Number(row.pago_intencion);
  }
  return 0;
}

export function dashboardRowToApiCalculo(row: ClienteDashboardRow): ApiV1Calculo {
  const calc = calculate(dashboardRowToCalculatorInput(row), resolvePagoIntencion(row), {
    bonoProntoPago: Boolean(row.bono_pronto_pago),
  });

  return {
    saldo_vencido: calc.saldoVencido,
    semanalidad_actual: calc.semanalidadActual,
    semanalidad_siguiente: calc.semanalidadSiguiente,
    saldo_total: calc.totalAdeudo,
    saldo_a_regularizar: calc.saldoAReestructurar,
    total_pagar_hoy: calc.totalPagarHoy,
    condonacion: calc.condonacion,
    remanente: calc.remanente,
    csc_teorico: calc.cscTeorico,
    csc_aplicado: calc.cscAplicado,
    balloon: calc.balloon,
    nueva_semanalidad: calc.nuevaSemanalidad,
    nueva_semanalidad_con_bono: calc.nuevaSemanalidadConBono,
  };
}

export function dashboardRowToApiCliente(row: ClienteDashboardRow): ApiV1Cliente {
  return {
    id: row.id,
    negociacion_id: row.negociacion_id,
    af: row.af,
    nombre: row.nombre,
    telefono: row.telefono,
    vehiculo: row.vehiculo,
    plataforma: row.plataforma,
    bucket: row.bucket,
    originacion_vehiculo: row.originacion_vehiculo,
    adeudo: Number(row.adeudo),
    semana: Number(row.semana),
    semana_siguiente: Number(row.semana_siguiente ?? row.semana),
    plazo_remanente: Number(row.plazo_remanente),
    ingresos_api: row.ingresos_api != null ? Number(row.ingresos_api) : null,
    viajes_api: row.viajes_api != null ? Number(row.viajes_api) : null,
    upload_id: row.upload_id,
    upload_week_of: row.upload_week_of,
    upload_filename: row.upload_filename,
    created_at: row.created_at,
    status: isCallStatus(row.status) ? row.status : null,
    intentos: row.intentos != null ? Number(row.intentos) : null,
    pago_intencion: row.pago_intencion != null ? Number(row.pago_intencion) : null,
    fecha_compromiso: row.fecha_compromiso,
    motivo_rechazo: row.motivo_rechazo,
    notes: row.notes,
    bono_pronto_pago: Boolean(row.bono_pronto_pago),
    assigned_to: row.assigned_to,
    assigned_to_name: row.assigned_to_name,
    exported_at: row.exported_at,
    exported_by: row.exported_by,
    last_activity_at: row.last_activity_at,
    calculo: dashboardRowToApiCalculo(row),
  };
}

export function dashboardRowToApiNegociacion(row: ClienteDashboardRow): ApiV1Negociacion {
  return {
    af: row.af,
    cliente_id: row.id,
    negociacion_id: row.negociacion_id,
    status: isCallStatus(row.status) ? row.status : null,
    intentos: row.intentos != null ? Number(row.intentos) : null,
    pago_intencion: row.pago_intencion != null ? Number(row.pago_intencion) : null,
    fecha_compromiso: row.fecha_compromiso,
    motivo_rechazo: row.motivo_rechazo,
    notes: row.notes,
    bono_pronto_pago: Boolean(row.bono_pronto_pago),
    assigned_to: row.assigned_to,
    assigned_to_name: row.assigned_to_name,
    exported_at: row.exported_at,
    exported_by: row.exported_by,
    last_activity_at: row.last_activity_at,
  };
}

export type ClientesListQuery = {
  status: CallStatus | null;
  since: string | null;
  limit: number;
  offset: number;
};

export function parseClientesListQuery(searchParams: URLSearchParams): ClientesListQuery | string {
  const statusParam = searchParams.get("status");
  if (statusParam && !isCallStatus(statusParam)) {
    return "Parámetro status inválido";
  }

  const since = searchParams.get("since")?.trim() || null;
  if (since && Number.isNaN(Date.parse(since))) {
    return "Parámetro since debe ser un timestamp ISO válido";
  }

  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limitParsed = limitRaw == null || limitRaw === "" ? DEFAULT_LIMIT : Number(limitRaw);
  const offsetParsed = offsetRaw == null || offsetRaw === "" ? 0 : Number(offsetRaw);

  if (!Number.isInteger(limitParsed) || limitParsed < 1 || limitParsed > MAX_LIMIT) {
    return `Parámetro limit debe ser un entero entre 1 y ${MAX_LIMIT}`;
  }
  if (!Number.isInteger(offsetParsed) || offsetParsed < 0) {
    return "Parámetro offset debe ser un entero mayor o igual a 0";
  }

  return {
    status: isCallStatus(statusParam) ? statusParam : null,
    since,
    limit: limitParsed,
    offset: offsetParsed,
  };
}

export function parseSinceQuery(
  searchParams: URLSearchParams
): { ok: true; since: string } | { ok: false; error: string } {
  const since = searchParams.get("since")?.trim();
  if (!since) {
    return { ok: false, error: "Falta el parámetro since" };
  }
  if (Number.isNaN(Date.parse(since))) {
    return { ok: false, error: "Parámetro since debe ser un timestamp ISO válido" };
  }
  return { ok: true, since };
}
