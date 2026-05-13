"use client";

import { PDFViewer } from "@react-pdf/renderer";

import { ReestructuraPdfDocument, type ReestructuraPdfDocumentProps } from "@/components/cliente/reestructura-pdf-document";

export function ClientePdfPreview(props: ReestructuraPdfDocumentProps) {
  return (
    <div className="flex h-[min(72vh,640px)] min-h-[320px] w-full flex-col overflow-hidden rounded-lg border bg-muted/20 shadow-inner">
      <p className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
        Vista previa del PDF
      </p>
      <div className="min-h-0 flex-1">
        <PDFViewer width="100%" height="100%" showToolbar={false} className="border-0">
          <ReestructuraPdfDocument {...props} />
        </PDFViewer>
      </div>
    </div>
  );
}
