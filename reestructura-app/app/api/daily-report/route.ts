import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/session-profile";
import { RULES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CallStatus } from "@/lib/types";

export type AceptadoCerradoRow = {
  nombre: string;
  af: string;
  plataforma: string | null;
  /** adeudo + semana_siguiente */
  saldo_reestructurar: number;
  pago_intencion: number;
  /** Igual a pago_intencion por las reglas del negocio. */
  condonacion: number;
  /** saldo_reestructurar - 2 * pago_intencion */
  deuda_post_condonacion: number;
  /** min(TOPE_INCREMENTAL_RENTA, deuda_post / plazo) */
  cc_aplicado: number;
  /** Cargo complementario balloon */
  balloon: number;
  /** Plazo remanente del cliente en semanas */
  plazo_remanente: number;
  status: "aceptado" | "cerrado";
  assigned_to_name: string | null;
};

export type DailyReportSnapshot = {
  total: number;
  por_status: Record<CallStatus, number>;
  /** Solo los que cambiaron a 'aceptado' hoy (hora México). */
  aceptados_hoy: AceptadoCerradoRow[];
  /** Todos los clientes actualmente en estado aceptado o cerrado. */
  todos_aceptados_cerrados: AceptadoCerradoRow[];

  // ── Fila 1: condonación del día ───────────────────────────────────
  /** Condonación del día (aceptados HOY). */
  condonacion_hoy: number;

  // ── Fila 2: métricas de aceptados acumulados ──────────────────────
  /** Suma condonación de todos los actualmente 'aceptado'. */
  condonacion_aceptados: number;
  /** Promedio condonación — solo aceptados acumulados. */
  prom_condonacion: number;
  /** Promedio deuda post condonación — solo aceptados. */
  prom_deuda_post_cond: number;
  /** Promedio plazo remanente — solo aceptados. */
  plazo_promedio_aceptados: number;

  // ── Fila 3: cerrados, pagados, conversión ─────────────────────────
  /** Número de clientes en estado 'cerrado'. */
  count_cerrados: number;
  /** Suma pago_intencion de clientes en flujo de pago. */
  monto_pagado: number;
  /** Cantidad de clientes en flujo de pago. */
  count_pagados: number;
  /**
   * Conversión: count_pagados / (count_aceptados + count_pagados) × 100.
   */
  conversion_pct: number;
  pronostico_llamadas: number;
};

export type DailyReport = {
  id: string;
  report_date: string;
  generated_at: string;
  generated_by: string | null;
  horario_inicio: string;
  horario_fin: string;
  actividades: string[];
  next_steps: string[];
  snapshot_data: DailyReportSnapshot;
};

/**
 * UTC range for a Mexico City day (CDT = UTC-5 Mar–Oct, CST = UTC-6 Nov–Feb).
 * Returns [startISO, endISO] in UTC.
 */
function mexicoDayUTCRange(dateStr: string): [string, string] {
  // México CDT (abr–oct) = UTC-5  →  medianoche MX = T05:00Z
  // México CST (nov–mar) = UTC-6  →  medianoche MX = T06:00Z
  // Usamos T05:00Z como inicio (CDT, cubre may–oct) y T07:00Z como fin del día siguiente
  // para no perder registros cuando el servidor corre en UTC y hay drift de segundos.
  const start = `${dateStr}T05:00:00.000Z`;
  const nextDay = new Date(`${dateStr}T12:00:00Z`);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = nextDay.toISOString().slice(0, 10);
  const end = `${nextDateStr}T07:00:00.000Z`;
  return [start, end];
}

function toAceptadoCerradoRow(
  r: {
    pago_intencion: number | null;
    status: string | null;
    assigned_to_name: string | null;
  },
  cliente: {
    af: string;
    nombre: string;
    adeudo: number;
    semana_siguiente: number;
    plataforma: string | null;
    plazo_remanente: number;
  }
): AceptadoCerradoRow {
  const pi = Number(r.pago_intencion ?? 0);
  const saldo = Number(cliente.adeudo) + Number(cliente.semana_siguiente);
  const deuda_post = Math.max(0, saldo - pi - pi); // saldo - pago - condonacion
  const plazo = Math.max(1, Number(cliente.plazo_remanente));
  const csc_teorico = deuda_post / plazo;
  const cc_aplicado = Math.min(RULES.TOPE_INCREMENTAL_RENTA, csc_teorico);
  const balloon = Math.max(0, (csc_teorico - cc_aplicado) * plazo);
  return {
    nombre: cliente.nombre,
    af: cliente.af,
    plataforma: cliente.plataforma,
    saldo_reestructurar: saldo,
    pago_intencion: pi,
    condonacion: pi,
    deuda_post_condonacion: deuda_post,
    cc_aplicado,
    balloon,
    plazo_remanente: plazo,
    status: (r.status as "aceptado" | "cerrado") ?? "aceptado",
    assigned_to_name: r.assigned_to_name ?? null,
  };
}

/** Fetch live snapshot data for a given date (YYYY-MM-DD). */
async function fetchLiveSnapshot(date: string): Promise<DailyReportSnapshot> {
  const admin = createAdminClient();

  // All clients with their negociaciones (for counts + acumulada)
  const { data: rows } = await admin
    .from("v_clientes_dashboard")
    .select("status, pago_intencion, adeudo, nombre, af, originacion_vehiculo, assigned_to_name");

  const all = rows ?? [];

  // Counts per status
  const ALL_STATUSES: CallStatus[] = [
    "listo_contactar",
    "sin_respuesta",
    "en_negociacion",
    "aceptado",
    "rechazado",
    "necesita_revision",
    "enviado_recuperar",
    "cerrado",
    "pendiente_firma",
    "firmado",
    "aplicado",
  ];
  const por_status = ALL_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<CallStatus, number>
  );
  for (const row of all) {
    const s = row.status as CallStatus | null;
    if (s && s in por_status) por_status[s]++;
  }

  // ── Aceptados HOY ────────────────────────────────────────────────────────
  // Use actividad_log to detect status changes to 'aceptado' today (Mexico tz).
  // This avoids the UTC vs local-time mismatch on negociaciones.updated_at.
  const [dayStart, dayEnd] = mexicoDayUTCRange(date);

  const { data: logRows } = await admin
    .from("actividad_log")
    .select("cliente_id")
    .eq("estado_nuevo", "aceptado")
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd);

  const seen = new Set<string>();
  const clienteIdsHoy: string[] = [];
  for (const r of logRows ?? []) {
    const id = r.cliente_id as string;
    if (!seen.has(id)) { seen.add(id); clienteIdsHoy.push(id); }
  }

  let aceptados_hoy: AceptadoCerradoRow[] = [];
  if (clienteIdsHoy.length > 0) {
    const { data: negHoy } = await admin
      .from("negociaciones")
      .select(
        `pago_intencion, status, assigned_to_name:profiles!negociaciones_assigned_to_fkey(full_name),
         clientes!inner(af, nombre, adeudo, semana_siguiente, plataforma, plazo_remanente)`
      )
      .in("cliente_id", clienteIdsHoy)
      // Incluir también 'cerrado': un deal aceptado hoy puede haber sido cerrado en el mismo día
      .in("status", ["aceptado", "cerrado"]);

    aceptados_hoy = (negHoy ?? []).map((r) => {
      const cliente = r.clientes as unknown as {
        af: string; nombre: string; adeudo: number; semana_siguiente: number; plataforma: string | null; plazo_remanente: number;
      };
      const agente = r.assigned_to_name as unknown as { full_name: string } | null;
      return toAceptadoCerradoRow(
        { pago_intencion: r.pago_intencion as number | null, status: r.status, assigned_to_name: agente?.full_name ?? null },
        cliente
      );
    });
  }

  // ── Todos los aceptados + cerrados (acumulado) ───────────────────────────
  const { data: acCerRows } = await admin
    .from("negociaciones")
    .select(
      `pago_intencion, status, assigned_to_name:profiles!negociaciones_assigned_to_fkey(full_name),
       clientes!inner(af, nombre, adeudo, semana_siguiente, plataforma, plazo_remanente)`
    )
    .in("status", ["aceptado", "cerrado"]);

  const todos_aceptados_cerrados: AceptadoCerradoRow[] = (acCerRows ?? []).map((r) => {
    const cliente = r.clientes as unknown as {
      af: string; nombre: string; adeudo: number; semana_siguiente: number; plataforma: string | null; plazo_remanente: number;
    };
    const agente = r.assigned_to_name as unknown as { full_name: string } | null;
    return toAceptadoCerradoRow(
      { pago_intencion: r.pago_intencion as number | null, status: r.status, assigned_to_name: agente?.full_name ?? null },
      cliente
    );
  });

  // Condonación del día: suma de los aceptados hoy
  const condonacion_hoy = aceptados_hoy.reduce((sum, r) => sum + r.condonacion, 0);

  // Condonación de todos los actualmente aceptados
  const condonacion_aceptados = todos_aceptados_cerrados
    .filter((r) => r.status === "aceptado")
    .reduce((sum, r) => sum + r.condonacion, 0);

  // Promedios — solo aceptados (excluye cerrados)
  const soloAceptados = todos_aceptados_cerrados.filter((r) => r.status === "aceptado");
  const nAc = soloAceptados.length;
  const prom_condonacion = nAc > 0
    ? Math.round(soloAceptados.reduce((s, r) => s + r.condonacion, 0) / nAc)
    : 0;
  // Solo aceptados con deuda_post_condonacion > 0
  const aceptadosConDeuda = soloAceptados.filter((r) => r.deuda_post_condonacion > 0);
  const prom_deuda_post_cond = aceptadosConDeuda.length > 0
    ? Math.round(aceptadosConDeuda.reduce((s, r) => s + r.deuda_post_condonacion, 0) / aceptadosConDeuda.length)
    : 0;
  const plazo_promedio_aceptados = nAc > 0
    ? Math.round(soloAceptados.reduce((s, r) => s + r.plazo_remanente, 0) / nAc)
    : 0;

  // Cerrados = casos cerrados sin pago (solo conteo)
  const count_cerrados = por_status["cerrado"] ?? 0;

  // Flujo de pago: pendiente_firma + firmado + aplicado
  const PAGADO_FLOW: CallStatus[] = ["pendiente_firma", "firmado", "aplicado"];
  const count_pagados = PAGADO_FLOW.reduce((s, st) => s + (por_status[st] ?? 0), 0);
  const monto_pagado = all
    .filter((r) => PAGADO_FLOW.includes(r.status as CallStatus))
    .reduce((s, r) => s + Number(r.pago_intencion ?? 0), 0);

  // Conversión: pagados / (aceptados + pagados) × 100
  const nAceptados = por_status["aceptado"] ?? 0;
  const conversion_pct =
    nAceptados + count_pagados > 0
      ? Math.round((count_pagados / (nAceptados + count_pagados)) * 100)
      : 0;

  // Pronóstico: clientes en listo_contactar + sin_respuesta
  const pronostico_llamadas =
    (por_status["listo_contactar"] ?? 0) + (por_status["sin_respuesta"] ?? 0);

  return {
    total: all.length,
    por_status,
    aceptados_hoy,
    todos_aceptados_cerrados,
    condonacion_hoy,
    condonacion_aceptados,
    prom_condonacion,
    prom_deuda_post_cond,
    plazo_promedio_aceptados,
    count_cerrados,
    monto_pagado,
    count_pagados,
    conversion_pct,
    pronostico_llamadas,
  };
}

/** GET /api/daily-report?date=YYYY-MM-DD
 *  Siempre devuelve datos en vivo. Si hay un reporte guardado, devuelve sus
 *  actividades y próximos pasos para no perder lo que el admin escribió.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { role } = await getSessionProfile(supabase, user);
  if (role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  // Load saved texts (actividades + next_steps) if they exist — data is always live
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("daily_reports")
    .select("actividades, next_steps, generated_at")
    .eq("report_date", date)
    .maybeSingle();

  const snapshot = await fetchLiveSnapshot(date);
  return NextResponse.json({
    snapshot,
    savedTexts: existing
      ? { actividades: existing.actividades, next_steps: existing.next_steps, saved_at: existing.generated_at }
      : null,
  });
}

/** POST /api/daily-report — create or update today's report */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { role } = await getSessionProfile(supabase, user);
  if (role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const body = (await request.json()) as {
    report_date: string;
    actividades: string[];
    next_steps: string[];
  };

  const { report_date, actividades, next_steps } = body;
  const horario_inicio = "";
  const horario_fin = "";

  // Always refresh snapshot at save time
  const snapshot_data = await fetchLiveSnapshot(report_date);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_reports")
    .upsert(
      {
        report_date,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        horario_inicio,
        horario_fin,
        actividades,
        next_steps,
        snapshot_data,
      },
      { onConflict: "report_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ report: data as DailyReport });
}
