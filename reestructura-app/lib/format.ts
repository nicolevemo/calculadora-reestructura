const LOCALE = "es-MX";
const TIME_ZONE = "America/Mexico_City";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseDateTime(value: string) {
  const dateOnly = value.slice(0, 10);
  if (DATE_ONLY_RE.test(dateOnly) && value.length === 10) {
    return parseDateOnly(dateOnly);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function fmtMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—";

  const dateOnly = value.slice(0, 10);
  if (DATE_ONLY_RE.test(dateOnly) && value.length === 10) {
    return parseDateOnly(dateOnly).toLocaleDateString(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const parsed = parseDateTime(value);
  if (!parsed) return "—";

  return parsed.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

/**
 * Formato numérico estable para CSV/Excel: "YYYY-MM-DD HH:mm" en la
 * zona horaria de la app. Devuelve "" si no hay valor (para celdas vacías).
 */
export function fmtDateTimeCsv(value: string | null | undefined) {
  if (!value) return "";
  const parsed = parseDateTime(value);
  if (!parsed) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).formatToParts(parsed);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}`;
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = parseDateTime(value);
  if (!parsed) return "—";

  return parsed.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}
