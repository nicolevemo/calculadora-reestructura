"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n: number) {
  return Math.round(n);
}

type Props = {
  /** Remontar este bloque cuando cambie la negociación cargada */
  negociacionId: string;
  min: number;
  max: number;
  initialPago: number | null;
  onAmountChange: (n: number) => void;
  isValid: boolean;
  isBelowMin: boolean;
  isAboveMax: boolean;
  fechaCompromiso: string;
  onFechaCompromisoChange: (value: string) => void;
};

/**
 * Input de pago de intención **no controlado** por el padre (evita perder foco al tipear).
 * El padre solo recibe números parseados para recalcular el resto de la UI.
 */
const QUICK_AMOUNTS = [5000, 7000, 10000] as const;

function isPresetInRange(amount: number, min: number, max: number) {
  return amount >= min && amount <= max;
}

export function PagoIntencionBlock({
  negociacionId,
  min,
  max,
  initialPago,
  onAmountChange,
  isValid,
  isBelowMin,
  isAboveMax,
  fechaCompromiso,
  onFechaCompromisoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onAmountChangeRef = useRef(onAmountChange);
  const limitsRef = useRef({ min, max, initialPago });
  limitsRef.current = { min, max, initialPago };
  onAmountChangeRef.current = onAmountChange;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const { min: minLimit, max: maxLimit, initialPago: savedPago } = limitsRef.current;
    let start = minLimit;
    if (savedPago != null && Number.isFinite(savedPago) && savedPago > 0) {
      start = clamp(savedPago, minLimit, maxLimit);
    }
    el.value = String(start);
    onAmountChangeRef.current(start);
  }, [negociacionId]);

  const applyAmount = (n: number) => {
    const { min: minLimit, max: maxLimit } = limitsRef.current;
    const v = clamp(roundMoney(n), minLimit, maxLimit);
    if (inputRef.current) inputRef.current.value = String(v);
    onAmountChangeRef.current(v);
  };

  const onInput = () => {
    const el = inputRef.current;
    if (!el) return;
    const raw = el.value.replace(/,/g, "").trim();
    if (raw === "") {
      onAmountChangeRef.current(0);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onAmountChangeRef.current(n);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold leading-none text-foreground">Pago de intención</h3>
        <p className="text-sm leading-snug text-muted-foreground">
          Monto extra en el pago total de hoy. Mínimo {formatMx(min)} · máximo {formatMx(max)} (50%
          del total de adeudo).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => applyAmount(min)}>
          Mínimo
        </Button>
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            type="button"
            size="sm"
            variant="secondary"
            disabled={!isPresetInRange(amount, min, max)}
            title={
              !isPresetInRange(amount, min, max)
                ? `No aplica para este cliente (rango ${formatMx(min)}–${formatMx(max)})`
                : undefined
            }
            onClick={() => applyAmount(amount)}
          >
            {formatMx(amount)}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="default"
          className="font-medium"
          title={`Máximo permitido para este cliente: ${formatMx(max)}`}
          onClick={() => applyAmount(max)}
        >
          Máximo
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pago-intencion" className="text-sm font-medium text-foreground">
          Monto (MXN)
        </Label>
        <Input
          ref={inputRef}
          id="pago-intencion"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={isBelowMin || isAboveMax}
          className={cn(
            "h-9 text-sm font-medium tabular-nums leading-normal",
            (isBelowMin || isAboveMax) && "border-destructive focus-visible:ring-destructive"
          )}
          defaultValue=""
          onInput={onInput}
        />
      </div>

      <div
        role="alert"
        className={cn(
          "rounded-md border px-3 py-2 text-sm leading-snug",
          isBelowMin || isAboveMax
            ? "border-destructive/60 bg-destructive/10 text-destructive"
            : isValid
              ? "border-emerald-600/30 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
              : "border-muted bg-muted/40 text-muted-foreground"
        )}
      >
        {isAboveMax ? (
          <>
            <span className="font-semibold">Error: </span>
            supera el máximo permitido para este cliente ({formatMx(max)}, 50% del total de adeudo).
          </>
        ) : isBelowMin ? (
          <>
            <span className="font-semibold">Error: </span>
            el pago de intención no puede ser menor a {formatMx(min)}. Solo se aceptan montos desde{" "}
            {formatMx(min)} en adelante (hasta {formatMx(max)}).
          </>
        ) : isValid ? (
          "Dentro del rango permitido."
        ) : (
          <>
            Ingresá un monto entre {formatMx(min)} y {formatMx(max)}, o usá los atajos de arriba.
          </>
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <Label htmlFor="fecha-compromiso" className="text-sm font-medium text-foreground">
          Fecha de compromiso del pago
        </Label>
        <Input
          id="fecha-compromiso"
          type="date"
          value={fechaCompromiso}
          onChange={(e) => onFechaCompromisoChange(e.target.value)}
          className="h-9 text-sm"
        />
        <p className="text-sm leading-snug text-muted-foreground">
          Obligatoria si el estado es Aceptado o En negociación.
        </p>
      </div>
    </div>
  );
}

function formatMx(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}
