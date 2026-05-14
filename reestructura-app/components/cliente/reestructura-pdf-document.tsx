import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  buildPdfScheduleDates,
  formatPdfCurrency,
  formatPdfCurrencyDeduction,
} from "@/lib/reestructura-pdf-format";
import type { CalculatorResult } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 42,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111111",
    lineHeight: 1.35,
  },
  companyName: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 18,
    color: "#1f1f1f",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 22,
  },
  metaBlock: {
    marginBottom: 18,
  },
  metaRow: {
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#666666",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  section: {
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#222222",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3,
  },
  rowLabel: {
    width: "62%",
    fontSize: 9.5,
    color: "#222222",
    paddingRight: 8,
  },
  rowValue: {
    width: "38%",
    fontSize: 9.5,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  rowValueMuted: {
    width: "38%",
    fontSize: 9.5,
    textAlign: "right",
    color: "#444444",
  },
  benefitLine: {
    fontSize: 9.5,
    marginBottom: 4,
    color: "#222222",
  },
  note: {
    marginTop: 8,
    fontSize: 8.5,
    color: "#555555",
    lineHeight: 1.45,
  },
  footer: {
    marginTop: 18,
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.45,
    textAlign: "justify",
  },
  signatureRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  signatureCell: {
    width: "48%",
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 7.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#666666",
  },
});

const COMPANY_NAME =
  "FINANCIERA POR EL IMPULSO ECONÓMICO, S.A. DE C.V., SOFOM, E.N.R.";
const LEGAL_FOOTER =
  'Este Anexo de Condiciones Específicas forma parte integral de los Términos y Condiciones de la Promoción Mundialista de Financiera por el Impulso Económico, S.A. de C.V., SOFOM, E.N.R. ("VEMO Impulso"). Al firmar electrónicamente a través de la App VEMO Impulso, el Cliente declara haber leído, comprendido y aceptado íntegramente el contenido de este Anexo y los Términos y Condiciones de la Promoción.';

type PdfRow = {
  label: string;
  value: string;
  muted?: boolean;
};

function PdfSection({ title, rows }: { title: string; rows: PdfRow[] }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {rows.map((row) => (
        <View key={`${title}-${row.label}`} style={styles.row} wrap={false}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={row.muted ? styles.rowValueMuted : styles.rowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export type ReestructuraPdfDocumentProps = {
  nombre: string;
  af: string;
  plazoRemanente: number;
  fechaCompromisoIso: string;
  calc: CalculatorResult;
};

export function ReestructuraPdfDocument({
  nombre,
  af,
  plazoRemanente,
  fechaCompromisoIso,
  calc,
}: ReestructuraPdfDocumentProps) {
  const schedule = buildPdfScheduleDates(fechaCompromisoIso, plazoRemanente);
  const semanasRestantes = Math.max(1, Math.floor(plazoRemanente));
  const semanalidadOrdinaria = calc.semanalidadActual;
  const pagoDiferimiento = calc.cscAplicado;
  const totalSemanal = calc.bonoProntoPagoMonto > 0 ? calc.nuevaSemanalidadConBono : calc.nuevaSemanalidad;
  const paymentDeadline = schedule?.paymentDeadline ?? "Por confirmar";
  const firstOrdinaryPayment = schedule?.firstOrdinaryPayment ?? "Por confirmar";
  const residualDue = schedule?.residualDue ?? "Por confirmar";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyName}>{COMPANY_NAME}</Text>
        <Text style={styles.title}>Anexo de Condiciones Específicas</Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValue}>{nombre}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Contrato (AF)</Text>
            <Text style={styles.metaValue}>{af}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fecha de pago</Text>
            <Text style={styles.metaValue}>{paymentDeadline}</Text>
          </View>
        </View>

        <PdfSection
          title="Pago total"
          rows={[
            { label: "Pago de Intención", value: formatPdfCurrency(calc.pagoIntencion) },
            { label: "Semanalidad corriente", value: formatPdfCurrency(calc.semanalidadActual) },
            { label: "Pago Total", value: formatPdfCurrency(calc.totalPagarHoy) },
          ]}
        />

        <PdfSection
          title="Aplicación de la promoción"
          rows={[
            { label: "Adeudo a Regularizar", value: formatPdfCurrency(calc.saldoAReestructurar) },
            { label: "Pago de Intención", value: formatPdfCurrencyDeduction(calc.pagoIntencion) },
            {
              label: "Condonación VEMO Impulso",
              value: formatPdfCurrencyDeduction(calc.condonacion),
            },
            { label: "Saldo Remanente", value: formatPdfCurrency(calc.remanente) },
          ]}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beneficio</Text>
          <Text style={styles.benefitLine}>Condonación Peso por Peso</Text>
          <Text style={styles.benefitLine}>Diferimiento en Pagos Semanales</Text>
          <Text style={styles.benefitLine}>Diferimiento con Saldo Remanente APLICA</Text>
        </View>

        <PdfSection
          title=""
          rows={[
            {
              label: "Semanas restantes del Contrato",
              value: `${semanasRestantes} semanas`,
            },
            {
              label: "Pago Semanal de Diferimiento (CSC Mundialista · 0% anual)",
              value: formatPdfCurrency(pagoDiferimiento),
            },
            { label: "Pago Residual", value: formatPdfCurrency(calc.balloon) },
            {
              label: "Fecha de exigibilidad del Pago Residual",
              value: residualDue,
              muted: true,
            },
          ]}
        />

        <Text style={styles.note}>
          Si el Contrato termina anticipadamente por cualquier causa, el Pago Residual se vuelve
          exigible de forma inmediata.
        </Text>

        <PdfSection
          title="Próximos pagos"
          rows={[
            {
              label: "Primera Semanalidad ordinaria a tu cargo",
              value: firstOrdinaryPayment,
            },
            { label: "Semanalidad ordinaria", value: formatPdfCurrency(semanalidadOrdinaria) },
            {
              label: "Pago Semanal de Diferimiento",
              value: `${formatPdfCurrency(pagoDiferimiento)} / semana`,
            },
            { label: "Total semanal", value: formatPdfCurrency(totalSemanal) },
          ]}
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <PdfSection
          title=""
          rows={[
            {
              label: "Pago Residual al vencimiento del Contrato",
              value: formatPdfCurrency(calc.balloon),
            },
          ]}
        />

        {calc.bonoProntoPagoMonto > 0 ? (
          <PdfSection
            title="Beneficio adicional"
            rows={[
              {
                label: "Bono Gol Pronto Pago",
                value: formatPdfCurrency(calc.bonoProntoPagoMonto),
              },
            ]}
          />
        ) : null}

        {calc.bonoProntoPagoMonto > 0 ? (
          <Text style={styles.note}>
            Bonificación conforme a los términos y condiciones aplicables.
          </Text>
        ) : null}

        <Text style={styles.footer}>{LEGAL_FOOTER}</Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>Firma electrónica (App VEMO Impulso)</Text>
          </View>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>Fecha de aceptación de la promoción</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
