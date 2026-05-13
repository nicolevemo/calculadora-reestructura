import { RULES } from "./constants";
import type { CalculatorClientInput, CalculatorResult } from "./types";

export type CalculateOptions = {
  /** Si el cliente cumple condiciones del bono pronto pago (marcación en UI). */
  bonoProntoPago?: boolean;
};

type Balances = Pick<
  CalculatorResult,
  | "saldoVencido"
  | "saldoActual"
  | "semanalidadActual"
  | "semanalidadSiguiente"
  | "totalAdeudo"
  | "saldoAReestructurar"
>;

type PagoIntencionRange = Pick<CalculatorResult, "pagoIntencionMin" | "pagoIntencionMax">;

type PostCondonacion = Pick<CalculatorResult, "condonacion" | "remanente">;

type Schedule = Pick<
  CalculatorResult,
  "cccTeorico" | "indicativoSemanal" | "incrementoSemanal" | "balloon" | "nuevaSemanalidad"
>;

function resolveBalances(client: CalculatorClientInput): Balances {
  const saldoVencido = client.pago_en_dia
    ? client.adeudo - client.monto_pago_dia
    : client.adeudo;

  const semanalidadActual = client.semana;
  const semanalidadSiguiente = client.semana_siguiente ?? client.semana;
  const baseReestructura = saldoVencido + semanalidadSiguiente;
  const totalAdeudo = baseReestructura;
  const saldoAReestructurar = baseReestructura;

  return {
    saldoVencido,
    saldoActual: saldoVencido,
    semanalidadActual,
    semanalidadSiguiente,
    totalAdeudo,
    saldoAReestructurar,
  };
}

function resolvePagoIntencionRange(totalAdeudo: number): PagoIntencionRange {
  return {
    pagoIntencionMin: RULES.PAGO_INTENCION_MIN,
    pagoIntencionMax: totalAdeudo * RULES.PAGO_INTENCION_PCT_MAX,
  };
}

function resolvePostCondonacion(
  saldoAReestructurar: number,
  pagoIntencion: number
): PostCondonacion {
  const condonacion = pagoIntencion;
  const remanente = saldoAReestructurar - pagoIntencion - condonacion;
  return { condonacion, remanente };
}

function resolveSchedule(
  remanente: number,
  plazoRemanente: number,
  semanalidadActual: number
): Schedule {
  const cccTeorico = remanente / plazoRemanente;
  const incrementoSemanal = Math.min(RULES.TOPE_INCREMENTAL_RENTA, cccTeorico);
  const balloon = Math.max(0, (cccTeorico - incrementoSemanal) * plazoRemanente);
  const nuevaSemanalidad = semanalidadActual + incrementoSemanal;

  return {
    cccTeorico,
    indicativoSemanal: cccTeorico,
    incrementoSemanal,
    balloon,
    nuevaSemanalidad,
  };
}

function resolveBono(
  nuevaSemanalidad: number,
  options?: CalculateOptions
): Pick<CalculatorResult, "bonoProntoPagoMonto" | "nuevaSemanalidadConBono"> {
  const bonoProntoPagoMonto = options?.bonoProntoPago ? RULES.BONO_PRONTO_PAGO : 0;
  const nuevaSemanalidadConBono = Math.max(0, nuevaSemanalidad - bonoProntoPagoMonto);
  return { bonoProntoPagoMonto, nuevaSemanalidadConBono };
}

function resolveValidation(
  pagoIntencion: number,
  range: PagoIntencionRange
): Pick<CalculatorResult, "isAboveMax" | "isBelowMin" | "isValid"> {
  const isAboveMax = pagoIntencion > range.pagoIntencionMax;
  const isBelowMin = pagoIntencion > 0 && pagoIntencion < range.pagoIntencionMin;
  const isValid =
    pagoIntencion >= range.pagoIntencionMin && pagoIntencion <= range.pagoIntencionMax;
  return { isAboveMax, isBelowMin, isValid };
}

export function calculate(
  client: CalculatorClientInput,
  pagoIntencion: number,
  options?: CalculateOptions
): CalculatorResult {
  const balances = resolveBalances(client);
  const range = resolvePagoIntencionRange(balances.totalAdeudo);
  const post = resolvePostCondonacion(balances.saldoAReestructurar, pagoIntencion);
  const schedule = resolveSchedule(
    post.remanente,
    client.plazo_remanente,
    balances.semanalidadActual
  );
  const bono = resolveBono(schedule.nuevaSemanalidad, options);
  const validation = resolveValidation(pagoIntencion, range);

  return {
    ...balances,
    ...range,
    pagoIntencion,
    totalPagarHoy: balances.semanalidadActual + pagoIntencion,
    ...post,
    ...schedule,
    ...bono,
    ...validation,
  };
}
