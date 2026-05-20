"use client";

import { pdf } from "@react-pdf/renderer";
import { Download, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { AceptadoCerradoRow, DailyReport, DailyReportSnapshot } from "@/app/api/daily-report/route";
import { ReporteDiarioPdfDocument } from "@/components/reporte-diario-pdf-document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageStatus = "idle" | "loading" | "saving" | "downloading" | "error";

// Fecha de hoy en hora México CDT (UTC-5)
const TODAY = (() => {
  const d = new Date();
  const mxOffset = 5 * 60 * 60 * 1000;
  return new Date(d.getTime() - mxOffset).toISOString().slice(0, 10);
})();

function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDateEs(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d
    .toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ── Pills config ────────────────────────────────────────────────────────────
const TOTAL_KEY = "total";

const PILL_STATUS_KEYS = [
  "listo_contactar",
  "sin_respuesta",
  "en_negociacion",
  "aceptado",
  "necesita_revision",
] as const;

const PILL_LABELS: Record<string, string> = {
  listo_contactar:   "Sin contacto",
  sin_respuesta:     "Sin respuesta",
  en_negociacion:    "En negociación",
  aceptado:          "Aceptados",
  necesita_revision: "En revisión",
  rechazado:         "Rechazados",
};

const PILL_COLORS: Record<string, string> = {
  listo_contactar:   "text-slate-700",
  sin_respuesta:     "text-amber-700",
  en_negociacion:    "text-blue-700",
  aceptado:          "text-green-700",
  necesita_revision: "text-purple-700",
  rechazado:         "text-red-700",
};

const PILL_BG: Record<string, string> = {
  listo_contactar:   "bg-slate-50 border-slate-200",
  sin_respuesta:     "bg-amber-50 border-amber-200",
  en_negociacion:    "bg-blue-50 border-blue-200",
  aceptado:          "bg-green-50 border-green-200",
  necesita_revision: "bg-purple-50 border-purple-200",
  rechazado:         "bg-red-50 border-red-200",
};

// Statuses that count as "llamadas activas"
const ACTIVE_STATUSES = ["sin_respuesta", "en_negociacion", "aceptado", "necesita_revision", "rechazado"] as const;

// ── Acuerdos table ──────────────────────────────────────────────────────────
function AcCerTableUI({
  rows,
  title,
  emptyMsg,
}: {
  rows: AceptadoCerradoRow[];
  title: string;
  emptyMsg: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      </div>
    );
  }

  const totalSaldo   = rows.reduce((s, r) => s + r.saldo_reestructurar, 0);
  const totalPago    = rows.reduce((s, r) => s + r.pago_intencion, 0);
  const totalCond    = rows.reduce((s, r) => s + r.condonacion, 0);
  const totalDeuda   = rows.reduce((s, r) => s + r.deuda_post_condonacion, 0);
  const totalCC      = rows.reduce((s, r) => s + r.cc_aplicado, 0);
  const totalBalloon = rows.reduce((s, r) => s + r.balloon, 0);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Cliente</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">AF</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Plat.</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Saldo</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Pago int.</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Condonación</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Deuda post cond.</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">CC Aplicado</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balloon</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isAceptado = r.status === "aceptado";
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.af}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.plataforma ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(r.saldo_reestructurar)}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(r.pago_intencion)}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-700">{fmtCurrency(r.condonacion)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtCurrency(r.deuda_post_condonacion)}</td>
                  <td className="px-3 py-2 text-right text-blue-700">{fmtCurrency(r.cc_aplicado)}</td>
                  <td className="px-3 py-2 text-right text-amber-700">{r.balloon > 0 ? fmtCurrency(r.balloon) : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={isAceptado
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"}
                    >
                      {isAceptado ? "Aceptado" : "Cerrado"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-semibold">
              <td className="px-3 py-2" colSpan={3}>Total — {rows.length} acuerdos</td>
              <td className="px-3 py-2 text-right">{fmtCurrency(totalSaldo)}</td>
              <td className="px-3 py-2 text-right">{fmtCurrency(totalPago)}</td>
              <td className="px-3 py-2 text-right text-green-700">{fmtCurrency(totalCond)}</td>
              <td className="px-3 py-2 text-right">{fmtCurrency(totalDeuda)}</td>
              <td className="px-3 py-2 text-right text-blue-700">{fmtCurrency(totalCC)}</td>
              <td className="px-3 py-2 text-right text-amber-700">{totalBalloon > 0 ? fmtCurrency(totalBalloon) : "—"}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main form ───────────────────────────────────────────────────────────────
export function ReporteDiarioForm() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [actividades, setActividades] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [snapshot, setSnapshot] = useState<DailyReportSnapshot | null>(null);

  // ── Load: siempre datos vivos + textos guardados si existen ───────────────
  const loadReport = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/daily-report?date=${TODAY}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSnapshot(json.snapshot as DailyReportSnapshot);
      if (json.savedTexts) {
        setActividades((json.savedTexts.actividades ?? []).join("\n"));
        setNextSteps((json.savedTexts.next_steps ?? []).join("\n"));
        setSavedAt(json.savedTexts.saved_at ?? null);
      }
      setStatus("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error desconocido");
      setStatus("error");
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  // ── Save: guarda solo actividades + next_steps ────────────────────────────
  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const body = {
        report_date: TODAY,
        actividades: actividades.split("\n").map(s => s.trim()).filter(Boolean),
        next_steps:  nextSteps.split("\n").map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const report = json.report as DailyReport;
      setSavedAt(report.generated_at);
      setStatus("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
      setStatus("error");
    }
  }

  // ── Download PDF: datos vivos + timestamp del momento de exportar ─────────
  async function handleDownload() {
    if (!snapshot) return;
    setStatus("downloading");
    try {
      const exportedAt = new Date().toISOString();
      const report: DailyReport = {
        id: "preview",
        report_date: TODAY,
        generated_at: exportedAt,
        generated_by: null,
        horario_inicio: "",
        horario_fin: "",
        actividades: actividades.split("\n").map(s => s.trim()).filter(Boolean),
        next_steps:  nextSteps.split("\n").map(s => s.trim()).filter(Boolean),
        snapshot_data: snapshot,
      };
      const blob = await pdf(<ReporteDiarioPdfDocument report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-diario-${TODAY}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al generar PDF");
      setStatus("error");
    }
  }

  const isBusy = status === "loading" || status === "saving" || status === "downloading";

  if (status === "loading" && !snapshot) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Cargando datos del día…
      </div>
    );
  }

  // ── Compute llamadas activas ──────────────────────────────────────────────
  const totalLlamadasActivas = snapshot
    ? ACTIVE_STATUSES.reduce((s, k) => s + (snapshot.por_status[k] ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">

      {/* ── Header banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <p className="text-base font-semibold">{formatDateEs(TODAY)}</p>
          <p className="text-xs text-muted-foreground">
            Datos en vivo · {savedAt
              ? `Texto guardado: ${new Date(savedAt).toLocaleString("es-MX")}`
              : "Textos no guardados aún"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadReport} disabled={isBusy}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", status === "loading" && "animate-spin")} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isBusy}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {status === "saving" ? "Guardando…" : "Guardar reporte"}
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={isBusy || !snapshot}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {status === "downloading" ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      {snapshot && (
        <div className="space-y-6">

          {/* ── 1. Status pills ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen por estado
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Total */}
              <div className="flex flex-col items-center rounded-md border bg-card px-4 py-2">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{snapshot.total}</span>
              </div>
              {/* Sin contacto */}
              <div className={cn("flex flex-col items-center rounded-md border px-4 py-2", PILL_BG["listo_contactar"])}>
                <span className="text-[11px] text-muted-foreground">{PILL_LABELS["listo_contactar"]}</span>
                <span className={cn("text-2xl font-bold", PILL_COLORS["listo_contactar"])}>
                  {snapshot.por_status["listo_contactar"] ?? 0}
                </span>
              </div>
              {/* Llamadas activas — total + breakdown */}
              <div className="flex items-stretch gap-1 rounded-md border bg-card px-1 py-1">
                <div className="flex flex-col items-center justify-center rounded px-3 py-1 bg-muted/40">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Llamadas activas</span>
                  <span className="text-2xl font-bold">{totalLlamadasActivas}</span>
                </div>
                <div className="mx-1 w-px bg-border" />
                <div className="flex items-center gap-1 px-1">
                  {ACTIVE_STATUSES.map((k) => (
                    <div key={k} className={cn("flex flex-col items-center rounded px-2 py-1", PILL_BG[k])}>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{PILL_LABELS[k]}</span>
                      <span className={cn("text-lg font-bold", PILL_COLORS[k])}>
                        {snapshot.por_status[k] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Indicadores ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <div className="rounded-lg border bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                Condonación del día
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{fmtCurrency(snapshot.condonacion_hoy)}</p>
              <p className="mt-1 text-xs text-amber-600/80">Aceptados hoy</p>
            </div>
            <div className="rounded-lg border bg-green-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-green-700">
                Condonación Aceptados
              </p>
              <p className="mt-1 text-2xl font-bold text-green-800">{fmtCurrency(snapshot.condonacion_aceptados)}</p>
              <p className="mt-1 text-xs text-green-600/80">Comprometidos (acumulado)</p>
            </div>
            <div className="rounded-lg border bg-green-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-green-700">
                Prom. Condonación
              </p>
              <p className="mt-1 text-2xl font-bold text-green-800">{fmtCurrency(snapshot.prom_condonacion ?? 0)}</p>
              <p className="mt-1 text-xs text-green-600/80">Promedio por acuerdo</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Prom. Deuda Post Cond.
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{fmtCurrency(snapshot.prom_deuda_post_cond ?? 0)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Promedio · {snapshot.prom_csc_con_balloon > 0 ? `CSC c/balloon: ${fmtCurrency(snapshot.prom_csc_con_balloon)}` : "Sin balloon"}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Cerrados
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{snapshot.count_cerrados ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Casos cerrados sin pago</p>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-700">
                Pagado
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-800">{fmtCurrency(snapshot.monto_pagado ?? 0)}</p>
              <p className="mt-1 text-xs text-blue-600/80">
                Pago de intención · {snapshot.count_pagados ?? 0} cliente{(snapshot.count_pagados ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-lg border bg-indigo-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">
                Conversión
              </p>
              <p className="mt-1 text-3xl font-bold text-indigo-800">{snapshot.conversion_pct}%</p>
              <p className="mt-1 text-xs text-indigo-600/80">
                Pagados / (Acept. + Pagados) ·{" "}
                {(snapshot.por_status["aceptado"] ?? 0) + (snapshot.count_pagados ?? 0)} acuerdos
              </p>
            </div>
          </div>

          {/* Pronóstico */}
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pronóstico llamadas mañana
              </p>
              <p className="text-2xl font-bold">{snapshot.pronostico_llamadas}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Sin contacto + Sin respuesta
            </p>
          </div>

          {/* ── 3. Acuerdos tables ── */}
          <AcCerTableUI
            rows={snapshot.aceptados_hoy}
            title="Acuerdos aceptados hoy"
            emptyMsg="Sin acuerdos aceptados hoy."
          />
          <AcCerTableUI
            rows={snapshot.todos_aceptados_cerrados}
            title="Acuerdos totales — Aceptados y Cerrados"
            emptyMsg="Sin acuerdos aceptados o cerrados."
          />
        </div>
      )}

      {/* ── 4. Manual inputs ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Actividades del día</label>
          <p className="text-xs text-muted-foreground">Una actividad por línea</p>
          <textarea
            value={actividades}
            onChange={(e) => setActividades(e.target.value)}
            placeholder={"Mañana completa de práctica: role plays simulando diferentes escenarios\nEntrenamiento para farmers y hunters\nCorrección de errores en calculadora"}
            disabled={isBusy}
            rows={7}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Próximos pasos</label>
          <p className="text-xs text-muted-foreground">Un paso por línea</p>
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            placeholder={"Monitoreo continuo de cualquier problema operativo\nHorario de agentes: 10:00 a 19:00 hs\nSeguimiento de acuerdos pendientes"}
            disabled={isBusy}
            rows={7}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {snapshot && (
        <p className="text-xs text-muted-foreground">
          Los datos siempre son en vivo. El PDF lleva el timestamp del momento de exportación.
        </p>
      )}
    </div>
  );
}
