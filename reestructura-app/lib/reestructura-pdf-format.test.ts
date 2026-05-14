import { describe, expect, it } from "vitest";

import {
  buildPdfScheduleDates,
  formatLegalPaymentDeadline,
  formatPdfCurrency,
  formatPdfCurrencyDeduction,
  parseIsoDate,
} from "./reestructura-pdf-format";

describe("reestructura-pdf-format", () => {
  it("formats currency with two decimals", () => {
    expect(formatPdfCurrency(8000)).toMatch(/\$8,000\.00/);
  });

  it("formats deductions with a leading minus", () => {
    expect(formatPdfCurrencyDeduction(8000)).toBe("− $8,000.00");
  });

  it("builds legal payment deadline copy", () => {
    const date = parseIsoDate("2026-05-20");
    expect(date).not.toBeNull();
    if (!date) return;
    expect(formatLegalPaymentDeadline(date)).toBe("Miércoles 20/05/2026 · 23:59 h");
  });

  it("derives schedule dates from payment date and plazo", () => {
    const schedule = buildPdfScheduleDates("2026-05-20", 32);
    expect(schedule).toEqual({
      paymentDeadline: "Miércoles 20/05/2026 · 23:59 h",
      firstOrdinaryPayment: "Miércoles 10/06/2026",
      residualDue: "30/12/2026",
    });
  });
});
