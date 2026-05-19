import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { AceptadoCerradoRow, DailyReport, DailyReportSnapshot } from "@/app/api/daily-report/route";
import type { CallStatus } from "@/lib/types";

// ─── palette ─────────────────────────────────────────────────
const C = {
  bg: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  accent: "#6366f1",
  accentLight: "#818cf8",
  green: "#22c55e",
  amber: "#f59e0b",
  blue: "#3b82f6",
  purple: "#a855f7",
  red: "#ef4444",
  slate: "#94a3b8",
  muted: "#64748b",
  white: "#f8fafc",
  dim: "#cbd5e1",
};

const STATUS_COLORS: Record<CallStatus, string> = {
  listo_contactar: C.slate,
  sin_respuesta:   C.amber,
  en_negociacion:  C.blue,
  aceptado:        C.green,
  rechazado:       C.red,
  necesita_revision: C.purple,
  cerrado:         C.muted,
};


const STATUS_LABELS_PDF: Record<CallStatus, string> = {
  listo_contactar:   "Sin contacto",
  sin_respuesta:     "Sin respuesta",
  en_negociacion:    "En negociación",
  aceptado:          "Aceptados",
  rechazado:         "Rechazados",
  necesita_revision: "En revisión",
  cerrado:           "Cerrados",
};

const ACTIVE_STATUSES_PDF: CallStatus[] = [
  "sin_respuesta", "en_negociacion", "aceptado", "necesita_revision",
];

// ─── styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.white,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  companyTag: {
    fontSize: 7.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.accentLight,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  subtitle: {
    fontSize: 8.5,
    color: C.dim,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  horarioText: {
    fontSize: 8,
    color: C.dim,
    marginTop: 2,
  },
  // Pills row
  pillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: C.surface,
    minWidth: 52,
    alignItems: "center",
  },
  pillLabel: {
    fontSize: 6.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 3,
  },
  pillValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  // Sections
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: C.accentLight,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  // Bullet rows
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  bulletBar: {
    width: 3,
    height: "100%",
    backgroundColor: C.accent,
    borderRadius: 1,
    marginRight: 7,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 9,
    color: C.dim,
    flex: 1,
    lineHeight: 1.4,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: C.surface,
    borderRadius: 4,
    marginTop: 2,
  },
  colH: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.muted,
  },
  colVal: {
    fontSize: 8.5,
    color: C.dim,
  },
  colValBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  statusBadge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  // Condonación summary
  condRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  condCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  condLabel: {
    fontSize: 7.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 4,
  },
  condValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.green,
  },
  // Next steps
  pronostico: {
    fontSize: 8,
    color: C.dim,
    marginBottom: 8,
  },
  pronosticoBold: {
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
});

// ─── helpers ─────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).replace(/^\w/, (c) => c.toUpperCase());
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── component ───────────────────────────────────────────────
// ─── reusable table ──────────────────────────────────────────
function AcCerTable({ rows, title }: { rows: AceptadoCerradoRow[]; title: string }) {
  const colW = {
    nombre: "30%", af: "9%", plat: "9%",
    saldo: "16%", pago: "16%", cond: "12%",
    estado: "8%",
  };
  const totalSaldo = rows.reduce((s, r) => s + r.saldo_vencido, 0);
  const totalPago  = rows.reduce((s, r) => s + r.pago_intencion, 0);
  const totalCond  = rows.reduce((s, r) => s + r.condonacion, 0);

  return (
    <View style={s.sectionBlock} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={[s.bulletText, { color: C.muted }]}>Sin registros.</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={[s.colH, { width: colW.nombre }]}>Cliente</Text>
            <Text style={[s.colH, { width: colW.af }]}>AF</Text>
            <Text style={[s.colH, { width: colW.plat }]}>Plat.</Text>
            <Text style={[s.colH, { width: colW.saldo, textAlign: "right" }]}>Saldo vencido</Text>
            <Text style={[s.colH, { width: colW.pago,  textAlign: "right" }]}>Pago intención</Text>
            <Text style={[s.colH, { width: colW.cond,  textAlign: "right" }]}>Condonación</Text>
            <Text style={[s.colH, { width: colW.estado, textAlign: "center" }]}>Estado</Text>
          </View>
          {rows.map((r, i) => {
            const color = r.status === "aceptado" ? C.green : C.muted;
            const label = r.status === "aceptado" ? "Aceptado" : "Cerrado";
            return (
              <View key={i} style={s.tableRow}>
                <Text style={[s.colVal, { width: colW.nombre }]}>{r.nombre}</Text>
                <Text style={[s.colVal, { width: colW.af }]}>{r.af}</Text>
                <Text style={[s.colVal, { width: colW.plat }]}>{r.originacion_vehiculo ?? "—"}</Text>
                <Text style={[s.colVal, { width: colW.saldo, textAlign: "right" }]}>{fmtCurrency(r.saldo_vencido)}</Text>
                <Text style={[s.colVal, { width: colW.pago,  textAlign: "right" }]}>{fmtCurrency(r.pago_intencion)}</Text>
                <Text style={[s.colVal, { width: colW.cond,  textAlign: "right", color: C.green }]}>{fmtCurrency(r.condonacion)}</Text>
                <View style={{ width: colW.estado, alignItems: "center" }}>
                  <View style={[s.statusBadge, { backgroundColor: `${color}22` }]}>
                    <Text style={[s.statusBadgeText, { color }]}>{label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={s.tableRowTotal}>
            <Text style={[s.colValBold, { width: colW.nombre }]}>
              TOTAL — {rows.length} acuerdo{rows.length !== 1 ? "s" : ""}
            </Text>
            <Text style={{ width: colW.af }} />
            <Text style={{ width: colW.plat }} />
            <Text style={[s.colValBold, { width: colW.saldo, textAlign: "right" }]}>{fmtCurrency(totalSaldo)}</Text>
            <Text style={[s.colValBold, { width: colW.pago,  textAlign: "right" }]}>{fmtCurrency(totalPago)}</Text>
            <Text style={[s.colValBold, { width: colW.cond,  textAlign: "right", color: C.green }]}>{fmtCurrency(totalCond)}</Text>
            <Text style={{ width: colW.estado }} />
          </View>
        </>
      )}
    </View>
  );
}

export type ReporteDiarioPdfProps = {
  report: DailyReport;
};

export function ReporteDiarioPdfDocument({ report }: ReporteDiarioPdfProps) {
  const snap = report.snapshot_data as DailyReportSnapshot;

  const totalLlamadasActivas = ACTIVE_STATUSES_PDF.reduce(
    (s, k) => s + (snap.por_status[k] ?? 0), 0
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.companyTag}>VEMO · Reporte Diario</Text>
            <Text style={s.title}>Reporte Diario</Text>
            <Text style={s.subtitle}>Cobranza – Proyecto Regularización</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateText}>{fmtDate(report.report_date)}</Text>
            <Text style={s.horarioText}>
              Exportado: {fmtTimestamp(report.generated_at)}
            </Text>
          </View>
        </View>

        {/* ── PILLS: Sin contacto + Llamadas activas ── */}
        <View style={[s.pillsRow, { marginBottom: 10 }]}>
          {/* Total */}
          <View style={[s.pill, { borderLeftWidth: 3, borderLeftColor: C.accentLight }]}>
            <Text style={s.pillLabel}>Total</Text>
            <Text style={[s.pillValue, { color: C.white }]}>{snap.total}</Text>
          </View>
          {/* Sin contacto */}
          <View style={[s.pill, { borderLeftWidth: 3, borderLeftColor: C.slate }]}>
            <Text style={s.pillLabel}>{STATUS_LABELS_PDF["listo_contactar"]}</Text>
            <Text style={[s.pillValue, { color: C.slate }]}>
              {snap.por_status["listo_contactar"] ?? 0}
            </Text>
          </View>
          {/* Llamadas activas total */}
          <View style={[s.pill, { borderLeftWidth: 3, borderLeftColor: C.accentLight, minWidth: 64 }]}>
            <Text style={s.pillLabel}>Llamadas activas</Text>
            <Text style={[s.pillValue, { color: C.accentLight }]}>{totalLlamadasActivas}</Text>
          </View>
        </View>
        {/* Breakdown activas */}
        <View style={[s.pillsRow, { marginBottom: 14 }]}>
          {ACTIVE_STATUSES_PDF.map((st) => (
            <View
              key={st}
              style={[s.pill, { borderLeftWidth: 2, borderLeftColor: STATUS_COLORS[st], paddingVertical: 5 }]}
            >
              <Text style={s.pillLabel}>{STATUS_LABELS_PDF[st]}</Text>
              <Text style={[s.pillValue, { color: STATUS_COLORS[st], fontSize: 13 }]}>
                {snap.por_status[st] ?? 0}
              </Text>
            </View>
          ))}
        </View>

        {/* ── CONDONACIÓN + CONVERSIÓN ── */}
        <View style={s.condRow}>
          <View style={s.condCard}>
            <Text style={s.condLabel}>Condonación del día</Text>
            <Text style={[s.condValue, { color: C.amber }]}>{fmtCurrency(snap.condonacion_hoy)}</Text>
            <Text style={[s.condLabel, { fontSize: 6.5, marginTop: 2 }]}>Aceptados hoy</Text>
          </View>
          <View style={s.condCard}>
            <Text style={s.condLabel}>Condonación Aceptados</Text>
            <Text style={s.condValue}>{fmtCurrency(snap.condonacion_aceptados ?? 0)}</Text>
            <Text style={[s.condLabel, { fontSize: 6.5, marginTop: 2 }]}>Comprometidos</Text>
          </View>
          <View style={s.condCard}>
            <Text style={s.condLabel}>Condonación Cerrados</Text>
            <Text style={[s.condValue, { color: C.slate }]}>{fmtCurrency(snap.condonacion_cerrados ?? 0)}</Text>
            <Text style={[s.condLabel, { fontSize: 6.5, marginTop: 2 }]}>Pagaron</Text>
          </View>
          <View style={s.condCard}>
            <Text style={s.condLabel}>Conversión</Text>
            <Text style={[s.condValue, { color: C.accentLight, fontSize: 18 }]}>
              {snap.conversion_pct ?? 0}%
            </Text>
            <Text style={[s.condLabel, { fontSize: 6.5, marginTop: 2 }]}>
              Cerr. / (Acept. + Cerr.)
            </Text>
          </View>
        </View>

        {/* ── ACTIVIDADES DEL DÍA ── */}
        {report.actividades.length > 0 && (
          <View style={s.sectionBlock} wrap={false}>
            <Text style={s.sectionTitle}>Resumen del día</Text>
            {report.actividades.map((a, i) => (
              <View key={i} style={s.bulletRow}>
                <View style={s.bulletBar} />
                <Text style={s.bulletText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── ACUERDOS ACEPTADOS HOY ── */}
        <AcCerTable
          rows={snap.aceptados_hoy}
          title="Acuerdos aceptados hoy (condonación del día)"
        />

        {/* ── TODOS ACEPTADOS + CERRADOS ── */}
        <AcCerTable
          rows={snap.todos_aceptados_cerrados}
          title="Acuerdos totales — Aceptados y Cerrados"
        />

        {/* ── PRÓXIMOS PASOS ── */}
        {report.next_steps.length > 0 && (
          <View style={s.sectionBlock} wrap={false}>
            <Text style={s.sectionTitle}>Próximos pasos · Mañana</Text>
            <Text style={s.pronostico}>
              <Text style={s.pronosticoBold}>
                Pronóstico: {snap.pronostico_llamadas} llamadas
              </Text>
              {" — inicio de jornada"}
            </Text>
            {report.next_steps.map((ns, i) => (
              <View key={i} style={s.bulletRow}>
                <View style={[s.bulletBar, { backgroundColor: C.accentLight }]} />
                <Text style={s.bulletText}>{ns}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>VEMO · Reporte operativo confidencial</Text>
          <Text style={s.footerText}>
            Generado {fmtTimestamp(report.generated_at)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
