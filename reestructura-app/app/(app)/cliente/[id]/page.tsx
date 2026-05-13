import { notFound, redirect } from "next/navigation";

import { ClienteWorkspace } from "@/components/cliente/cliente-workspace";
import { STATUS_ORDER } from "@/lib/constants";
import { isClienteExportado } from "@/lib/cliente-export";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";
import type { CallStatus } from "@/lib/types";

function isCallStatus(s: string | null | undefined): s is CallStatus {
  return !!s && (STATUS_ORDER as readonly string[]).includes(s);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numNullable(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function ClientePage({ params }: { params: { id: string } }) {
  const { id } = params;

  if (isDevAuthBypass() && !isDevServerDataOverride()) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-amber-800">
          Para abrir el detalle de un cliente en modo bypass local necesitás{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data: cliente, error: e1 } = await supabase
    .from("clientes")
    .select(
      "id, af, nombre, telefono, vehiculo, plataforma, bucket, adeudo, semana, plazo_remanente, pago_en_dia, monto_pago_dia, api_uber, api_didi, ingresos_api, viajes_api, ci, energia_adicional, origination_date, comments_originales"
    )
    .eq("id", id)
    .single();

  if (e1 || !cliente) notFound();

  const { data: neg, error: e2 } = await supabase
    .from("negociaciones")
    .select(
      "id, cliente_id, status, intentos, pago_intencion, fecha_compromiso, motivo_rechazo, notes, updated_at, bono_pronto_pago, exported_at"
    )
    .eq("cliente_id", id)
    .maybeSingle();

  if (e2 || !neg || !isCallStatus(neg.status as string)) notFound();
  if (isClienteExportado(neg.exported_at as string | null)) {
    redirect("/dashboard");
  }

  const negociacion = {
    id: neg.id as string,
    cliente_id: neg.cliente_id as string,
    status: neg.status as CallStatus,
    intentos: Math.min(5, Math.max(0, Math.floor(num(neg.intentos, 0)))),
    pago_intencion: numNullable(neg.pago_intencion),
    fecha_compromiso: (neg.fecha_compromiso as string | null) ?? null,
    motivo_rechazo: (neg.motivo_rechazo as string | null) ?? null,
    notes: (neg.notes as string | null) ?? null,
    updated_at: neg.updated_at as string,
    bono_pronto_pago: Boolean(neg.bono_pronto_pago),
  };

  const viajesRaw = numNullable(cliente.viajes_api);

  const clienteShape = {
    id: cliente.id as string,
    af: String(cliente.af),
    nombre: String(cliente.nombre),
    telefono: (cliente.telefono as string | null) ?? null,
    vehiculo: (cliente.vehiculo as string | null) ?? null,
    plataforma: (cliente.plataforma as string | null) ?? null,
    bucket: (cliente.bucket as string | null) ?? null,
    adeudo: num(cliente.adeudo),
    semana: num(cliente.semana),
    plazo_remanente: Math.max(1, Math.floor(num(cliente.plazo_remanente, 1))),
    pago_en_dia: Boolean(cliente.pago_en_dia),
    monto_pago_dia: num(cliente.monto_pago_dia, 0),
    api_uber: Boolean(cliente.api_uber),
    api_didi: Boolean(cliente.api_didi),
    ingresos_api: numNullable(cliente.ingresos_api),
    viajes_api: viajesRaw != null ? Math.floor(viajesRaw) : null,
    ci: (cliente.ci as string | null) ?? null,
    energia_adicional: numNullable(cliente.energia_adicional),
    origination_date: (cliente.origination_date as string | null) ?? null,
    comments_originales: (cliente.comments_originales as string | null) ?? null,
  };

  return (
    <ClienteWorkspace
      key={negociacion.updated_at}
      cliente={clienteShape}
      negociacion={negociacion}
    />
  );
}
