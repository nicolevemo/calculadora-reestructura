"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignableAgent } from "@/lib/assignable-agents";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__unassigned__";

type Props = {
  clienteId: string;
  negociacionId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  agents: AssignableAgent[];
  canAssign: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  onError?: (message: string) => void;
};

export function AssigneeSelect({
  clienteId,
  negociacionId,
  assignedTo,
  assignedToName,
  agents,
  canAssign,
  disabled = false,
  className,
  triggerClassName,
  onError,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const value = assignedTo ?? UNASSIGNED;

  const label =
    assignedToName?.trim() ||
    agents.find((agent) => agent.id === assignedTo)?.full_name ||
    "Sin asignar";

  async function onValueChange(next: string) {
    if (!canAssign || disabled || pending) return;
    const nextAssignedTo = next === UNASSIGNED ? null : next;
    if (nextAssignedTo === assignedTo) return;

    setPending(true);
    try {
      const res = await fetch("/api/negociacion/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          negociacionId,
          assignedTo: nextAssignedTo,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onError?.(json.error ?? "No se pudo actualizar la asignación.");
        return;
      }
      router.refresh();
    } catch {
      onError?.("No se pudo actualizar la asignación.");
    } finally {
      setPending(false);
    }
  }

  if (!canAssign) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)} title={label}>
        {label}
      </span>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || pending}>
      <SelectTrigger
        aria-label="Agente asignado"
        className={cn("h-8 min-w-[10rem] text-xs sm:min-w-[12rem] sm:text-sm", triggerClassName)}
      >
        <SelectValue placeholder="Sin asignar">{pending ? "Guardando…" : label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
