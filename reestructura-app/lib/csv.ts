import { z } from "zod";

/** Encabezados obligatorios (post-normalizar) en el CSV */
export const CSV_REQUIRED_HEADERS = [
  "af",
  "nombre",
  "adeudo",
  "semana",
  "semana_siguiente",
  "plazo_remanente",
  "plataforma",
] as const;

export type CsvRequiredHeader = (typeof CSV_REQUIRED_HEADERS)[number];

/** Fila lista para insertar en `clientes` (sin upload_id). */
export type ClienteCsvInsert = {
  af: string;
  nombre: string;
  telefono: string | null;
  vehiculo: string | null;
  plataforma: string;
  originacion_vehiculo: "new" | "used" | null;
  plazo_remanente: number;
  adeudo: number;
  semana: number;
  semana_siguiente: number;
  ingresos_api: number | null;
  viajes_api: number | null;
};

export function normalizeHeaderKey(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  cuenta: "af",
  af_cliente: "af",
  saldo_vencido: "adeudo",
  semanalidad_actual: "semana",
  semanalidad_siguiente: "semana_siguiente",
  renta_semana: "semana",
  renta: "semana",
  semanas_restantes: "plazo_remanente",
  plazo: "plazo_remanente",
  numero_de_telefono: "telefono",
  numerodetelefono: "telefono",
  net_earnings: "ingresos_api",
  netearning: "ingresos_api",
  netearningstrips: "ingresos_api",
  trips: "viajes_api",
  originacion_newused: "originacion_vehiculo",
  originacion: "originacion_vehiculo",
};

export function mapHeaderAlias(key: string): string {
  return HEADER_ALIASES[key] ?? key;
}

/**
 * Interpreta montos en formatos habituales en MX / Excel:
 * - Miles con punto: 6.146 → 6146
 * - Miles con coma: 7,140 → 7140
 * - Decimal EU con coma: 7,14 → 7.14 (solo si hay 1–2 decimales)
 * - Mixto US: 1,234.56 → 1234.56
 * - Mixto EU: 1.234,56 → 1234.56
 */
export function parseLocalizedNumber(raw: string): number {
  let s = String(raw).replace(/\s/g, "").trim();
  if (!s) return NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
    const n = Number(s);
    return n;
  }

  if (hasComma && !hasDot) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) {
      return Number(s.replace(/,/g, ""));
    }
    if (/^\d+,\d{1,2}$/.test(s)) {
      return Number(s.replace(",", "."));
    }
    return Number(s.replace(/,/g, ""));
  }

  if (hasDot && !hasComma) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      return parseInt(s.replace(/\./g, ""), 10);
    }
    return Number(s);
  }

  return Number(s);
}

export function parseDecimal(value: string | undefined | null, field: string): number {
  if (value == null || !String(value).trim()) {
    throw new Error(`${field}: vacío`);
  }
  const n = parseLocalizedNumber(String(value));
  if (!Number.isFinite(n)) {
    throw new Error(`${field}: no es un número válido (${value})`);
  }
  return n;
}

export function parseOptionalDecimal(
  value: string | undefined | null
): number | null {
  if (value == null || !String(value).trim()) return null;
  const n = parseLocalizedNumber(String(value));
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalInt(value: string | undefined | null): number | null {
  if (value == null || !String(value).trim()) return null;
  let s = String(value).replace(/\s/g, "").trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    const n = parseInt(s.replace(/\./g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const n = parseInt(s.replace(/,/g, "").trim(), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseOriginacionVehiculo(
  value: string | undefined | null
): "new" | "used" | null {
  if (value == null || !String(value).trim()) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "new" || normalized === "nuevo") return "new";
  if (normalized === "used" || normalized === "usado") return "used";
  throw new Error('Originación debe ser "new" o "used"');
}

/** Detecta `;` vs `,` según la primera fila con encabezados. */
export function guessCsvDelimiter(line: string): string {
  const sc = (line.match(/;/g) ?? []).length;
  const cc = (line.match(/,/g) ?? []).length;
  if (sc === 0 && cc === 0) return ",";
  return sc > cc ? ";" : ",";
}

/** Primera fila que parece encabezado (tiene af + nombre). Salta filas vacías de Excel. */
export function findCsvHeaderLineIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;
    const delim = guessCsvDelimiter(line);
    const parts = line.split(delim).map((c) => mapHeaderAlias(normalizeHeaderKey(c.trim())));
    if (parts.includes("af") && parts.includes("nombre")) return i;
  }
  return 0;
}

/** Quita filas previas al encabezado real y fija el delimitador para Papa Parse. */
export function prepareCsvForPapa(raw: string): { text: string; delimiter: string } {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const idx = findCsvHeaderLineIndex(lines);
  const headerLine = lines[idx] ?? "";
  const delimiter = guessCsvDelimiter(headerLine);
  const text = lines.slice(idx).join("\n");
  return { text, delimiter };
}

const clienteInsertSchema = z.object({
  af: z.string().min(1).max(120),
  nombre: z.string().min(1).max(500),
  telefono: z.string().max(80).nullable(),
  vehiculo: z.string().max(200).nullable(),
  plataforma: z.string().min(1).max(120),
  originacion_vehiculo: z.enum(["new", "used"]).nullable(),
  plazo_remanente: z.number().int().positive().max(520),
  adeudo: z.number().finite().nonnegative(),
  semana: z.number().finite().nonnegative(),
  semana_siguiente: z.number().finite().nonnegative(),
  ingresos_api: z.number().finite().nullable(),
  viajes_api: z.number().int().nonnegative().nullable(),
});

export function recordToClienteInsert(
  row: Record<string, string>,
  rowIndex1Based: number
): { ok: true; data: ClienteCsvInsert } | { ok: false; error: string } {
  try {
    const g = (k: string) => row[k]?.trim() ?? "";

    const af = g("af");
    const nombre = g("nombre");
    const plataforma = g("plataforma");
    if (!plataforma) {
      throw new Error("plataforma es obligatoria");
    }

    const adeudo = parseDecimal(row.adeudo, "saldo vencido");
    const semana = parseDecimal(row.semana, "semanalidad actual");
    const semanaSiguiente = parseDecimal(row.semana_siguiente, "semanalidad siguiente");
    const plazoRaw = row.plazo_remanente;
    const plazo = parseOptionalInt(String(plazoRaw ?? ""));
    if (plazo == null || plazo <= 0) {
      throw new Error("plazo debe ser un entero > 0");
    }

    const raw: ClienteCsvInsert = {
      af,
      nombre,
      telefono: (() => {
        const t = g("telefono").replace(/\s+/g, "");
        return t || null;
      })(),
      vehiculo: g("vehiculo") || null,
      plataforma,
      originacion_vehiculo: parseOriginacionVehiculo(row.originacion_vehiculo),
      plazo_remanente: plazo,
      adeudo,
      semana,
      semana_siguiente: semanaSiguiente,
      ingresos_api: parseOptionalDecimal(row.ingresos_api),
      viajes_api: parseOptionalInt(row.viajes_api),
    };

    const parsed = clienteInsertSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return { ok: false, error: `Fila ${rowIndex1Based}: ${msg}` };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Fila ${rowIndex1Based}: ${msg}` };
  }
}

export function validateCsvHeaders(fields: string[] | undefined): string | null {
  if (!fields?.length) {
    return "El CSV no tiene fila de encabezados o está vacío.";
  }
  const normalized = fields.map((f) => mapHeaderAlias(normalizeHeaderKey(f)));
  const set = new Set(normalized);
  for (const req of CSV_REQUIRED_HEADERS) {
    if (!set.has(req)) {
      return `Falta la columna obligatoria: "${req}". Columnas detectadas: ${normalized.join(", ")}`;
    }
  }
  return null;
}

/** Renombra claves de cada fila según alias (después de normalizar encabezados Papa). */
export function normalizeRowKeys(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const canon = mapHeaderAlias(normalizeHeaderKey(k));
    if (out[canon] === undefined) {
      out[canon] = v ?? "";
    }
  }
  return out;
}

export type CsvValidationResult =
  | { ok: true; rows: ClienteCsvInsert[] }
  | { ok: false; errors: string[] };

export function validateCsvRows(
  rawRows: Record<string, string>[]
): CsvValidationResult {
  const nonEmpty = rawRows.filter((raw) => {
    const row = normalizeRowKeys(raw);
    return Object.values(row).some((v) => String(v).trim() !== "");
  });

  if (!nonEmpty.length) {
    return { ok: false, errors: ["No hay filas de datos en el CSV."] };
  }
  const errors: string[] = [];
  const rows: ClienteCsvInsert[] = [];
  const maxErrors = 25;

  nonEmpty.forEach((raw, i) => {
    if (errors.length >= maxErrors) return;
    const row = normalizeRowKeys(raw);
    const r = recordToClienteInsert(row, i + 2);
    if (!r.ok) errors.push(r.error);
    else rows.push(r.data);
  });

  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}

export const uploadPayloadSchema = z.object({
  filename: z.string().min(1).max(512),
  week_of: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().max(4000).optional().nullable(),
  rows: z.array(z.record(z.unknown())).min(1).max(5000),
});

export function coerceRowsToStrings(
  rows: Record<string, unknown>[]
): Record<string, string>[] {
  return rows.map((row) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      o[String(k)] = v == null ? "" : String(v);
    }
    return o;
  });
}
