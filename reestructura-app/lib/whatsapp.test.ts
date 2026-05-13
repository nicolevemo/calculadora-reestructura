import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl, normalizePhoneForWhatsApp } from "./whatsapp";

describe("normalizePhoneForWhatsApp", () => {
  it("agrega 52 a 10 dígitos MX", () => {
    expect(normalizePhoneForWhatsApp("55 8167 8708")).toBe("525581678708");
  });

  it("respeta número que ya incluye 52", () => {
    expect(normalizePhoneForWhatsApp("525581678708")).toBe("525581678708");
  });

  it("devuelve null si no hay dígitos suficientes", () => {
    expect(normalizePhoneForWhatsApp("123")).toBeNull();
    expect(normalizePhoneForWhatsApp(null)).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("incluye texto codificado", () => {
    const u = buildWhatsAppUrl("5581678708", "Hola\nMundo");
    expect(u).toContain("https://wa.me/525581678708");
    expect(u).toContain(encodeURIComponent("Hola\nMundo"));
  });
});
