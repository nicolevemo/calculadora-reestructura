"use client";

import { MessageCircle, FileDown, FileText } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";

import {
  ReestructuraPdfDocument,
  type ReestructuraPdfVariant,
} from "@/components/cliente/reestructura-pdf-document";
import { Button } from "@/components/ui/button";
import { STATUS, RULES } from "@/lib/constants";
import type { CalculatorResult, CallStatus } from "@/lib/types";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

function mx(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  cliente: {
    nombre: string;
    af: string;
    telefono: string | null;
    plataforma: string | null;
  };
  plazoRemanente: number;
  fechaCompromisoIso: string;
  status: CallStatus;
  /** Fecha ya formateada para mensajes */
  fechaCompromisoLabel: string;
  calc: CalculatorResult;
};

export function ClienteCommsPanel({
  cliente,
  plazoRemanente,
  fechaCompromisoIso,
  status,
  fechaCompromisoLabel,
  calc,
}: Props) {
  const [pdfBusy, setPdfBusy] = useState<ReestructuraPdfVariant | null>(null);

  const whatsappMessage = useMemo(() => {
    const lines = [
      `Hola ${cliente.nombre},`,
      ``,
      `Te compartimos el resumen de reestructura LTO (AF ${cliente.af}).`,
      `Estado: ${STATUS[status].label}.`,
      ``,
      `Saldo a regularizar: ${mx(calc.saldoAReestructurar)}`,
      `Pago total: ${mx(calc.totalPagarHoy)} (${mx(calc.semanalidadActual)} semanalidad + ${mx(calc.pagoIntencion)} intención)`,
      `Semanalidad siguiente: ${mx(calc.semanalidadSiguiente)}`,
      ...(fechaCompromisoLabel
        ? [`Fecha de compromiso de pago: ${fechaCompromisoLabel}.`]
        : []),
      `Nueva semanalidad estimada: ${mx(calc.nuevaSemanalidad)}`,
      ...(calc.bonoProntoPagoMonto > 0
        ? [
            `Con bono pronto pago (−${mx(RULES.BONO_PRONTO_PAGO)}): ${mx(calc.nuevaSemanalidadConBono)}`,
          ]
        : []),
      ``,
      `Descargá el PDF desde la plataforma y adjuntalo aquí para tener el detalle completo.`,
    ];
    return lines.join("\n");
  }, [cliente.af, cliente.nombre, calc, status, fechaCompromisoLabel]);

  const waUrl = useMemo(
    () => buildWhatsAppUrl(cliente.telefono, whatsappMessage),
    [cliente.telefono, whatsappMessage]
  );

  const downloadPdf = useCallback(
    async (variant: ReestructuraPdfVariant) => {
      setPdfBusy(variant);
      try {
        const blob = await pdf(
          <ReestructuraPdfDocument
            nombre={cliente.nombre}
            af={cliente.af}
            plazoRemanente={plazoRemanente}
            fechaCompromisoIso={fechaCompromisoIso}
            calc={calc}
            variant={variant}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeAf = cliente.af.replace(/[^\w.-]+/g, "_");
        const prefix =
          variant === "completo" ? "acuerdo-regularizacion" : "anexo-condiciones";
        a.download = `${prefix}-${safeAf}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } finally {
        setPdfBusy(null);
      }
    },
    [calc, cliente.af, cliente.nombre, fechaCompromisoIso, plazoRemanente]
  );

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div>
        <h3 className="font-semibold">PDF y WhatsApp</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Descargá el acuerdo completo (Términos y Condiciones + Anexo) o únicamente el Anexo de
          Condiciones Específicas para el cliente. Adjuntá el PDF en WhatsApp manualmente.
        </p>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          className="w-full justify-start gap-2"
          variant="default"
          disabled={pdfBusy !== null}
          onClick={() => void downloadPdf("completo")}
        >
          <FileText className="h-4 w-4 shrink-0" />
          {pdfBusy === "completo"
            ? "Generando PDF…"
            : "Descargar PDF completo (T&C + Anexo)"}
        </Button>

        <Button
          type="button"
          className="w-full justify-start gap-2"
          variant="secondary"
          disabled={pdfBusy !== null}
          onClick={() => void downloadPdf("anexo")}
        >
          <FileDown className="h-4 w-4 shrink-0" />
          {pdfBusy === "anexo" ? "Generando PDF…" : "Descargar solo Anexo (2 págs.)"}
        </Button>
      </div>

      {waUrl ? (
        <Button type="button" className="w-full justify-start gap-2" variant="outline" asChild>
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4 shrink-0" />
            Abrir WhatsApp con el cliente
          </a>
        </Button>
      ) : (
        <p className={cn("rounded-md bg-muted px-2 py-2 text-xs text-muted-foreground")}>
          No hay teléfono cargado para este cliente. Agregá la columna{" "}
          <code className="rounded bg-background px-1">telefono</code> en el CSV o el dato en Supabase
          para usar <code className="rounded bg-background px-1">wa.me</code> con el número correcto.
        </p>
      )}

      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Vista rápida</p>
        <p className="mt-1 tabular-nums">Saldo a regularizar: {mx(calc.saldoAReestructurar)}</p>
        <p className="tabular-nums">Pago intención: {mx(calc.pagoIntencion)}</p>
      </div>
    </div>
  );
}
