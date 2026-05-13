"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { saveNegociacion } from "@/app/actions/negociacion";
import { ClienteCommsPanel } from "@/components/cliente/cliente-comms-panel";
import { ClientePlataformaCsvInfo, DealCalculatorDetail, DealSummaryHighlights } from "@/components/cliente/deal-summary";
import { PagoIntencionBlock } from "@/components/cliente/pago-intencion-block";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculate } from "@/lib/calculator";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import type { CalculatorClientInput, CallStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ClientePdfPreview = dynamic(
  () => import("@/components/cliente/cliente-pdf-preview").then((m) => m.ClientePdfPreview),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[320px] flex-col rounded-lg border bg-muted/30"
        aria-hidden
      >
        <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
          Vista previa del PDF
        </div>
        <div className="flex flex-1 animate-pulse items-center justify-center text-sm text-muted-foreground">
          Cargando vista previa…
        </div>
      </div>
    ),
  }
);

export type ClienteWorkspaceProps = {
  cliente: {
    id: string;
    af: string;
    nombre: string;
    telefono: string | null;
    vehiculo: string | null;
    plataforma: string | null;
    bucket: string | null;
    adeudo: number;
    semana: number;
    plazo_remanente: number;
    pago_en_dia: boolean;
    monto_pago_dia: number;
    api_uber: boolean;
    api_didi: boolean;
    ingresos_api: number | null;
    viajes_api: number | null;
    ci: string | null;
    energia_adicional: number | null;
    origination_date: string | null;
    comments_originales: string | null;
  };
  negociacion: {
    id: string;
    cliente_id: string;
    status: CallStatus;
    intentos: number;
    pago_intencion: number | null;
    fecha_compromiso: string | null;
    motivo_rechazo: string | null;
    notes: string | null;
    updated_at: string;
    bono_pronto_pago: boolean;
  };
};

function isCallStatus(s: string): s is CallStatus {
  return (STATUS_ORDER as readonly string[]).includes(s);
}

function mx(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function todayMx() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function deriveInitialPago(ci: CalculatorClientInput, pi: number | null) {
  const z = calculate(ci, pi ?? 0);
  if (pi != null && pi > 0 && z.isValid) return pi;
  return z.pagoIntencionMin;
}

export function ClienteWorkspace({ cliente, negociacion }: ClienteWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const clientInput = useMemo<CalculatorClientInput>(
    () => ({
      adeudo: cliente.adeudo,
      semana: cliente.semana,
      plazo_remanente: cliente.plazo_remanente,
      pago_en_dia: cliente.pago_en_dia,
      monto_pago_dia: cliente.monto_pago_dia,
    }),
    [cliente]
  );

  const [pagoLive, setPagoLive] = useState(() =>
    deriveInitialPago(clientInput, negociacion.pago_intencion)
  );

  const onAmountChange = useCallback((n: number) => {
    setPagoLive(n);
  }, []);

  const [bonoProntoPago, setBonoProntoPago] = useState(Boolean(negociacion.bono_pronto_pago));

  const calc = useMemo(
    () => calculate(clientInput, pagoLive, { bonoProntoPago }),
    [clientInput, pagoLive, bonoProntoPago]
  );
  const baseCalc = useMemo(() => calculate(clientInput, 0), [clientInput]);

  const [status, setStatus] = useState<CallStatus>(
    isCallStatus(negociacion.status) ? negociacion.status : "listo_contactar"
  );
  const [fechaCompromiso, setFechaCompromiso] = useState(
    negociacion.fecha_compromiso?.slice(0, 10) ?? ""
  );
  const [motivoRechazo, setMotivoRechazo] = useState(negociacion.motivo_rechazo ?? "");
  const [notes, setNotes] = useState(negociacion.notes ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const fechaCompromisoLabel = useMemo(
    () =>
      fechaCompromiso.trim()
        ? new Date(fechaCompromiso + "T12:00:00").toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "",
    [fechaCompromiso]
  );

  const handleSave = () => {
    setSaveError(null);
    setSaveOk(false);
    startTransition(async () => {
      try {
        const res = await saveNegociacion({
          clienteId: cliente.id,
          negociacionId: negociacion.id,
          status,
          pago_intencion: pagoLive > 0 ? pagoLive : null,
          fecha_compromiso: fechaCompromiso.trim() || null,
          motivo_rechazo: motivoRechazo.trim() || null,
          notes: notes.trim() || null,
          bono_pronto_pago: bonoProntoPago,
        });
        if (!res.ok) {
          setSaveError(res.error);
          return;
        }
        setSaveOk(true);
        router.refresh();
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "No se pudo guardar. Revisá la consola o probá de nuevo."
        );
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">← Volver al dashboard</Link>
        </Button>
      </div>

      <header className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AF <span className="font-mono font-medium text-foreground">{cliente.af}</span>
            {cliente.vehiculo ? (
              <>
                {" · "}
                {cliente.vehiculo}
              </>
            ) : null}
            {cliente.plataforma ? (
              <>
                {" · "}
                {cliente.plataforma}
              </>
            ) : null}
            {cliente.telefono ? (
              <>
                {" · "}
                {cliente.telefono}
              </>
            ) : null}
          </p>
          <div className="mt-2">
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm capitalize text-muted-foreground">{todayMx()}</p>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <div className="w-full min-w-[200px] max-w-xs">
            <Label className="sr-only">Estado de la llamada</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CallStatus)}>
              <SelectTrigger aria-label="Estado de la llamada">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {saveError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      {saveOk && !saveError ? (
        <p className="text-sm text-emerald-700">Cambios guardados.</p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 grid gap-6 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.1fr)] lg:items-start">
          <PagoIntencionBlock
            negociacionId={negociacion.id}
            min={baseCalc.pagoIntencionMin}
            max={baseCalc.pagoIntencionMax}
            initialPago={negociacion.pago_intencion}
            onAmountChange={onAmountChange}
            isValid={calc.isValid}
            isBelowMin={calc.isBelowMin}
            isAboveMax={calc.isAboveMax}
            fechaCompromiso={fechaCompromiso}
            onFechaCompromisoChange={setFechaCompromiso}
          />
          <div className="min-w-0 space-y-6">
            <DealCalculatorDetail
              calc={calc}
              bonoProntoPago={bonoProntoPago}
              onBonoProntoPagoChange={setBonoProntoPago}
            />
            <ClientePlataformaCsvInfo
              plataforma={cliente.plataforma}
              ingresos_api={cliente.ingresos_api}
              viajes_api={cliente.viajes_api}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 p-6 text-white shadow-md">
            <p className="text-sm font-medium text-white/90">Total de adeudo</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {mx(calc.totalAdeudo)}
            </p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-white/75">Saldo vencido</dt>
                <dd className="font-semibold tabular-nums">{mx(calc.saldoVencido)}</dd>
              </div>
              <div>
                <dt className="text-white/75">Semanalidad actual</dt>
                <dd className="font-semibold tabular-nums">{mx(calc.semanalidadActual)}</dd>
              </div>
              <div>
                <dt className="text-white/75">Semanalidad siguiente</dt>
                <dd className="font-semibold tabular-nums">{mx(calc.semanalidadSiguiente)}</dd>
              </div>
              <div>
                <dt className="text-white/75">Plazo remanente</dt>
                <dd className="font-semibold tabular-nums">{cliente.plazo_remanente} sem.</dd>
              </div>
            </dl>
          </section>

          <DealSummaryHighlights calc={calc} />

          <ClientePdfPreview
            nombre={cliente.nombre}
            af={cliente.af}
            telefono={cliente.telefono}
            plataforma={cliente.plataforma}
            status={status}
            fechaCompromiso={fechaCompromisoLabel}
            generatedAtLabel="Vista previa — se actualiza al cambiar montos, fecha o estado"
            calc={calc}
          />
          <ClienteCommsPanel
            cliente={{
              nombre: cliente.nombre,
              af: cliente.af,
              telefono: cliente.telefono,
              plataforma: cliente.plataforma,
            }}
            status={status}
            fechaCompromisoLabel={fechaCompromisoLabel}
            calc={calc}
          />
        </aside>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-4 text-sm">
          <p className="font-medium">Seguimiento</p>
          <p className="mt-1 text-muted-foreground">
            Intentos (sin respuesta):{" "}
            <span className="font-mono font-medium text-foreground">{negociacion.intentos}</span> / 5
          </p>
        </div>

        {status === "rechazado" ? (
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de rechazo</Label>
            <textarea
              id="motivo"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
              className={cn(
                "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              placeholder="Ej. No quiere reestructurar, prefiere liquidar, etc."
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="notes">Notas de la llamada</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={cn(
              "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            placeholder="Contexto de la conversación…"
          />
        </div>

        <details className="rounded-lg border bg-card p-4 text-sm open:shadow-sm">
          <summary className="cursor-pointer font-medium">Información adicional del cliente</summary>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Bucket</dt>
              <dd>{cliente.bucket ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CI / Energía adicional</dt>
              <dd>
                {cliente.ci ?? "—"}
                {cliente.energia_adicional != null ? ` · ${mx(cliente.energia_adicional)}` : ""}
              </dd>
            </div>
          </dl>
          {cliente.comments_originales ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Comentarios originales: </span>
              {cliente.comments_originales}
            </p>
          ) : null}
        </details>
      </div>
    </div>
  );
}
