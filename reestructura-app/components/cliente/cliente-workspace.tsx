"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { saveNegociacion } from "@/app/actions/negociacion";
import { AssigneeSelect } from "@/components/assignee-select";
import { ClienteCommsPanel } from "@/components/cliente/cliente-comms-panel";
import {
  ClienteSeguimientoPanel,
  type ActividadLogEntry,
} from "@/components/cliente/cliente-seguimiento-panel";
import {
  ClientePlataformaCsvInfo,
  DealCalculatorDetail,
  DealSummaryHighlights,
} from "@/components/cliente/deal-summary";
import { PagoIntencionBlock } from "@/components/cliente/pago-intencion-block";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculate } from "@/lib/calculator";
import type { AssignableAgent } from "@/lib/assignable-agents";
import { PAGADO_STATUSES, RULES, STATUS, STATUS_ORDER, STATUS_SELECTOR } from "@/lib/constants";
import type { CalculatorClientInput, CallStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ClientePdfPreview = dynamic(
  () => import("@/components/cliente/cliente-pdf-preview").then((m) => m.ClientePdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] flex-col rounded-lg border bg-muted/30" aria-hidden>
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
    semana_siguiente: number;
    originacion_vehiculo: string | null;
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
    motivo_cierre: string | null;
    fecha_pago: string | null;
    notes: string | null;
    updated_at: string;
    exported_at: string | null;
    bono_pronto_pago: boolean;
    assigned_to: string | null;
    assigned_to_name: string | null;
  };
  actividadLog: ActividadLogEntry[];
  assignableAgents: AssignableAgent[];
  canAssign: boolean;
  isAdmin?: boolean;
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

/** Estados donde no se requiere pago de intención → default $0 */
const ZERO_PAGO_STATUSES: CallStatus[] = ["listo_contactar", "sin_respuesta", "necesita_revision"];

function deriveInitialPago(ci: CalculatorClientInput, pi: number | null, status: CallStatus) {
  if (pi != null && pi > 0) {
    const z = calculate(ci, pi);
    if (z.isValid) return pi;
  }
  // En estados sin acuerdo, si no hay pago guardado arrancamos en 0
  if (ZERO_PAGO_STATUSES.includes(status) && (pi == null || pi === 0)) return 0;
  const z = calculate(ci, 0);
  return z.pagoIntencionMin;
}

const UNSAVED_LEAVE_MESSAGE =
  "Tenés cambios sin guardar. Si salís de esta pantalla, no se van a guardar.";

export function ClienteWorkspace({
  cliente,
  negociacion,
  actividadLog,
  assignableAgents,
  canAssign,
  isAdmin: _isAdmin = false,
}: ClienteWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const clientInput = useMemo<CalculatorClientInput>(
    () => ({
      adeudo: cliente.adeudo,
      semana: cliente.semana,
      semana_siguiente: cliente.semana_siguiente,
      plazo_remanente: cliente.plazo_remanente,
      pago_en_dia: cliente.pago_en_dia,
      monto_pago_dia: cliente.monto_pago_dia,
    }),
    [cliente]
  );

  const initialSnapshot = useMemo(() => {
    const status = isCallStatus(negociacion.status) ? negociacion.status : ("listo_contactar" as CallStatus);
    return {
      status,
      fechaCompromiso: negociacion.fecha_compromiso?.slice(0, 10) ?? "",
      motivoRechazo: negociacion.motivo_rechazo ?? "",
      motivoCierre: negociacion.motivo_cierre ?? "",
      fechaPago: negociacion.fecha_pago?.slice(0, 10) ?? "",
      notes: negociacion.notes ?? "",
      bonoProntoPago: Boolean(negociacion.bono_pronto_pago),
      pago: deriveInitialPago(clientInput, negociacion.pago_intencion, status),
    };
  }, [clientInput, negociacion]);

  const [pagoLive, setPagoLive] = useState(initialSnapshot.pago);

  const onAmountChange = useCallback((n: number) => {
    setPagoLive(n);
  }, []);

  const [bonoProntoPago, setBonoProntoPago] = useState(initialSnapshot.bonoProntoPago);

  const calc = useMemo(
    () => calculate(clientInput, pagoLive, { bonoProntoPago }),
    [clientInput, pagoLive, bonoProntoPago]
  );
  const baseCalc = useMemo(() => calculate(clientInput, 0), [clientInput]);

  const [status, setStatus] = useState<CallStatus>(initialSnapshot.status);
  const [fechaCompromiso, setFechaCompromiso] = useState(initialSnapshot.fechaCompromiso);
  const [motivoRechazo, setMotivoRechazo] = useState(initialSnapshot.motivoRechazo);
  const [motivoCierre, setMotivoCierre] = useState(initialSnapshot.motivoCierre);
  const [fechaPago, setFechaPago] = useState(initialSnapshot.fechaPago);
  const [notes, setNotes] = useState(initialSnapshot.notes);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isEnPagoFlow = PAGADO_STATUSES.includes(status);
  // El selector principal muestra "pagado" como valor agrupado para todo el flujo de firma
  const selectorValue: string = isEnPagoFlow ? "pagado" : status;

  const isDirty = useMemo(
    () =>
      status !== initialSnapshot.status ||
      fechaCompromiso !== initialSnapshot.fechaCompromiso ||
      motivoRechazo !== initialSnapshot.motivoRechazo ||
      motivoCierre !== initialSnapshot.motivoCierre ||
      fechaPago !== initialSnapshot.fechaPago ||
      notes !== initialSnapshot.notes ||
      bonoProntoPago !== initialSnapshot.bonoProntoPago ||
      pagoLive !== initialSnapshot.pago,
    [
      status,
      fechaCompromiso,
      motivoRechazo,
      motivoCierre,
      fechaPago,
      notes,
      bonoProntoPago,
      pagoLive,
      initialSnapshot,
    ]
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSAVED_LEAVE_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleBackClick = useCallback(
    (event: React.MouseEvent) => {
      if (isDirty) {
        event.preventDefault();
        setShowLeaveDialog(true);
      }
    },
    [isDirty]
  );

  const handleLeaveWithoutSaving = useCallback(() => {
    setShowLeaveDialog(false);
    router.push("/dashboard");
  }, [router]);

  const handleSaveAndLeave = useCallback(() => {
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
          motivo_cierre: motivoCierre.trim() || null,
          fecha_pago: fechaPago.trim() || null,
          notes: notes.trim() || null,
          bono_pronto_pago: bonoProntoPago,
        });
        if (!res.ok) {
          setSaveError(res.error);
          setShowLeaveDialog(false);
          return;
        }
        router.push("/dashboard");
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "No se pudo guardar. Revisá la consola o probá de nuevo."
        );
        setShowLeaveDialog(false);
      }
    });
  }, [
    cliente.id,
    negociacion.id,
    status,
    pagoLive,
    fechaCompromiso,
    motivoRechazo,
    motivoCierre,
    fechaPago,
    notes,
    bonoProntoPago,
    router,
  ]);

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
          motivo_cierre: motivoCierre.trim() || null,
          fecha_pago: fechaPago.trim() || null,
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
    <div className="space-y-6">
      {/* Dialog de cambios sin guardar */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tenés cambios sin guardar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Si salís ahora se van a perder los cambios que hiciste en este cliente.
            ¿Qué querés hacer?
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLeaveDialog(false)}
            >
              Seguir editando
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveWithoutSaving}
            >
              Salir sin guardar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndLeave}
              disabled={pending}
            >
              {pending ? "Guardando…" : "Guardar y salir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard" onClick={handleBackClick}>
            ← Volver al dashboard
          </Link>
        </Button>
        {isDirty ? (
          <span className="hidden text-sm text-amber-700 sm:block">
            Cambios sin guardar
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <div className="min-w-[180px]">
            <Label className="sr-only">Estado de la llamada</Label>
            <Select
              value={selectorValue}
              onValueChange={(v) => {
                if (v === "pagado") {
                  setStatus("pendiente_firma");
                } else {
                  setStatus(v as CallStatus);
                }
              }}
            >
              <SelectTrigger aria-label="Estado de la llamada">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_SELECTOR.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS[s].label}
                  </SelectItem>
                ))}
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !isDirty}
            variant={isDirty ? "default" : "outline"}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
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
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Label className="text-xs text-muted-foreground">Asignado a</Label>
          <AssigneeSelect
            clienteId={cliente.id}
            negociacionId={negociacion.id}
            assignedTo={negociacion.assigned_to}
            assignedToName={negociacion.assigned_to_name}
            agents={assignableAgents}
            canAssign={canAssign}
            onError={setAssignError}
            triggerClassName="w-full min-w-[12rem] lg:w-auto"
          />
        </div>
      </header>

      {assignError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {assignError}
        </p>
      ) : null}

      {negociacion.exported_at && negociacion.status === "aceptado" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Este cliente ya fue aceptado y exportado</p>
          <p className="mt-0.5 text-amber-800">
            Exportado el{" "}
            {new Date(negociacion.exported_at).toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Por favor corroborá los datos antes de modificar.
          </p>
        </div>
      ) : negociacion.exported_at ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Exportado el{" "}
          {new Date(negociacion.exported_at).toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          . Podés seguir editando.
        </div>
      ) : null}

      <div className="flex items-center rounded-lg border bg-muted/30 px-4 py-2.5">
        <p className="text-sm capitalize text-muted-foreground">{todayMx()}</p>
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
        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.1fr)] lg:items-start">
            <PagoIntencionBlock
              negociacionId={negociacion.id}
              min={baseCalc.pagoIntencionMin}
              max={baseCalc.pagoIntencionMax}
              initialPago={negociacion.pago_intencion}
              currentAmount={pagoLive}
              onAmountChange={onAmountChange}
              isValid={calc.isValid}
              isBelowMin={calc.isBelowMin}
              isAboveMax={calc.isAboveMax}
              fechaCompromiso={fechaCompromiso}
              onFechaCompromisoChange={setFechaCompromiso}
              defaultZero={ZERO_PAGO_STATUSES.includes(status)}
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
                originacion_vehiculo={cliente.originacion_vehiculo}
              />
            </div>
          </div>

          <ClienteSeguimientoPanel
            intentos={negociacion.intentos}
            maxIntentos={RULES.MAX_INTENTOS}
            updatedAt={negociacion.updated_at}
            exportedAt={negociacion.exported_at}
            entries={actividadLog}
          />

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

          {status === "cerrado" ? (
            <div className="space-y-2">
              <Label htmlFor="motivo-cierre">
                Motivo de cierre{" "}
                <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="motivo-cierre"
                value={motivoCierre}
                onChange={(e) => setMotivoCierre(e.target.value)}
                rows={3}
                required
                className={cn(
                  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !motivoCierre.trim() && "border-amber-400 focus-visible:ring-amber-400"
                )}
                placeholder="Explicá por qué se cierra el caso (no implica pago)…"
              />
              {!motivoCierre.trim() ? (
                <p className="text-xs text-amber-700">Requerido para cerrar el caso.</p>
              ) : null}
            </div>
          ) : null}

          {isEnPagoFlow ? (
            <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Flujo de pago</p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Solo gestores y admins pueden avanzar a Firmado o Aplicado.
                </p>
              </div>

              {/* Progreso visual */}
              <div className="flex items-center gap-2">
                {(["pendiente_firma", "firmado", "aplicado"] as CallStatus[]).map((st, i, arr) => {
                  const idx = arr.indexOf(status);
                  const done = i < idx;
                  const active = i === idx;
                  return (
                    <div key={st} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          active
                            ? "bg-emerald-600 text-white"
                            : done
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          active ? "font-semibold text-emerald-900" : "text-muted-foreground"
                        )}
                      >
                        {STATUS[st].label}
                      </span>
                      {i < arr.length - 1 ? (
                        <span className="text-muted-foreground">→</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Avanzar etapa (solo gestor/admin — la validación final es en el server) */}
              {status !== "aplicado" ? (
                <div className="flex gap-2">
                  {status === "pendiente_firma" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus("firmado")}
                    >
                      Marcar como Firmado
                    </Button>
                  ) : null}
                  {status === "firmado" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() => setStatus("aplicado")}
                    >
                      Marcar como Aplicado
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs font-medium text-emerald-700">
                  ✓ Caso aplicado — proceso completado.
                </p>
              )}

              {/* Fecha de pago */}
              <div className="space-y-1.5">
                <Label htmlFor="fecha-pago" className="text-sm font-medium">
                  Fecha de pago <span className="text-destructive">*</span>
                </Label>
                <input
                  id="fecha-pago"
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !fechaPago.trim() && "border-amber-400 focus-visible:ring-amber-400"
                  )}
                />
                {!fechaPago.trim() ? (
                  <p className="text-xs text-amber-700">
                    Ingresá la fecha en que el cliente realizó el pago.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas de la llamada</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
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

        <aside className="min-w-0 space-y-6">
          <section className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 p-6 text-white shadow-md">
            <p className="text-sm font-medium text-white/90">Saldo a regularizar</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {mx(calc.saldoAReestructurar)}
            </p>
            <p className="mt-2 text-xs text-white/75">
              Saldo vencido + semanalidad siguiente
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
            plazoRemanente={cliente.plazo_remanente}
            fechaCompromisoIso={fechaCompromiso}
            calc={calc}
          />
          <ClienteCommsPanel
            cliente={{
              nombre: cliente.nombre,
              af: cliente.af,
              telefono: cliente.telefono,
              plataforma: cliente.plataforma,
            }}
            plazoRemanente={cliente.plazo_remanente}
            fechaCompromisoIso={fechaCompromiso}
            status={status}
            fechaCompromisoLabel={fechaCompromisoLabel}
            calc={calc}
          />
        </aside>
      </div>
    </div>
  );
}
