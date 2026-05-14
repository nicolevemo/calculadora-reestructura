import { describe, expect, it } from "vitest";

import {
  dashboardRowToApiCliente,
  dashboardRowToApiNegociacion,
  parseClientesListQuery,
  parseSinceQuery,
} from "@/lib/api/v1/clientes";
import type { ClienteDashboardRow } from "@/lib/types";

const baseRow: ClienteDashboardRow = {
  id: "11111111-1111-1111-1111-111111111111",
  upload_id: null,
  af: "4573",
  nombre: "Marcela Camara",
  telefono: "5512345678",
  vehiculo: "Tesla",
  plataforma: "Uber",
  bucket: null,
  plazo_remanente: 32,
  adeudo: 37000,
  semana: 4000,
  semana_siguiente: 4000,
  originacion_vehiculo: "used",
  pago_en_dia: false,
  monto_pago_dia: 0,
  api_uber: true,
  api_didi: false,
  ingresos_api: 12000,
  viajes_api: 45,
  created_at: "2026-05-14T12:00:00.000Z",
  negociacion_id: "22222222-2222-2222-2222-222222222222",
  status: "aceptado",
  intentos: 1,
  pago_intencion: 8000,
  fecha_compromiso: "2026-05-20",
  motivo_rechazo: null,
  notes: null,
  pdf_enviado_at: null,
  assigned_to: null,
  last_activity_at: "2026-05-14T12:00:00.000Z",
  assigned_to_name: null,
  upload_week_of: null,
  upload_filename: "shortlist.csv",
  exported_at: null,
  exported_by: null,
  bono_pronto_pago: true,
};

describe("parseClientesListQuery", () => {
  it("aplica defaults de paginación", () => {
    const parsed = parseClientesListQuery(new URLSearchParams());
    expect(parsed).toEqual({
      status: null,
      since: null,
      limit: 50,
      offset: 0,
    });
  });

  it("rechaza status inválido", () => {
    expect(parseClientesListQuery(new URLSearchParams("status=foo"))).toMatch(/status/);
  });
});

describe("parseSinceQuery", () => {
  it("exige since válido", () => {
    expect(parseSinceQuery(new URLSearchParams()).ok).toBe(false);
    expect(parseSinceQuery(new URLSearchParams("since=2026-05-14T00:00:00.000Z"))).toEqual({
      ok: true,
      since: "2026-05-14T00:00:00.000Z",
    });
  });
});

describe("dashboardRowToApiCliente", () => {
  it("incluye cálculo y negociación en el payload", () => {
    const payload = dashboardRowToApiCliente(baseRow);
    expect(payload.af).toBe("4573");
    expect(payload.calculo.saldo_a_regularizar).toBe(41000);
    expect(payload.calculo.condonacion).toBe(8000);
    expect(payload.calculo.csc_aplicado).toBe(200);
    expect(payload.bono_pronto_pago).toBe(true);
  });
});

describe("dashboardRowToApiNegociacion", () => {
  it("expone solo la parte de negociación", () => {
    const payload = dashboardRowToApiNegociacion(baseRow);
    expect(payload).toMatchObject({
      af: "4573",
      status: "aceptado",
      pago_intencion: 8000,
    });
    expect("calculo" in payload).toBe(false);
  });
});
