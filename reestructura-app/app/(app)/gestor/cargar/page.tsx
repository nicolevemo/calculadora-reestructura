import { GestorCsvUpload } from "@/components/gestor-csv-upload";
import { UploadHistoryTable, type UploadHistoryRow } from "@/components/upload-history-table";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function GestorCargarPage() {
  const supabase = createClient();
  const canQuery = !isDevAuthBypass() || isDevServerDataOverride();

  let uploads: UploadHistoryRow[] = [];
  let historyError: string | null = null;

  if (canQuery) {
    const { data, error } = await supabase
      .from("shortlist_uploads")
      .select("id, filename, uploaded_at, client_count, status, week_of")
      .order("uploaded_at", { ascending: false })
      .limit(20);

    if (error) historyError = error.message;
    else uploads = (data ?? []) as UploadHistoryRow[];
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cargar CSV</h1>
        <p className="max-w-2xl text-muted-foreground">
          Subí el shortlist semanal. Podés descargar la plantilla CSV con las columnas acordadas;
          se validan tipos en el navegador y, al confirmar, el servidor crea el registro en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">shortlist_uploads</code> y las
          filas en <code className="rounded bg-muted px-1 py-0.5 text-xs">clientes</code>.
        </p>
      </div>
      {canQuery ? (
        <p className="text-sm text-muted-foreground">
          Podés arrastrar un CSV y previsualizarlo siempre; la inserción requiere sesión de gestor o bypass
          local con <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : (
        <p className="text-sm text-amber-800">
          Podés previsualizar el CSV abajo. Para insertar o ver historial en bypass, agregá{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      )}

      <GestorCsvUpload />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Historial reciente</h2>
        <UploadHistoryTable
          uploads={uploads}
          error={historyError}
          emptyHint={
            canQuery
              ? "Todavía no hay cargas. Subí el primer CSV arriba."
              : "Activá service role + bypass para ver historial en local."
          }
        />
      </div>
    </div>
  );
}
