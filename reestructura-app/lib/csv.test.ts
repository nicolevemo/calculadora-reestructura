import { describe, expect, it } from "vitest";

import {
  parseDecimal,
  parseOriginacionVehiculo,
  prepareCsvForPapa,
  validateCsvHeaders,
  validateCsvRows,
} from "./csv";

describe("parseOriginacionVehiculo", () => {
  it('acepta new/used y variantes en español', () => {
    expect(parseOriginacionVehiculo("new")).toBe("new");
    expect(parseOriginacionVehiculo("used")).toBe("used");
    expect(parseOriginacionVehiculo("nuevo")).toBe("new");
    expect(parseOriginacionVehiculo("")).toBeNull();
  });
});

describe("validateCsvHeaders", () => {
  it("exige columnas obligatorias del layout nuevo", () => {
    expect(validateCsvHeaders(["af", "nombre", "adeudo"])).toMatch(/semana/);
    expect(
      validateCsvHeaders([
        "af",
        "nombre",
        "adeudo",
        "semana",
      ])
    ).toMatch(/semana_siguiente/);
    expect(
      validateCsvHeaders([
        "af",
        "nombre",
        "adeudo",
        "semana",
        "semana_siguiente",
        "plazo_remanente",
        "plataforma",
      ])
    ).toBeNull();
  });
});

describe("parseDecimal", () => {
  it("interpreta punto como separador de miles (Excel ES)", () => {
    expect(parseDecimal("44.809", "adeudo")).toBe(44809);
    expect(parseDecimal("6.867", "semana")).toBe(6867);
  });
});

describe("prepareCsvForPapa", () => {
  it("salta filas vacías iniciales y detecta ;", () => {
    const raw =
      ";;;;;;;\nAF;Nombre;Saldo vencido;Semanalidad actual;Semanalidad siguiente;Plazo;Plataforma\nAF1;Juan;1000;200;220;48;Uber\n";
    const { text, delimiter } = prepareCsvForPapa(raw);
    expect(delimiter).toBe(";");
    expect(text.startsWith("AF;Nombre")).toBe(true);
  });
});

describe("validateCsvRows", () => {
  it("valida una fila mínima", () => {
    const res = validateCsvRows([
      {
        af: "AF1",
        nombre: "Juan",
        adeudo: "10000",
        semana: "1200",
        semana_siguiente: "1300",
        plazo_remanente: "48",
        plataforma: "Uber",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0].adeudo).toBe(10000);
      expect(res.rows[0].semana_siguiente).toBe(1300);
    }
  });

  it("acepta fila estilo Excel con miles con punto y columnas opcionales", () => {
    const res = validateCsvRows([
      {
        af: "5730AF",
        nombre: "MATA MARTINEZ",
        telefono: "5581678708",
        adeudo: "44.809",
        plazo_remanente: "178",
        semana: "6.867",
        semana_siguiente: "6.867",
        plataforma: "Uber",
        ingresos_api: "7.800",
        viajes_api: "67",
        originacion_vehiculo: "used",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0].adeudo).toBe(44809);
      expect(res.rows[0].semana).toBe(6867);
      expect(res.rows[0].ingresos_api).toBe(7800);
      expect(res.rows[0].originacion_vehiculo).toBe("used");
    }
  });

  it("omite filas vacías", () => {
    const res = validateCsvRows([
      { af: "", nombre: "", adeudo: "", semana: "", plazo_remanente: "" },
      {
        af: "X",
        nombre: "Y",
        adeudo: "1",
        semana: "1",
        semana_siguiente: "1",
        plazo_remanente: "10",
        plataforma: "DiDi",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rows).toHaveLength(1);
  });
});
