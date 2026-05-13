import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type UploadHistoryRow = {
  id: string;
  filename: string;
  uploaded_at: string;
  client_count: number | null;
  status: string;
  week_of: string | null;
};

export function UploadHistoryTable({
  uploads,
  error,
  emptyHint,
}: {
  uploads: UploadHistoryRow[];
  error: string | null;
  emptyHint?: string;
}) {
  if (error) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el historial: {error}
      </p>
    );
  }

  if (!uploads.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyHint ?? "Todavía no hay cargas registradas."}
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Archivo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Clientes</TableHead>
            <TableHead>Semana</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploads.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="max-w-[220px] truncate font-medium">{u.filename}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(u.uploaded_at).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </TableCell>
              <TableCell className="text-right tabular-nums">{u.client_count ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {u.week_of
                  ? new Date(u.week_of + "T12:00:00").toLocaleDateString("es-MX")
                  : "—"}
              </TableCell>
              <TableCell className="capitalize">{u.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
