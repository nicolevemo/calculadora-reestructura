import Papa from "papaparse";

import { calculate } from "@/lib/calculator";
import type { CalculatorClientInput, ClienteDashboardRow } from "@/lib/types";

export function dashboardRowToCalculatorInput(row: ClienteDashboardRow): CalculatorClientInput {
  return {
    adeudo: Number(row.adeudo),
    semana: Number(row.semana),
    plazo_remanente: Number(row.plazo_remanente),
    pago_en_dia: Boolean(row.pago_en_dia),
    monto_pago_dia: Number(row.monto_pago_dia ?? 0),
  };
}

export function dashboardRowToExportRecord(
  row: ClienteDashboardRow
): Record<string, string | number | null | boolean> {
  const ci = dashboardRowToCalculatorInput(row);
  const pi =
    row.pago_intencion != null &&
    Number.isFinite(Number(row.pago_intencion)) &&
    Number(row.pago_intencion) > 0
      ? Number(row.pago_intencion)
      : 0;
  const c = calculate(ci, pi, {
    bonoProntoPago: Boolean(row.bono_pronto_pago),
  });
  return {
    af: row.af,
    nombre: row.nombre,
    telefono: row.telefono,
    plataforma: row.plataforma,
    bucket: row.bucket,
    status: row.status ?? "",
    adeudo: row.adeudo,
    semana: row.semana,
    plazo_remanente: row.plazo_remanente,
    pago_intencion: row.pago_intencion,
    fecha_compromiso: row.fecha_compromiso,
    intentos: row.intentos,
    upload_filename: row.upload_filename,
    saldo_vencido: c.saldoVencido,
    semanalidad_actual: c.semanalidadActual,
    semanalidad_siguiente: c.semanalidadSiguiente,
    total_adeudo: c.totalAdeudo,
    saldo_a_reestructurar: c.saldoAReestructurar,
    total_pagar_hoy: c.totalPagarHoy,
    condonacion: c.condonacion,
    remanente: c.remanente,
    ccc_teorico: c.cccTeorico,
    indicativo_semanal: c.indicativoSemanal,
    incremento_semanal: c.incrementoSemanal,
    balloon: c.balloon,
    nueva_semanalidad: c.nuevaSemanalidad,
    bono_pronto_pago: Boolean(row.bono_pronto_pago),
    nueva_semanalidad_con_bono: c.nuevaSemanalidadConBono,
    exportado: row.exported_at ? "si" : "no",
    exportado_en: row.exported_at ?? "",
  };
}

export function exportDashboardRowsToCsv(rows: ClienteDashboardRow[]): string {
  const records = rows.map((r) => dashboardRowToExportRecord(r));
  return "\uFEFF" + Papa.unparse(records, { newline: "\r\n" });
}
