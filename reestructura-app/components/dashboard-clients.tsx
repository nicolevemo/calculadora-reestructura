"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AssigneeSelect } from "@/components/assignee-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignableAgent } from "@/lib/assignable-agents";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import { isClienteExportado } from "@/lib/cliente-export";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { CallStatus, ClienteDashboardRow } from "@/lib/types";

type StatusFilter = CallStatus | "all";
type AssignFilter = "all" | "unassigned" | "mine";

function fmtApi(u: boolean | null | undefined, d: boolean | null | undefined) {
  const parts: string[] = [];
  if (u) parts.push("Uber");
  if (d) parts.push("DiDi");
  return parts.length ? parts.join(" · ") : "—";
}

export function DashboardClients({
  greeting,
  rows,
  showGestorHint,
  canExportCsv = false,
  canDelete = false,
  assignableAgents = [],
  canAssign = false,
  currentUserId = null,
}: {
  greeting: React.ReactNode;
  rows: ClienteDashboardRow[];
  showGestorHint?: boolean;
  /** Gestor/admin: selección + export POST que marca `exported_at` */
  canExportCsv?: boolean;
  /** Solo admin: mostrar botón de eliminar cliente */
  canDelete?: boolean;
  assignableAgents?: AssignableAgent[];
  canAssign?: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>(() =>
    canAssign ? "all" : currentUserId ? "mine" : "all"
  );
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [assignErr, setAssignErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = rows.length;
    const count = (s: CallStatus) =>
      rows.filter((r) => (r.status ?? "listo_contactar") === s).length;
    return {
      total,
      listo_contactar: count("listo_contactar"),
      sin_respuesta: count("sin_respuesta"),
      en_negociacion: count("en_negociacion"),
      aceptado: count("aceptado"),
      rechazado: count("rechazado"),
      necesita_revision: count("necesita_revision"),
      cerrado: count("cerrado"),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (status !== "all") {
      r = r.filter((row) => (row.status ?? "listo_contactar") === status);
    }
    if (assignFilter === "unassigned") {
      r = r.filter((row) => !row.assigned_to);
    } else if (assignFilter === "mine" && currentUserId) {
      r = r.filter((row) => row.assigned_to === currentUserId);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      r = r.filter(
        (row) =>
          row.nombre.toLowerCase().includes(needle) ||
          row.af.toLowerCase().includes(needle)
      );
    }
    return r;
  }, [rows, status, assignFilter, currentUserId, q]);

  const exportableFiltered = useMemo(
    () => filtered.filter((row) => !isClienteExportado(row.exported_at)),
    [filtered]
  );

  useEffect(() => {
    const allowed = new Set(exportableFiltered.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [exportableFiltered]);

  const allVisibleSelected =
    exportableFiltered.length > 0 &&
    exportableFiltered.every((r) => selectedIds.has(r.id));

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const vis = exportableFiltered.map((r) => r.id);
      const allSel = vis.length > 0 && vis.every((id) => next.has(id));
      if (allSel) vis.forEach((id) => next.delete(id));
      else vis.forEach((id) => next.add(id));
      return next;
    });
  }, [exportableFiltered]);

  const toggleOne = useCallback((id: string, exported: boolean) => {
    if (exported) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(exportableFiltered.map((r) => r.id)));
  }, [exportableFiltered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exportSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setExportBusy(true);
    setExportErr(null);
    try {
      const res = await fetch("/api/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteIds: ids }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = "reestructura-export-seleccion.csv";
      const m = cd?.match(/filename="([^"]+)"/i);
      if (m?.[1]) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSelectedIds(new Set());
      router.refresh();
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExportBusy(false);
    }
  }, [router, selectedIds]);

  const filterButtons: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: stats.total },
    ...STATUS_ORDER.map((id) => ({
      id,
      label: STATUS[id].label,
      count: stats[id],
    })),
  ];

  const handleDelete = useCallback(async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar a ${nombre} de la base de datos? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? "Error al eliminar");
      } else {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }, [router]);

  /** Checkbox (solo gestor) + datos + Exportado (todos) + Eliminar (solo admin) */
  const colSpan = canExportCsv ? 13 : 12;

  const assignFilterButtons: { id: AssignFilter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "unassigned", label: "Sin asignar" },
    { id: "mine", label: "Mis clientes" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">{greeting}</div>

      {showGestorHint ? (
        <p className="text-sm text-muted-foreground">
          ¿Necesitás cargar el shortlist?{" "}
          <Link href="/gestor/cargar" className="font-medium text-primary underline-offset-4 hover:underline">
            Ir a Cargar CSV
          </Link>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Listo para contactar" value={stats.listo_contactar} />
        <StatCard label="En negociación" value={stats.en_negociacion} />
        <StatCard label="Aceptados" value={stats.aceptado} />
        <StatCard label="Sin respuesta" value={stats.sin_respuesta} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={status === b.id ? "default" : "outline"}
              onClick={() => setStatus(b.id)}
            >
              {b.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">({b.count})</span>
            </Button>
          ))}
        </div>
        <div className="w-full max-w-sm">
          <Input
            placeholder="Buscar por nombre o AF…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar por nombre o AF"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {assignFilterButtons.map((button) => (
          <Button
            key={button.id}
            type="button"
            size="sm"
            variant={assignFilter === button.id ? "secondary" : "outline"}
            onClick={() => setAssignFilter(button.id)}
          >
            {button.label}
          </Button>
        ))}
      </div>

      {assignErr ? <p className="text-sm text-destructive">{assignErr}</p> : null}

      {canExportCsv ? (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <p className="text-sm text-muted-foreground">
            Exportá solo los clientes seleccionados (respeta filtros y búsqueda). Se marca la fecha de
            exportación en cada uno y quedan bloqueados para edición.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={filtered.length === 0} onClick={selectAllFiltered}>
              Seleccionar todos en vista
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={selectedIds.size === 0} onClick={clearSelection}>
              Limpiar selección
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={exportBusy || selectedIds.size === 0}
              onClick={() => void exportSelected()}
            >
              {exportBusy ? "Exportando…" : `Exportar CSV (${selectedIds.size})`}
            </Button>
          </div>
          {exportErr ? <p className="w-full text-sm text-destructive">{exportErr}</p> : null}
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {canExportCsv ? (
                <TableHead className="w-10 p-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleccionar o deseleccionar todos los visibles"
                  />
                </TableHead>
              ) : null}
              <TableHead>Cliente</TableHead>
              <TableHead>AF</TableHead>
              <TableHead className="text-right">Saldo vencido</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>API</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Compromiso</TableHead>
              <TableHead className="text-right">Pago intención</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead>Exportado</TableHead>
              {canDelete ? <TableHead className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  No hay clientes con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const exported = isClienteExportado(r.exported_at);
                const aceptadoExportado =
                  (r.status ?? "") === "aceptado" && exported;
                const openDetail = () => router.push(`/cliente/${r.id}`);
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {canExportCsv ? (
                      <TableCell
                        className="w-10 p-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleOne(r.id, exported)}
                          disabled={exported}
                          aria-label={`Seleccionar ${r.nombre}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell
                      className="max-w-[180px] truncate font-medium"
                      onClick={openDetail}
                    >
                      {r.nombre}
                    </TableCell>
                    <TableCell className="font-mono text-xs" onClick={openDetail}>
                      {r.af}
                    </TableCell>
                    <TableCell className="text-right tabular-nums" onClick={openDetail}>
                      {fmtMoney(r.adeudo)}
                    </TableCell>
                    <TableCell className="text-muted-foreground" onClick={openDetail}>
                      {r.bucket ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground" onClick={openDetail}>
                      {r.plataforma ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" onClick={openDetail}>
                      {fmtApi(r.api_uber, r.api_didi)}
                    </TableCell>
                    <TableCell className="min-w-[11rem]" onClick={(e) => e.stopPropagation()}>
                      {r.negociacion_id ? (
                        <AssigneeSelect
                          clienteId={r.id}
                          negociacionId={r.negociacion_id}
                          assignedTo={r.assigned_to}
                          assignedToName={r.assigned_to_name}
                          agents={assignableAgents}
                          canAssign={canAssign}
                          disabled={exported}
                          onError={setAssignErr}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={openDetail}>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm" onClick={openDetail}>
                      {fmtDate(r.fecha_compromiso)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm" onClick={openDetail}>
                      {fmtMoney(r.pago_intencion)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" onClick={openDetail}>
                      {fmtDate(r.last_activity_at)}
                    </TableCell>
                    <TableCell className="text-sm align-top">
                      {exported ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100">
                            Exportado
                          </span>
                          <span className="block text-xs text-muted-foreground">{fmtDate(r.exported_at)}</span>
                          {aceptadoExportado ? (
                            <span className="inline-flex rounded border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100">
                              Aceptado · exportado
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {canDelete ? (
                      <TableCell className="w-12 p-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === r.id}
                          onClick={() => void handleDelete(r.id, r.nombre)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: hacé clic en una fila para abrir el detalle del cliente.{" "}
        {canExportCsv ? "Usá la casilla para seleccionar sin abrir el detalle. " : null}
        {canDelete ? "El ícono de papelera elimina el cliente definitivamente." : null}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
