import { describe, expect, it } from "vitest";

import {
  parseDecimal,
  parseOriginationDate,
  parseSiNo,
  prepareCsvForPapa,
  validateCsvHeaders,
  validateCsvRows,
} from "./csv";

describe("parseSiNo", () => {
  it("interpreta SI/NO y variantes", () => {
    expect(parseSiNo("SI")).toBe(true);
    expect(parseSiNo("sí")).toBe(true);
    expect(parseSiNo("1")).toBe(true);
    expect(parseSiNo("NO")).toBe(false);
    expect(parseSiNo("")).toBe(false);
  });
});

describe("parseOriginationDate", () => {
  it("acepta ISO y DD/MM/YYYY", () => {
    expect(parseOriginationDate("2024-01-15")).toBe("2024-01-15");
    expect(parseOriginationDate("5/3/2024")).toBe("2024-03-05");
  });
});

describe("validateCsvHeaders", () => {
  it("exige columnas obligatorias", () => {
    expect(validateCsvHeaders(["af", "nombre", "adeudo"])).toMatch(/semana/);
    expect(validateCsvHeaders(["af", "nombre", "adeudo", "semana", "plazo_remanente"])).toBeNull();
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
    const raw = ";;;;;;;\nAF;Nombre;Adeudo;Semana;Plazo Remanente\nAF1;Juan;1000;200;48\n";
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
        plazo_remanente: "48",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0].adeudo).toBe(10000);
      expect(res.rows[0].pago_en_dia).toBe(false);
    }
  });

  it("acepta fila estilo Excel con plataforma Uber y miles con punto", () => {
    const res = validateCsvRows([
      {
        af: "5730AF",
        nombre: "MATA MARTINEZ",
        telefono: "5581678708",
        adeudo: "44.809",
        plazo_remanente: "178",
        semana: "6.867",
        plataforma: "Uber",
        ingresos_api: "7.800",
        viajes_api: "67",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows[0].adeudo).toBe(44809);
      expect(res.rows[0].semana).toBe(6867);
      expect(res.rows[0].api_uber).toBe(true);
      expect(res.rows[0].ingresos_api).toBe(7800);
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
        plazo_remanente: "10",
      },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rows).toHaveLength(1);
  });
});
