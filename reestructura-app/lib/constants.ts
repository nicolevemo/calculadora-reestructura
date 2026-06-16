import type { CallStatus } from "./types";

export const RULES = {
  PAGO_INTENCION_MIN: 5000,
  PAGO_INTENCION_PCT_MAX: 0.5,
  TOPE_INCREMENTAL_RENTA: 200,
  MAX_INTENTOS: 5,
  /** Descuento semanal si el cliente cumple condiciones del bono pronto pago (marcación manual en detalle). */
  BONO_PRONTO_PAGO: 400,
} as const;

export const STATUS = {
  listo_contactar:   { label: "Listo para contactar", color: "gray" },
  sin_respuesta:     { label: "Sin respuesta",         color: "amber" },
  en_negociacion:    { label: "En negociación",        color: "blue" },
  aceptado:          { label: "Aceptado",              color: "green" },
  rechazado:         { label: "Rechazado",             color: "red" },
  necesita_revision: { label: "Necesita revisión",     color: "purple" },
  enviado_recuperar: { label: "Enviado a Recuperar",   color: "orange" },
  cerrado:           { label: "Cerrado",               color: "slate" },
  no_aplica:         { label: "No aplica",             color: "gray" },
  pendiente_firma:   { label: "Pendiente de firma",    color: "blue" },
  firmado:           { label: "Firmado",               color: "green" },
  aplicado:          { label: "Aplicado",              color: "green" },
} as const satisfies Record<
  CallStatus,
  { label: string; color: "gray" | "amber" | "blue" | "green" | "red" | "purple" | "slate" | "orange" }
>;

export const STATUS_ORDER: CallStatus[] = [
  "listo_contactar",
  "sin_respuesta",
  "en_negociacion",
  "aceptado",
  "rechazado",
  "necesita_revision",
  "enviado_recuperar",
  "cerrado",
  "no_aplica",
  "pendiente_firma",
  "firmado",
  "aplicado",
];

/** Estados del flujo de pago (sub-estados de PAGADO). */
export const PAGADO_STATUSES: CallStatus[] = ["pendiente_firma", "firmado", "aplicado"];

/** Estados que aparecen en el selector principal del agente (excluye sub-estados de pago). */
export const STATUS_SELECTOR: CallStatus[] = [
  "listo_contactar",
  "sin_respuesta",
  "en_negociacion",
  "aceptado",
  "rechazado",
  "necesita_revision",
  "enviado_recuperar",
  "cerrado",
  "no_aplica",
];

/** Alias por si el código referencia el nombre del árbol de archivos del brief */
export const STATUS_CONFIG = STATUS;
