"use client";

import { Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mapHeaderAlias,
  normalizeHeaderKey,
  prepareCsvForPapa,
  validateCsvHeaders,
  validateCsvRows,
  type ClienteCsvInsert,
} from "@/lib/csv";
import { CSV_TEMPLATE_FILENAME, CSV_TEMPLATE_PATH } from "@/lib/csv-template";
import { cn } from "@/lib/utils";

type Phase = "idle" | "ready" | "uploading" | "done";

export function GestorCsvUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [filename, setFilename] = useState("");
  const [weekOf, setWeekOf] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ClienteCsvInsert[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [insertedCount, setInsertedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailErrors, setDetailErrors] = useState<string[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setFilename("");
    setWeekOf("");
    setNotes("");
    setRows([]);
    setRawCount(0);
    setInsertedCount(null);
    setError(null);
    setDetailErrors(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const parseFile = useCallback((file: File) => {
    setError(null);
    setDetailErrors(null);
    setFilename(file.name);
    setPhase("idle");

    void (async () => {
      let rawText: string;
      try {
        rawText = await file.text();
      } catch {
        setError("No se pudo leer el archivo.");
        setRows([]);
        setRawCount(0);
        return;
      }

      const { text, delimiter } = prepareCsvForPapa(rawText);

      Papa.parse<Record<string, string>>(text, {
        delimiter,
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => mapHeaderAlias(normalizeHeaderKey(h)),
        complete: (results) => {
          const headerErr = validateCsvHeaders(results.meta.fields);
          if (headerErr) {
            setError(headerErr);
            setRows([]);
            setRawCount(0);
            return;
          }

          const data = (results.data ?? []) as Record<string, string>[];
          const validated = validateCsvRows(data);
          if (!validated.ok) {
            setError("Revisá las filas marcadas abajo.");
            setDetailErrors(validated.errors);
            setRows([]);
            setRawCount(
              data.filter((r) => Object.values(r).some((v) => String(v).trim())).length
            );
            return;
          }

          setRows(validated.rows);
          setRawCount(validated.rows.length);
          setPhase("ready");
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          setError(message || "No se pudo leer el CSV.");
          setRows([]);
          setRawCount(0);
        },
      });
    })();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (!f.name.toLowerCase().endsWith(".csv")) {
        setError("Subí un archivo .csv");
        return;
      }
      parseFile(f);
    },
    [parseFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) parseFile(f);
    },
    [parseFile]
  );

  const submit = async () => {
    if (!rows.length || phase !== "ready") return;
    setPhase("uploading");
    setError(null);
    setDetailErrors(null);

    const body = {
      filename,
      week_of: weekOf.trim() || null,
      notes: notes.trim() || null,
      rows,
    };

    try {
      const res = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        inserted?: number;
        error?: string;
        details?: string[];
      };

      if (!res.ok) {
        setError(json.error ?? "Error al cargar");
        setDetailErrors(Array.isArray(json.details) ? json.details : null);
        setPhase("ready");
        return;
      }

      setPhase("done");
      setInsertedCount(json.inserted ?? 0);
      router.push("/dashboard");
    } catch {
      setError("Falló la red o el servidor.");
      setPhase("ready");
    }
  };

  const preview = rows.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivo CSV</CardTitle>
        <CardDescription>
          Descargá la plantilla con las columnas del shortlist. Obligatorias: AF, Nombre, Saldo
          vencido, Semanalidad actual, Semanalidad siguiente, Plazo y Plataforma. Opcionales:
          Teléfono, Net earnings, Viajes, Originación (new/used) y Vehículo. Se aceptan coma o
          punto y coma, filas vacías al inicio (Excel) y montos con separador de miles con punto
          (6.146) o con coma (7,140). Si el CSV usa coma como separador de columnas, exportá desde
          Excel con punto y coma o poné los montos entre comillas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={CSV_TEMPLATE_PATH} download={CSV_TEMPLATE_FILENAME}>
              <Download className="h-4 w-4" aria-hidden />
              Descargar plantilla CSV
            </a>
          </Button>
        </div>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/40"
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Arrastrá el CSV acá o hacé clic para elegir</p>
          <p className="text-xs text-muted-foreground">Solo .csv — se valida antes de insertar</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            {detailErrors?.length ? (
              <ul className="mt-2 list-inside list-disc text-xs">
                {detailErrors.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {phase === "ready" || phase === "uploading" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filename}</span> —{" "}
              <span className="tabular-nums">{rawCount}</span> filas válidas
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week_of">Semana del shortlist (opcional)</Label>
                <Input
                  id="week_of"
                  type="date"
                  value={weekOf}
                  onChange={(e) => setWeekOf(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Semana 19 — filtro cobranzas"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Vista previa (5 filas)</p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AF</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Adeudo</TableHead>
                      <TableHead className="text-right">Semana</TableHead>
                      <TableHead className="text-right">Sem. sig.</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead className="text-right">Plazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={`${r.af}-${i}`}>
                        <TableCell className="font-mono text-xs">{r.af}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.adeudo}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.semana}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.semana_siguiente}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{r.plataforma}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.plazo_remanente}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={submit} disabled={phase === "uploading"}>
                {phase === "uploading" ? "Cargando…" : "Confirmar e insertar en Supabase"}
              </Button>
              <Button type="button" variant="outline" onClick={reset} disabled={phase === "uploading"}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "done" && insertedCount != null ? (
          <p className="text-sm font-medium text-emerald-700">
            Listo: se insertaron {insertedCount} clientes (negociaciones creadas por trigger). El
            formulario se reinicia en unos segundos.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
