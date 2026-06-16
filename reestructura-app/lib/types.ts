export type UserRole = "gestor" | "agente" | "admin";

export type CallStatus =
  | "listo_contactar"
  | "sin_respuesta"
  | "en_negociacion"
  | "aceptado"
  | "rechazado"
  | "necesita_revision"
  | "enviado_recuperar"
  | "cerrado"
  | "no_aplica"
  | "pendiente_firma"
  | "firmado"
  | "aplicado";

export type UploadStatus = "procesando" | "activo" | "archivado";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Inputs for calculator (subset of cliente + agent input) */
export interface CalculatorClientInput {
  adeudo: number;
  semana: number;
  /** Si no viene en el CSV, se asume igual a `semana`. */
  semana_siguiente?: number;
  plazo_remanente: number;
  pago_en_dia: boolean;
  monto_pago_dia: number;
}

export interface CalculatorResult {
  /** Saldo vencido (adeudo ajustado si pagó en el día). */
  saldoVencido: number;
  /** Alias histórico de `saldoVencido`. */
  saldoActual: number;
  semanalidadActual: number;
  semanalidadSiguiente: number;
  /** Saldo total: saldo a regularizar + semanalidad actual. */
  totalAdeudo: number;
  /** Saldo a regularizar: saldo vencido + semanalidad siguiente. */
  saldoAReestructurar: number;
  pagoIntencionMin: number;
  /** Tope del pago de intención: 50% del saldo a regularizar. */
  pagoIntencionMax: number;
  pagoIntencion: number;
  /** Pago total hoy: semanalidad actual + pago de intención. */
  totalPagarHoy: number;
  condonacion: number;
  /** Deuda post-condonación para amortizar (remanente). */
  remanente: number;
  /** CSC teórico = remanente / plazo. */
  cscTeorico: number;
  /** Alias histórico de `cscTeorico`. */
  indicativoSemanal: number;
  /** CSC aplicado (tope $200/sem). */
  cscAplicado: number;
  balloon: number;
  /** Semanalidad siguiente + CSC aplicado. */
  nuevaSemanalidad: number;
  /** Monto del bono aplicado en simulación (0 o RULES.BONO_PRONTO_PAGO). */
  bonoProntoPagoMonto: number;
  /** Nueva semanalidad si aplica el bono (no menor que 0). */
  nuevaSemanalidadConBono: number;
  isAboveMax: boolean;
  isBelowMin: boolean;
  isValid: boolean;
}

/** Row shape from `v_clientes_dashboard` (aligned with 02-supabase-schema.sql) */
export interface ClienteDashboardRow {
  id: string;
  upload_id: string | null;
  af: string;
  nombre: string;
  telefono: string | null;
  vehiculo: string | null;
  plataforma: string | null;
  bucket: string | null;
  plazo_remanente: number;
  adeudo: number;
  semana: number;
  semana_siguiente: number;
  originacion_vehiculo: string | null;
  pago_en_dia: boolean | null;
  monto_pago_dia: number | null;
  api_uber: boolean | null;
  api_didi: boolean | null;
  ingresos_api: number | null;
  viajes_api: number | null;
  created_at: string;
  negociacion_id: string | null;
  status: CallStatus | null;
  intentos: number | null;
  pago_intencion: number | null;
  fecha_compromiso: string | null;
  motivo_rechazo: string | null;
  notes: string | null;
  pdf_enviado_at: string | null;
  assigned_to: string | null;
  last_activity_at: string | null;
  /** Fecha del último cambio guardado (datos del cliente o negociación). */
  ultima_edicion: string | null;
  assigned_to_name: string | null;
  upload_week_of: string | null;
  upload_filename: string | null;
  /** Última exportación CSV desde dashboard (gestor) */
  exported_at: string | null;
  exported_by: string | null;
  /** Si el agente marcó que el cliente cumple bono pronto pago ($400). */
  bono_pronto_pago?: boolean | null;
  /** AF duplicado detectado al subir el CSV. */
  is_duplicate?: boolean | null;
}
