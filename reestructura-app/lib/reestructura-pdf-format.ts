const WEEKDAY_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export function formatPdfCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPdfCurrencyDeduction(value: number): string {
  return `− ${formatPdfCurrency(value)}`;
}

export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const normalized = iso.includes("T") ? iso : `${iso}T12:00:00`;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function capitalizeWeekday(date: Date): string {
  const weekday = WEEKDAY_ES[date.getDay()] ?? "día";
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function formatLegalPaymentDeadline(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${capitalizeWeekday(date)} ${day}/${month}/${date.getFullYear()} · 23:59 h`;
}

export function formatLegalDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${capitalizeWeekday(date)} ${day}/${month}/${date.getFullYear()}`;
}

export function formatLegalShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export type PdfScheduleDates = {
  paymentDeadline: string;
  residualDue: string;
};

/** Fechas derivadas del compromiso de pago y el plazo remanente del contrato. */
export function buildPdfScheduleDates(
  fechaCompromisoIso: string,
  plazoRemanente: number
): PdfScheduleDates | null {
  const paymentDate = parseIsoDate(fechaCompromisoIso);
  if (!paymentDate) return null;

  const weeks = Math.max(1, Math.floor(plazoRemanente));

  return {
    paymentDeadline: formatLegalPaymentDeadline(paymentDate),
    residualDue: formatLegalShortDate(addWeeks(paymentDate, weeks)),
  };
}
