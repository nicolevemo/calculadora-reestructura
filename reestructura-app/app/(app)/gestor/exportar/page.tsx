"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import type { CallStatus } from "@/lib/types";

export default function GestorExportarPage() {
  const [statuses, setStatuses] = useState<CallStatus[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const rangoInvalido = Boolean(from && to && from > to);

  function toggleStatus(s: CallStatus) {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function buildHref() {
    const params = new URLSearchParams();
    if (statuses.length > 0) params.set("status", statuses.join(","));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return `/api/export-csv${qs ? `?${qs}` : ""}`;
  }

  function handleExport() {
    if (rangoInvalido) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }
    setError(null);
    window.location.href = buildHref();
  }

  function handleReset() {
    setStatuses([]);
    setFrom("");
    setTo("");
    setError(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Exportar CSV</h1>
        <p className="text-muted-foreground">
          Elegí los filtros y descargá la vista{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">v_clientes_dashboard</code> con columnas
          de negocio y montos calculados (misma lógica que la calculadora). El archivo trae BOM UTF-8 para
          abrir bien en Excel.
        </p>
      </div>

      <div className="space-y-5 rounded-lg border bg-muted/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Estado</Label>
            {statuses.length > 0 ? (
              <button
                type="button"
                onClick={() => setStatuses([])}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Quitar selección
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => {
              const selected = statuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {STATUS[s].label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {statuses.length === 0
              ? "Sin selección = se exportan todos los estados. Tocá uno o varios para filtrar."
              : `${statuses.length} estado(s) seleccionado(s).`}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Rango de fechas de importación (carga)</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="from" className="text-xs font-normal text-muted-foreground">
                Desde
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to" className="text-xs font-normal text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Filtra por la fecha en que se importaron los clientes. Dejá ambos campos vacíos para incluir
            todas las fechas.
          </p>
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleExport} disabled={rangoInvalido}>
            Exportar CSV
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            Limpiar filtros
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Filtrar por carga específica (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Pegá el <code className="rounded bg-background px-1">upload_id</code> (UUID) desde Supabase o
          desde el historial en Cargar CSV, luego descargá.
        </p>
        <ExportByUploadForm />
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/gestor/cargar" className="font-medium text-primary underline-offset-4 hover:underline">
          ← Volver a Cargar CSV
        </Link>
      </p>
    </div>
  );
}

function ExportByUploadForm() {
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const id = String(fd.get("upload_id") ?? "").trim();
        if (!id) return;
        window.location.href = `/api/export-csv?upload_id=${encodeURIComponent(id)}`;
      }}
    >
      <div className="flex-1 space-y-1">
        <Label htmlFor="upload_id">upload_id</Label>
        <Input id="upload_id" name="upload_id" placeholder="uuid…" className="font-mono text-sm" />
      </div>
      <Button type="submit" variant="secondary">
        Descargar CSV
      </Button>
    </form>
  );
}
