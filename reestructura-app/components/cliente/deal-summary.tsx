import { RULES } from "@/lib/constants";
import { CALCULATOR_COPY } from "@/lib/calculator-copy";
import type { CalculatorResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function mx(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

const visibleRows: {
  label: string;
  value: (calc: CalculatorResult) => number;
  hint: string;
  tone: "neutral" | "amber" | "emerald" | "violet";
}[] = [
  {
    label: "Saldo vencido",
    value: (c) => c.saldoVencido,
    hint: "Adeudo vencido antes del acuerdo.",
    tone: "neutral",
  },
  {
    label: "Semanalidad actual",
    value: (c) => c.semanalidadActual,
    hint: "Renta semanal vigente hoy.",
    tone: "neutral",
  },
  {
    label: "Semanalidad siguiente",
    value: (c) => c.semanalidadSiguiente,
    hint: "Renta de la semana siguiente incluida en el saldo a regularizar.",
    tone: "neutral",
  },
  {
    label: "Pago de intención",
    value: (c) => c.pagoIntencion,
    hint: "Monto extra en el pago total de hoy (hasta 50% del saldo total).",
    tone: "amber",
  },
  {
    label: "Pago total",
    value: (c) => c.totalPagarHoy,
    hint: "Monto que la persona paga hoy: semanalidad actual + pago de intención.",
    tone: "emerald",
  },
  {
    label: "Nueva semanalidad",
    value: (c) =>
      c.bonoProntoPagoMonto > 0 ? c.nuevaSemanalidadConBono : c.nuevaSemanalidad,
    hint: "Total semanal estimado después de la reestructura.",
    tone: "violet",
  },
];

const detailRows: {
  key: keyof Pick<
    CalculatorResult,
    | "totalAdeudo"
    | "saldoAReestructurar"
    | "pagoIntencion"
    | "condonacion"
    | "remanente"
    | "cscTeorico"
    | "cscAplicado"
    | "balloon"
  >;
  label: string;
  informative?: boolean;
  hint?: string;
}[] = [
  {
    key: "totalAdeudo",
    label: "Saldo total",
    hint: "Saldo a regularizar + semanalidad actual.",
  },
  {
    key: "saldoAReestructurar",
    label: "Saldo a regularizar",
    hint: "Saldo vencido + semanalidad siguiente.",
  },
  { key: "pagoIntencion", label: "Pago de intención" },
  { key: "condonacion", label: "Condonación" },
  { key: "remanente", label: "Deuda post-condonación" },
  { key: "cscTeorico", label: "CSC teórico", informative: true },
  { key: "cscAplicado", label: "CSC aplicado" },
  { key: "balloon", label: "Balloon (última semana)" },
];

const toneClass: Record<(typeof visibleRows)[number]["tone"], string> = {
  neutral: "border-border/80 bg-background/80 text-foreground",
  amber:
    "border-amber-200/80 bg-amber-50/90 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  emerald:
    "border-emerald-300/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
  violet:
    "border-violet-300/80 bg-violet-50/90 text-violet-950 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100",
};

export function DealSummaryHighlights({ calc }: { calc: CalculatorResult }) {
  const highlightRows = visibleRows.filter((row) => row.tone !== "neutral");

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold leading-none text-foreground">Resumen del acuerdo</h3>
        <p className="text-sm leading-snug text-muted-foreground">{CALCULATOR_COPY.pagoUnicoHoy}</p>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-1">
        {highlightRows.map(({ label, value, hint, tone }) => (
          <article
            key={label}
            className={cn("min-w-0 rounded-lg border p-3 shadow-sm", toneClass[tone])}
            aria-label={label}
          >
            <p className="text-[11px] font-medium uppercase leading-tight tracking-wide opacity-80">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
              {mx(value(calc))}
            </p>
            <p className="mt-1 text-xs leading-snug opacity-80">{hint}</p>
            {label === "Nueva semanalidad" && calc.bonoProntoPagoMonto > 0 ? (
              <p className="mt-1 text-xs leading-snug opacity-80">
                Sin bono: {mx(calc.nuevaSemanalidad)}.
              </p>
            ) : null}
            {label === "Pago total" ? (
              <p className="mt-1 text-xs leading-snug opacity-80">
                {mx(calc.semanalidadActual)} semanalidad + {mx(calc.pagoIntencion)} intención.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export type DealCalculatorDetailProps = {
  calc: CalculatorResult;
  bonoProntoPago: boolean;
  onBonoProntoPagoChange: (v: boolean) => void;
};

export type ClientePlataformaCsvInfoProps = {
  plataforma: string | null;
  ingresos_api: number | null;
  viajes_api: number | null;
  originacion_vehiculo: string | null;
};

export function ClientePlataformaCsvInfo({
  plataforma,
  ingresos_api,
  viajes_api,
  originacion_vehiculo,
}: ClientePlataformaCsvInfoProps) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/35 p-4 shadow-sm dark:bg-muted/25">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Datos de plataforma
      </p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Plataforma</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">{plataforma ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Net earnings</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {ingresos_api != null ? mx(ingresos_api) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Viajes</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {viajes_api != null ? viajes_api : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Originación</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {originacion_vehiculo ?? "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function DealCalculatorDetail({
  calc,
  bonoProntoPago,
  onBonoProntoPagoChange,
}: DealCalculatorDetailProps) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/35 p-4 shadow-sm dark:bg-muted/25">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Detalle del cálculo
      </p>
      <table className="w-full text-sm">
        <tbody>
          {detailRows.map(({ key, label, informative, hint }) => (
            <tr
              key={key}
              className={cn(
                "border-b border-border/60 last:border-0",
                informative && "bg-muted/25"
              )}
            >
              <td
                className={cn(
                  "py-2 pr-2 align-top text-sm leading-snug",
                  informative ? "text-muted-foreground/80" : "text-foreground"
                )}
              >
                <span>{label}</span>
                {hint ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                ) : null}
              </td>
              <td
                className={cn(
                  "py-2 pl-2 text-right text-sm tabular-nums",
                  informative
                    ? "font-medium text-muted-foreground/70"
                    : "font-semibold text-violet-700 dark:text-violet-300"
                )}
              >
                {mx(calc[key])}
              </td>
            </tr>
          ))}
          {calc.bonoProntoPagoMonto > 0 ? (
            <tr className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-2 text-sm leading-snug text-foreground">
                Bono pronto pago (condiciones)
              </td>
              <td className="py-2 pl-2 text-right text-sm tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                −{mx(calc.bonoProntoPagoMonto)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="mt-3 text-xs leading-snug text-muted-foreground">
        {CALCULATOR_COPY.wattsIncluidos} {CALCULATOR_COPY.composicionVariable}
      </p>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
        <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-violet-600"
            checked={bonoProntoPago}
            onChange={(e) => onBonoProntoPagoChange(e.target.checked)}
          />
          <span>
            El cliente cumple las condiciones del bono pronto pago (
            <span className="font-medium text-foreground">−{mx(RULES.BONO_PRONTO_PAGO)}</span>{" "}
            sobre la nueva semanalidad). Marcá solo si aplica según política vigente.
          </span>
        </label>
      </div>
    </section>
  );
}

/** @deprecated Usar DealSummaryHighlights + DealCalculatorDetail en el layout de dos columnas. */
export type DealSummaryProps = DealCalculatorDetailProps;

export function DealSummary(props: DealSummaryProps) {
  return (
    <div className="space-y-6">
      <DealSummaryHighlights calc={props.calc} />
      <DealCalculatorDetail {...props} />
    </div>
  );
}
