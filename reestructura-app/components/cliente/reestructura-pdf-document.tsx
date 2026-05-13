import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CalculatorResult, CallStatus } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica", fontWeight: "bold" },
  subtitle: { fontSize: 11, marginBottom: 4, color: "#444" },
  generatedAt: { fontSize: 8, marginBottom: 16, color: "#888" },
  section: { marginBottom: 12 },
  label: { fontSize: 9, color: "#666", marginBottom: 2 },
  value: { fontSize: 11, marginBottom: 6 },
  highlightGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  highlightCard: {
    width: "31%",
    minWidth: 150,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 6,
    backgroundColor: "#f8f7ff",
    padding: 10,
  },
  highlightLabel: { fontSize: 8, color: "#52525b", marginBottom: 4 },
  highlightValue: { fontSize: 14, fontFamily: "Helvetica", fontWeight: "bold", color: "#312e81" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 4 },
  cellL: { width: "55%", fontSize: 9 },
  cellR: { width: "45%", fontSize: 9, textAlign: "right" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#333", paddingBottom: 4, marginBottom: 2 },
  headerCell: { fontSize: 9, fontFamily: "Helvetica", fontWeight: "bold" },
  emphasis: { fontSize: 14, marginBottom: 6, fontFamily: "Helvetica", fontWeight: "bold" },
  commitmentBox: {
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 6,
    backgroundColor: "#f5f3ff",
    padding: 12,
  },
  commitmentLabel: { fontSize: 10, color: "#4c1d95", marginBottom: 4, fontFamily: "Helvetica", fontWeight: "bold" },
  commitmentValue: { fontSize: 13, fontFamily: "Helvetica", fontWeight: "bold", color: "#1e1b4b" },
  footer: { marginTop: 8, fontSize: 8, color: "#666", lineHeight: 1.4 },
});

function mx(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export type ReestructuraPdfDocumentProps = {
  nombre: string;
  af: string;
  telefono: string | null;
  plataforma: string | null;
  status: CallStatus;
  fechaCompromiso: string;
  generatedAtLabel: string;
  calc: CalculatorResult;
};

export function ReestructuraPdfDocument({
  nombre,
  af,
  telefono,
  plataforma,
  fechaCompromiso,
  generatedAtLabel,
  calc,
}: ReestructuraPdfDocumentProps) {
  const nuevaSemanalidadPdf =
    calc.bonoProntoPagoMonto > 0 ? calc.nuevaSemanalidadConBono : calc.nuevaSemanalidad;

  const scheduleRows: { label: string; value: string }[] = [
    { label: "Saldo remanente", value: mx(calc.remanente) },
    { label: "Pago final", value: mx(calc.balloon) },
    { label: "Nueva semanalidad", value: mx(nuevaSemanalidadPdf) },
  ];

  if (calc.bonoProntoPagoMonto > 0) {
    scheduleRows.push(
      { label: "Descuento por pago a tiempo", value: `−${mx(calc.bonoProntoPagoMonto)}` },
      { label: "Semanalidad sin beneficio", value: mx(calc.nuevaSemanalidad) }
    );
  }

  const highlights = [
    { label: "Saldo total a regularizar", value: mx(calc.totalAdeudo) },
    { label: "Pago de intención", value: mx(calc.pagoIntencion) },
    { label: "Monto de condonación", value: mx(calc.condonacion) },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Resumen de tu Acuerdo</Text>
        <Text style={styles.subtitle}>Propuesta personalizada de regularización</Text>
        <Text style={styles.generatedAt}>Generado: {generatedAtLabel}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.value}>{nombre}</Text>
          <Text style={styles.label}>AF</Text>
          <Text style={styles.value}>{af}</Text>
          {telefono ? (
            <>
              <Text style={styles.label}>Teléfono</Text>
              <Text style={styles.value}>{telefono}</Text>
            </>
          ) : null}
          {plataforma ? (
            <>
              <Text style={styles.label}>Plataforma</Text>
              <Text style={styles.value}>{plataforma}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.highlightGrid}>
          {highlights.map((item) => (
            <View key={item.label} style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>{item.label}</Text>
              <Text style={styles.highlightValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pago total</Text>
          <Text style={styles.emphasis}>{mx(calc.totalPagarHoy)}</Text>
          <View style={styles.row}>
            <Text style={styles.cellL}>Semanalidad actual</Text>
            <Text style={styles.cellR}>{mx(calc.semanalidadActual)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellL}>Pago de intención</Text>
            <Text style={styles.cellR}>{mx(calc.pagoIntencion)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { width: "55%" }]}>Concepto</Text>
            <Text style={[styles.headerCell, { width: "45%", textAlign: "right" }]}>Monto</Text>
          </View>
          {scheduleRows.map((r) => (
            <View key={r.label} style={styles.row} wrap={false}>
              <Text style={styles.cellL}>{r.label}</Text>
              <Text style={styles.cellR}>{r.value}</Text>
            </View>
          ))}
        </View>

        {fechaCompromiso ? (
          <View style={styles.commitmentBox}>
            <Text style={styles.commitmentLabel}>Fecha límite para confirmar este acuerdo:</Text>
            <Text style={styles.commitmentValue}>{fechaCompromiso}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Este documento es un resumen informativo. No constituye un contrato. Los montos definitivos
          constarán en la documentación formal.
        </Text>
      </Page>
    </Document>
  );
}
