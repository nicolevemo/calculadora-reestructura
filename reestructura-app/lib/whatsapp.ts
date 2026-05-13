/**
 * Normaliza teléfono para `https://wa.me/<número>` (solo dígitos, sin +).
 * Asume México (+52) si hay 10 dígitos típicos de celular nacional.
 */
export function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (digits.startsWith("52") && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith("521") && digits.length >= 13) {
    return digits;
  }
  if (digits.length === 10) {
    return `52${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `52${digits.slice(1)}`;
  }
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const num = normalizePhoneForWhatsApp(phone);
  if (!num) return null;
  const text = message.trim();
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
}
