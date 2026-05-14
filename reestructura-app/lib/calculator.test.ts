import { describe, expect, it } from "vitest";

import { calculate } from "./calculator";
import { RULES } from "./constants";

describe("calculate", () => {
  const base = {
    adeudo: 50_000,
    semana: 2_000,
    plazo_remanente: 100,
    pago_en_dia: false,
    monto_pago_dia: 0,
  };

  it("computes saldo vencido and total adeudo", () => {
    const r = calculate(base, 0);
    expect(r.saldoVencido).toBe(50_000);
    expect(r.saldoActual).toBe(50_000);
    expect(r.semanalidadActual).toBe(2_000);
    expect(r.semanalidadSiguiente).toBe(2_000);
    expect(r.totalAdeudo).toBe(52_000);
    expect(r.saldoAReestructurar).toBe(52_000);
  });

  it("subtracts monto_pago_dia when pago_en_dia", () => {
    const r = calculate({ ...base, pago_en_dia: true, monto_pago_dia: 5_000 }, 0);
    expect(r.saldoVencido).toBe(45_000);
    expect(r.saldoAReestructurar).toBe(47_000);
    expect(r.totalAdeudo).toBe(47_000);
  });

  it("uses semana_siguiente when provided", () => {
    const r = calculate({ ...base, semana_siguiente: 3_500 }, 0);
    expect(r.semanalidadSiguiente).toBe(3_500);
    expect(r.totalAdeudo).toBe(53_500);
    expect(r.saldoAReestructurar).toBe(53_500);
  });

  it("pago total sums semanalidad actual and pago de intención", () => {
    const r = calculate(base, 10_000);
    expect(r.totalPagarHoy).toBe(r.semanalidadActual + r.pagoIntencion);
  });

  it("matches reference example for single payment and caps", () => {
    const r = calculate(
      {
        adeudo: 15_000,
        semana: 5_000,
        plazo_remanente: 100,
        pago_en_dia: false,
        monto_pago_dia: 0,
      },
      10_000
    );

    expect(r.saldoVencido).toBe(15_000);
    expect(r.semanalidadActual).toBe(5_000);
    expect(r.semanalidadSiguiente).toBe(5_000);
    expect(r.totalAdeudo).toBe(20_000);
    expect(r.saldoAReestructurar).toBe(20_000);
    expect(r.pagoIntencionMax).toBe(10_000);
    expect(r.totalPagarHoy).toBe(15_000);
    expect(r.isValid).toBe(true);
  });

  it("condonacion equals pagoIntencion and remanente reflects double deduction", () => {
    const pi = 10_000;
    const r = calculate(base, pi);
    expect(r.condonacion).toBe(pi);
    expect(r.remanente).toBe(r.saldoAReestructurar - 2 * pi);
  });

  it("caps CSC at 200 and sends excess to balloon", () => {
    const r = calculate(
      {
        adeudo: 40_000,
        semana: 5_000,
        plazo_remanente: 100,
        pago_en_dia: false,
        monto_pago_dia: 0,
      },
      0
    );

    expect(r.remanente).toBe(45_000);
    expect(r.cscTeorico).toBe(450);
    expect(r.cscAplicado).toBe(RULES.TOPE_INCREMENTAL_RENTA);
    expect(r.balloon).toBeCloseTo(25_000, 5);
    expect(r.nuevaSemanalidad).toBe(5_000 + RULES.TOPE_INCREMENTAL_RENTA);
  });

  it("balloon example after condonación", () => {
    const r = calculate(
      {
        adeudo: 45_000,
        semana: 5_000,
        plazo_remanente: 100,
        pago_en_dia: false,
        monto_pago_dia: 0,
      },
      5_000
    );

    expect(r.remanente).toBe(40_000);
    expect(r.cscTeorico).toBe(400);
    expect(r.cscAplicado).toBe(200);
    expect(r.balloon).toBeCloseTo(20_000, 5);
  });

  it("flags isValid within min/max", () => {
    const rMin = calculate(base, RULES.PAGO_INTENCION_MIN);
    expect(rMin.isValid).toBe(true);
    const max = rMin.pagoIntencionMax;
    const rMax = calculate(base, max);
    expect(rMax.isValid).toBe(true);
    expect(calculate(base, max + 1).isAboveMax).toBe(true);
    expect(calculate(base, 100).isBelowMin).toBe(true);
  });

  it("applies bono pronto pago to nueva semanalidad when flag set", () => {
    const r = calculate(base, 10_000, { bonoProntoPago: true });
    expect(r.bonoProntoPagoMonto).toBe(RULES.BONO_PRONTO_PAGO);
    expect(r.nuevaSemanalidadConBono).toBe(r.nuevaSemanalidad - RULES.BONO_PRONTO_PAGO);
    const off = calculate(base, 10_000, { bonoProntoPago: false });
    expect(off.bonoProntoPagoMonto).toBe(0);
    expect(off.nuevaSemanalidadConBono).toBe(off.nuevaSemanalidad);
  });

  it("nueva semanalidad con bono never goes below zero", () => {
    const tiny = { ...base, semana: 100 };
    const r = calculate(tiny, RULES.PAGO_INTENCION_MIN, { bonoProntoPago: true });
    expect(r.nuevaSemanalidadConBono).toBeGreaterThanOrEqual(0);
  });
});
