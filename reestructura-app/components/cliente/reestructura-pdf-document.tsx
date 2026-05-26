import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  buildPdfScheduleDates,
  formatLegalShortDate,
  formatPdfCurrency,
  parseIsoDate,
} from "@/lib/reestructura-pdf-format";
import {
  TYC_BLOCKS,
  TYC_DATE,
  TYC_TITLE,
  type TycBlock,
} from "@/lib/legal/programa-regularizacion-tyc";
import type { CalculatorResult } from "@/lib/types";

// ─── Style ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Páginas ──
  page: {
    paddingTop: 40,
    paddingBottom: 56, // espacio para footer
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111111",
    lineHeight: 1.4,
  },
  // ── Header de los T&C (solo página 1) ──
  tycHeader: {
    textAlign: "center",
    marginBottom: 18,
  },
  tycTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 4,
  },
  tycDate: {
    fontSize: 9,
    color: "#555555",
  },
  // ── Bloques T&C ──
  h2: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 6,
    color: "#111111",
  },
  h3: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 3,
    color: "#222222",
  },
  p: {
    fontSize: 9.5,
    color: "#222222",
    marginBottom: 5,
    textAlign: "justify",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  listBullet: {
    width: 18,
    fontSize: 9.5,
    color: "#222222",
  },
  listText: {
    flex: 1,
    fontSize: 9.5,
    color: "#222222",
    textAlign: "justify",
  },
  // ── Footer ──
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#888888",
  },
  // ── Anexo (página de condiciones específicas) ──
  companyHeader: {
    fontSize: 7,
    letterSpacing: 1.5,
    textAlign: "center",
    color: "#1f1f1f",
    marginBottom: 6,
  },
  anexoTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  anexoSectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: "#111111",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  anexoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3,
  },
  anexoLabel: {
    width: "62%",
    fontSize: 10,
    color: "#222222",
    paddingRight: 8,
  },
  anexoValue: {
    width: "38%",
    fontSize: 10,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  anexoMuted: {
    fontSize: 9,
    color: "#555555",
    marginTop: 2,
    marginBottom: 4,
  },
  benefitGroupTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 4,
    color: "#111111",
  },
  // ── Firma ──
  closingText: {
    fontSize: 9,
    color: "#333333",
    marginTop: 16,
    marginBottom: 18,
    textAlign: "justify",
    lineHeight: 1.45,
  },
  cityLine: {
    fontSize: 10,
    marginTop: 14,
    marginBottom: 30,
  },
  signatureCenter: {
    alignItems: "center",
    marginBottom: 20,
  },
  signatureLine: {
    width: 280,
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    marginBottom: 4,
  },
  signatureCaption: {
    fontSize: 9,
    color: "#222222",
    fontFamily: "Helvetica-Bold",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 16,
  },
  signatureCell: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#666666",
  },
});

const COMPANY_NAME =
  "F I N A N C I E R A  P O R  E L  I M P U L S O  E C O N Ó M I C O ,  S . A .  D E  C . V . ,  S O F O M ,  E . N . R .";
const COMPANY_ADDRESS =
  "Domicilio: Campos Elíseos 345, Torre Omega, Piso 9, Polanco V, Miguel Hidalgo C.P. 11560, Ciudad de México";
const COMPANY_RFC = "R.F.C.: FIE111213659";
const CLOSING_TEXT =
  'Esta Solicitud de Regularización se emite en los términos del Programa de Regularización emitido por Financiera por el Impulso Económico, S.A. de C.V., SOFOM, E.N.R. ("VEMO Impulso") y cuyos términos y condiciones se encuentran en https://vemovilidad.com/arrendamiento-de-vehiculos-electricos/ y cuyos términos se incorporan aquí por referencia. Asimismo, se detallan las Condiciones Específicas que forman parte integral de la Solicitud de Regularización. El Cliente declara que todos los datos que aparecen en esta Solicitud de Regularización son verdaderos.\n\nVEMO Impulso, en caso de así considerarlo podrá rechazar la presente Solicitud de Regularización. En caso de que VEMO Impulso acepte la presente Solicitud de Regularización, ésta junto con términos del Programa de Regularización formarán parte integrante del Acuerdo de Regularización. Al firmar electrónicamente a través de la App VEMO Impulso, el Cliente declara haber leído, comprendido y aceptado íntegramente el contenido de la Solicitud, las Condiciones Específicas de este Anexo y los Términos y Condiciones del Programa de Regularización.';

// ─── Renderers ───────────────────────────────────────────────────────
function TycBlockNode({ block, index }: { block: TycBlock; index: number }) {
  switch (block.type) {
    case "h2":
      return <Text style={styles.h2}>{block.text}</Text>;
    case "h3":
      return <Text style={styles.h3}>{block.text}</Text>;
    case "p":
      return <Text style={styles.p}>{block.text}</Text>;
    case "list":
      return (
        <View>
          {block.items.map((item, i) => (
            <View key={`${index}-${i}`} style={styles.listItem} wrap={false}>
              <Text style={styles.listBullet}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────
/**
 * - "completo": T&C (págs. 1-8) + Anexo + Firma
 * - "anexo": solo el Anexo y la Firma (2 páginas)
 */
export type ReestructuraPdfVariant = "completo" | "anexo";

export type ReestructuraPdfDocumentProps = {
  nombre: string;
  af: string;
  plazoRemanente: number;
  fechaCompromisoIso: string;
  calc: CalculatorResult;
  variant?: ReestructuraPdfVariant;
};

export function ReestructuraPdfDocument({
  nombre,
  af,
  plazoRemanente,
  fechaCompromisoIso,
  calc,
  variant = "completo",
}: ReestructuraPdfDocumentProps) {
  const schedule = buildPdfScheduleDates(fechaCompromisoIso, plazoRemanente);
  const semanasRestantes = Math.max(1, Math.floor(plazoRemanente));
  const otorgaCreditoSimple = calc.remanente > 0.01;
  const aplicaBalloon = otorgaCreditoSimple && calc.balloon > 0.01;
  const fechaAcuerdoDate = parseIsoDate(fechaCompromisoIso);
  const fechaAcuerdo = fechaAcuerdoDate
    ? formatLegalShortDate(fechaAcuerdoDate)
    : "______";

  // Saldo deudor remanente: cuando hay remanente, se muestra como NEGATIVO
  // (saldo "en contra" del cliente). Cuando es $0, se muestra $0.00.
  const saldoRemanenteFmt =
    calc.remanente > 0.01 ? `-${formatPdfCurrency(calc.remanente)}` : formatPdfCurrency(0);

  // Pago semanal: si el Crédito Simple aplica, se muestra como deducción semanal (signo −)
  const pagoSemanalFmt = otorgaCreditoSimple
    ? `-${formatPdfCurrency(calc.cscAplicado)}`
    : formatPdfCurrency(0);

  return (
    <Document>
      {/* ─── Páginas 1 a 8: Términos y Condiciones (solo si variant = "completo") ─── */}
      {variant === "completo" ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.tycHeader}>
            <Text style={styles.tycTitle}>{TYC_TITLE}</Text>
            <Text style={styles.tycDate}>{TYC_DATE}</Text>
          </View>

          {TYC_BLOCKS.map((block, idx) => (
            <TycBlockNode key={idx} block={block} index={idx} />
          ))}

          <View style={styles.pageFooter} fixed>
            <Text>VEMO Impulso · Programa de Regularización</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </Page>
      ) : null}

      {/* ─── Anexo de Condiciones Específicas ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyHeader}>{COMPANY_NAME}</Text>
        <Text style={styles.anexoTitle}>
          Solicitud de regularización y Anexo de condiciones específicas
        </Text>

        {/* ── DATOS DEL SOLICITANTE ── */}
        <Text style={styles.anexoSectionTitle}>Datos del solicitante</Text>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Nombre:</Text>
          <Text style={styles.anexoValue}>{nombre}</Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Domicilio:</Text>
          <Text style={styles.anexoValue}>(_________________)</Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>R.F.C.:</Text>
          <Text style={styles.anexoValue}>(_________________)</Text>
        </View>

        {/* ── CONTRATO (AF) ── */}
        <Text style={styles.anexoSectionTitle}>Contrato (AF)</Text>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Número de contrato</Text>
          <Text style={styles.anexoValue}>{af}</Text>
        </View>

        {/* ── LA ACREDITANTE ── */}
        <Text style={styles.anexoSectionTitle}>La acreditante</Text>
        <Text style={styles.p}>
          Financiera por el Impulso Económico, S.A. de C.V., SOFOM, E.N.R. (&quot;VEMO Impulso&quot;)
        </Text>
        <Text style={styles.anexoMuted}>{COMPANY_ADDRESS}</Text>
        <Text style={styles.anexoMuted}>{COMPANY_RFC}</Text>

        {/* ── APLICACIÓN AL PROGRAMA ── */}
        <Text style={styles.anexoSectionTitle}>
          Aplicación al programa de regularización
        </Text>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Adeudo a Regularizar:</Text>
          <Text style={styles.anexoValue}>
            {formatPdfCurrency(calc.saldoAReestructurar)}
          </Text>
        </View>

        {/* ── BENEFICIO(S) ── */}
        <Text style={styles.anexoSectionTitle}>Beneficio(s) que se solicita(n)</Text>

        <Text style={styles.benefitGroupTitle}>
          (1) BENEFICIO &quot;CONDONACIÓN PESO POR PESO&quot;
        </Text>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Pago de Intención</Text>
          <Text style={styles.anexoValue}>
            ({formatPdfCurrency(calc.pagoIntencion)})
          </Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Condonación VEMO Impulso</Text>
          <Text style={styles.anexoValue}>
            ({formatPdfCurrency(calc.condonacion)})
          </Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Saldo Deudor Remanente</Text>
          <Text style={styles.anexoValue}>{saldoRemanenteFmt}</Text>
        </View>

        <Text style={styles.benefitGroupTitle}>
          (2) BENEFICIO OTORGAMIENTO DE CRÉDITO SIMPLE
        </Text>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>
            Otorgamiento de Crédito Simple pagadero conforme Tabla de Amortización Crédito Simple
          </Text>
          <Text style={styles.anexoValue}>
            {otorgaCreditoSimple
              ? `(${formatPdfCurrency(calc.remanente)})`
              : "NO APLICA"}
          </Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>Semanas restantes del Contrato</Text>
          <Text style={styles.anexoValue}>
            {otorgaCreditoSimple ? `${semanasRestantes} semanas` : "NO APLICA"}
          </Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>
            Pago Semanal conforme a la Tabla de Amortización
          </Text>
          <Text style={styles.anexoValue}>
            {otorgaCreditoSimple ? pagoSemanalFmt : "NO APLICA"}
          </Text>
        </View>
        <View style={styles.anexoRow}>
          <Text style={styles.anexoLabel}>
            Pago Residual {aplicaBalloon ? "APLICA" : "NO APLICA"}
          </Text>
          <Text style={styles.anexoValue}>
            {aplicaBalloon ? formatPdfCurrency(calc.balloon) : formatPdfCurrency(0)}
          </Text>
        </View>
        {aplicaBalloon && schedule?.residualDue ? (
          <Text style={styles.anexoMuted}>
            Fecha de exigibilidad del Pago Residual: {schedule.residualDue}
          </Text>
        ) : null}

        <View style={styles.pageFooter} fixed>
          <Text>Anexo de Condiciones Específicas · {af}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ─── Firma del Cliente ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.closingText}>{CLOSING_TEXT}</Text>

        <Text style={styles.cityLine}>
          Ciudad de México, México a ({fechaAcuerdo}).
        </Text>

        <View style={styles.signatureCenter}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureCaption}>Nombre del Solicitante</Text>
          <Text style={[styles.signatureCaption, { marginTop: 2 }]}>{nombre}</Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>
              FIRMA ELECTRÓNICA (APP VEMO IMPULSO)
            </Text>
          </View>
          <View style={styles.signatureCell}>
            <Text style={styles.signatureLabel}>
              FECHA DE ACEPTACIÓN DE LA PROMOCIÓN (VEMO IMPULSO)
            </Text>
          </View>
        </View>

        <View style={styles.pageFooter} fixed>
          <Text>Solicitud de Regularización · {af}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
