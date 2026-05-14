export const CSV_TEMPLATE_PATH = "/templates/shortlist-carga.csv";

export const CSV_TEMPLATE_FILENAME = "shortlist-carga-template.csv";

export const CSV_TEMPLATE_COLUMNS = [
  { header: "AF", required: true },
  { header: "Nombre", required: true },
  { header: "Teléfono", required: false },
  { header: "Saldo vencido", required: true },
  { header: "Semanalidad actual", required: true },
  { header: "Semanalidad siguiente", required: true },
  { header: "Plazo", required: true },
  { header: "Plataforma", required: true },
  { header: "Net earnings", required: false },
  { header: "Viajes", required: false },
  { header: "Originación (new/used)", required: false },
  { header: "Vehículo", required: false },
] as const;
