import { STATUS } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { CallStatus } from "@/lib/types";

export type ActividadLogEntry = {
  id: number;
  accion: string;
  estado_anterior: CallStatus | null;
  estado_nuevo: CallStatus | null;
  payload: {
    pago_intencion?: number | null;
    intentos?: number | null;
    fecha_compromiso?: string | null;
    assigned_to_anterior?: string | null;
    assigned_to_nuevo?: string | null;
    assigned_at?: string | null;
  } | null;
  created_at: string;
  agente: {
    full_name: string;
    email: string;
  } | null;
};

type Props = {
  intentos: number;
  maxIntentos: number;
  updatedAt: string;
  entries: ActividadLogEntry[];
};

function agentLabel(agente: ActividadLogEntry["agente"]) {
  if (!agente) return "Sistema";
  const name = agente.full_name?.trim();
  if (name) return name;
  return agente.email;
}

function statusLabel(status: CallStatus | null | undefined) {
  if (!status) return "—";
  return STATUS[status]?.label ?? status;
}

export function ClienteSeguimientoPanel({ intentos, maxIntentos, updatedAt, entries }: Props) {
  return (
    <section className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div className="space-y-1">
        <h3 className="font-semibold">Seguimiento</h3>
        <p className="text-muted-foreground">
          Intentos (sin respuesta):{" "}
          <span className="font-mono font-medium text-foreground">{intentos}</span> / {maxIntentos}
        </p>
        <p className="text-xs text-muted-foreground">
          Última actualización del registro: {fmtDateTime(updatedAt)}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Historial de eventos
        </p>
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Aún no hay cambios de estado registrados para este cliente.
          </p>
        ) : (
          <ol className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {entry.accion === "status_change"
                      ? `Estado: ${statusLabel(entry.estado_anterior)} → ${statusLabel(entry.estado_nuevo)}`
                      : entry.accion === "assignment_change"
                        ? "Asignación actualizada"
                        : entry.accion}
                  </p>
                  <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtDateTime(entry.created_at)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Por {agentLabel(entry.agente)}</p>
                {entry.payload?.fecha_compromiso ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Fecha de compromiso: {fmtDate(entry.payload.fecha_compromiso)}
                  </p>
                ) : null}
                {entry.payload?.pago_intencion != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pago de intención:{" "}
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    }).format(Number(entry.payload.pago_intencion))}
                  </p>
                ) : null}
                {entry.payload?.intentos != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Intentos registrados: {entry.payload.intentos}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
