"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import type { CallStatus } from "@/lib/types";

function exportHref(status: CallStatus | null) {
  const base = "/api/export-csv";
  if (!status) return base;
  return `${base}?status=${encodeURIComponent(status)}`;
}

export default function GestorExportarPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Exportar CSV</h1>
        <p className="text-muted-foreground">
          Descargá la vista <code className="rounded bg-muted px-1 py-0.5 text-xs">v_clientes_dashboard</code>{" "}
          con columnas de negocio y montos calculados (misma lógica que la calculadora) para el estado
          elegido. El archivo trae BOM UTF-8 para abrir bien en Excel.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Por estado</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" size="sm" asChild>
            <a href={exportHref(null)}>Todos</a>
          </Button>
          {STATUS_ORDER.map((s) => (
            <Button key={s} variant="outline" size="sm" asChild>
              <a href={exportHref(s)}>{STATUS[s].label}</a>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Filtrar por carga (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Pegá el <code className="rounded bg-background px-1">upload_id</code> (UUID) desde Supabase o
          desde el historial en Cargar CSV, luego abrí el enlace.
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
