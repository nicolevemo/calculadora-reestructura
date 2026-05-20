"use client";

import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AssigneeSelect } from "@/components/assignee-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
// "all" | "unassigned" | "mine" | <agent-uuid>
type AssignFilter = string;

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
  const defaultAssignFilter: AssignFilter = canAssign ? "all" : currentUserId ? "mine" : "all";
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>(defaultAssignFilter);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [assignErr, setAssignErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** Counts over ALL rows — used for option labels in dropdowns */
  const totalStats = useMemo(() => {
    const count = (s: string) =>
      rows.filter((r) => (r.status ?? "listo_contactar") === s).length;
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, count(s)])
    ) as Record<string, number>;
    const byAgent = Object.fromEntries(
      assignableAgents.map((a) => [a.id, rows.filter((r) => r.assigned_to === a.id).length])
    );
    return {
      total: rows.length,
      byStatus,
      byAgent,
      unassigned: rows.filter((r) => !r.assigned_to).length,
      duplicates: rows.filter((r) => r.is_duplicate).length,
    };
  }, [rows, assignableAgents]);

  const filtered = useMemo(() => {
    let r = rows;
    if (status !== "all") {
      r = r.filter((row) => (row.status ?? "listo_contactar") === status);
    }
    if (assignFilter === "unassigned") {
      r = r.filter((row) => !row.assigned_to);
    } else if (assignFilter === "mine" && currentUserId) {
      r = r.filter((row) => row.assigned_to === currentUserId);
    } else if (assignFilter !== "all") {
      r = r.filter((row) => row.assigned_to === assignFilter);
    }
    if (onlyDuplicates) {
      r = r.filter((row) => row.is_duplicate);
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
  }, [rows, status, assignFilter, currentUserId, onlyDuplicates, q]);

  /** Stats computed from the currently filtered rows — power the stat cards */
  const filteredStats = useMemo(() => {
    const count = (s: string) =>
      filtered.filter((r) => (r.status ?? "listo_contactar") === s).length;
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, count(s)])
    ) as Record<string, number>;
    return { total: filtered.length, byStatus };
  }, [filtered]);

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

  const hasActiveFilters =
    status !== "all" || assignFilter !== defaultAssignFilter || onlyDuplicates || q.trim() !== "";

  const clearFilters = useCallback(() => {
    setStatus("all");
    setAssignFilter(defaultAssignFilter);
    setOnlyDuplicates(false);
    setQ("");
  }, [defaultAssignFilter]);

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

      {/* ── Stats (reflejan el filtro activo) ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Mostrando" value={filteredStats.total} highlight={hasActiveFilters} />
        <StatCard label="Sin contacto"  value={filteredStats.byStatus["listo_contactar"] ?? 0} />
        <StatCard label="En negociación" value={filteredStats.byStatus["en_negociacion"] ?? 0} />
        <StatCard label="Aceptados"      value={filteredStats.byStatus["aceptado"] ?? 0} />
        <StatCard label="Sin respuesta"  value={filteredStats.byStatus["sin_respuesta"] ?? 0} />
        <StatCard
          label="En pago/firma"
          value={
            (filteredStats.byStatus["pendiente_firma"] ?? 0) +
            (filteredStats.byStatus["firmado"] ?? 0) +
            (filteredStats.byStatus["aplicado"] ?? 0)
          }
        />
      </div>

      {/* ── Filtros compactos ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status */}
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder="Estado: Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados ({totalStats.total})</SelectItem>
            <div className="mx-1 my-1 h-px bg-border" />
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Gestión</div>
            <SelectGroup>
              {(["listo_contactar","sin_respuesta","en_negociacion","aceptado","rechazado","necesita_revision","cerrado"] as CallStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS[s].label} ({totalStats.byStatus[s] ?? 0})
                </SelectItem>
              ))}
            </SelectGroup>
            <div className="mx-1 my-1 h-px bg-border" />
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Flujo de pago</div>
            <SelectGroup>
              {(["pendiente_firma","firmado","aplicado"] as CallStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS[s].label} ({totalStats.byStatus[s] ?? 0})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Asignado */}
        <Select value={assignFilter} onValueChange={setAssignFilter}>
          <SelectTrigger className="h-9 w-[220px] text-sm">
            <SelectValue placeholder="Asignado: Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los agentes</SelectItem>
            <SelectItem value="unassigned">Sin asignar ({totalStats.unassigned})</SelectItem>
            {currentUserId ? (
              <SelectItem value="mine">Mis clientes</SelectItem>
            ) : null}
            {assignableAgents.length > 0 ? (
              <>
                <div className="mx-1 my-1 h-px bg-border" />
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Agentes</div>
                <SelectGroup>
                  {assignableAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name} ({totalStats.byAgent[a.id] ?? 0})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            ) : null}
          </SelectContent>
        </Select>

        {/* Búsqueda */}
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input
            className="h-9 text-sm"
            placeholder="Buscar por nombre o AF…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar por nombre o AF"
          />
        </div>

        {/* Duplicados */}
        {totalStats.duplicates > 0 ? (
          <Button
            type="button"
            size="sm"
            variant={onlyDuplicates ? "destructive" : "outline"}
            onClick={() => setOnlyDuplicates((v) => !v)}
            className="gap-1.5"
          >
            ⚠ Duplicados ({totalStats.duplicates})
          </Button>
        ) : null}

        {/* Limpiar filtros */}
        {hasActiveFilters ? (
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        ) : null}
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
                const isDuplicate = Boolean(r.is_duplicate);
                const openDetail = () => router.push(`/cliente/${r.id}`);
                return (
                  <TableRow
                    key={r.id}
                    className={isDuplicate ? "cursor-pointer bg-orange-50/60 hover:bg-orange-50 dark:bg-orange-950/20" : "cursor-pointer hover:bg-muted/50"}
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
                      className="max-w-[180px] font-medium"
                      onClick={openDetail}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate">{r.nombre}</span>
                        {isDuplicate ? (
                          <span className="inline-flex w-fit rounded border border-orange-300 bg-orange-50 px-1 py-0 text-[10px] font-semibold text-orange-700 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                            AF duplicado
                          </span>
                        ) : null}
                      </div>
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
                          disabled={exported && !canDelete}
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

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
