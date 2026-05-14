import type { CallStatus } from "@/lib/types";

export type ApiV1Calculo = {
  saldo_vencido: number;
  semanalidad_actual: number;
  semanalidad_siguiente: number;
  saldo_total: number;
  saldo_a_regularizar: number;
  total_pagar_hoy: number;
  condonacion: number;
  remanente: number;
  csc_teorico: number;
  csc_aplicado: number;
  balloon: number;
  nueva_semanalidad: number;
  nueva_semanalidad_con_bono: number;
};

export type ApiV1Cliente = {
  id: string;
  negociacion_id: string | null;
  af: string;
  nombre: string;
  telefono: string | null;
  vehiculo: string | null;
  plataforma: string | null;
  bucket: string | null;
  originacion_vehiculo: string | null;
  adeudo: number;
  semana: number;
  semana_siguiente: number;
  plazo_remanente: number;
  ingresos_api: number | null;
  viajes_api: number | null;
  upload_id: string | null;
  upload_week_of: string | null;
  upload_filename: string | null;
  created_at: string;
  status: CallStatus | null;
  intentos: number | null;
  pago_intencion: number | null;
  fecha_compromiso: string | null;
  motivo_rechazo: string | null;
  notes: string | null;
  bono_pronto_pago: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  exported_at: string | null;
  exported_by: string | null;
  last_activity_at: string | null;
  calculo: ApiV1Calculo;
};

export type ApiV1Negociacion = {
  af: string;
  cliente_id: string;
  negociacion_id: string | null;
  status: CallStatus | null;
  intentos: number | null;
  pago_intencion: number | null;
  fecha_compromiso: string | null;
  motivo_rechazo: string | null;
  notes: string | null;
  bono_pronto_pago: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  exported_at: string | null;
  exported_by: string | null;
  last_activity_at: string | null;
};

export type ApiV1Change = {
  af: string | null;
  accion: string;
  estado_anterior: CallStatus | null;
  estado_nuevo: CallStatus | null;
  payload: Record<string, unknown> | null;
  timestamp: string;
};

export type ApiV1Pagination = {
  total: number;
  limit: number;
  offset: number;
};
