"use client";

import { MessageCircle, FileDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";

import { ReestructuraPdfDocument } from "@/components/cliente/reestructura-pdf-document";
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
  status: CallStatus;
  /** Fecha ya formateada para PDF / mensajes */
  fechaCompromisoLabel: string;
  calc: CalculatorResult;
};

export function ClienteCommsPanel({
  cliente,
  status,
  fechaCompromisoLabel,
  calc,
}: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const generatedAtLabel = useMemo(
    () =>
      new Date().toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    []
  );

  const whatsappMessage = useMemo(() => {
    const lines = [
      `Hola ${cliente.nombre},`,
      ``,
      `Te compartimos el resumen de reestructura LTO (AF ${cliente.af}).`,
      `Estado: ${STATUS[status].label}.`,
      ``,
      `Total de adeudo: ${mx(calc.totalAdeudo)}`,
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

  const downloadPdf = useCallback(async () => {
    setPdfBusy(true);
    try {
      const blob = await pdf(
        <ReestructuraPdfDocument
          nombre={cliente.nombre}
          af={cliente.af}
          telefono={cliente.telefono}
          plataforma={cliente.plataforma}
          status={status}
          fechaCompromiso={fechaCompromisoLabel}
          generatedAtLabel={generatedAtLabel}
          calc={calc}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeAf = cliente.af.replace(/[^\w.-]+/g, "_");
      a.download = `reestructura-${safeAf}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  }, [
    calc,
    cliente.af,
    cliente.nombre,
    cliente.plataforma,
    cliente.telefono,
    fechaCompromisoLabel,
    generatedAtLabel,
    status,
  ]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div>
        <h3 className="font-semibold">PDF y WhatsApp</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Descargá el resumen en PDF y abrí WhatsApp con el número del cliente (si está en el CSV /
          ficha). Adjuntá el PDF manualmente en el chat.
        </p>
      </div>

      <Button
        type="button"
        className="w-full justify-start gap-2"
        variant="secondary"
        disabled={pdfBusy}
        onClick={() => void downloadPdf()}
      >
        <FileDown className="h-4 w-4 shrink-0" />
        {pdfBusy ? "Generando PDF…" : "Descargar PDF (local)"}
      </Button>

      {waUrl ? (
        <Button type="button" className="w-full justify-start gap-2" variant="default" asChild>
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
        <p className="mt-1 tabular-nums">Base de reestructura: {mx(calc.saldoAReestructurar)}</p>
        <p className="tabular-nums">Pago intención: {mx(calc.pagoIntencion)}</p>
      </div>
    </div>
  );
}
