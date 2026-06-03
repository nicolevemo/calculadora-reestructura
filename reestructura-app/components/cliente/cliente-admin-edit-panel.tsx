"use client";

import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateClienteFields } from "@/app/actions/cliente";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Estos son los campos que llegan en la carga del CSV/Excel.
 * Solo administradores pueden editarlos desde la vista de detalle.
 */
export type ClienteEditableFields = {
  af: string;
  nombre: string;
  telefono: string | null;
  vehiculo: string | null;
  plataforma: string | null;
  originacion_vehiculo: string | null;
  plazo_remanente: number;
  adeudo: number;
  semana: number;
  semana_siguiente: number;
  ingresos_api: number | null;
  viajes_api: number | null;
};

export type ClienteAdminEditPanelProps = {
  clienteId: string;
  initial: ClienteEditableFields;
};

const ORIG_NULL = "__NULL__";

function toFormString(v: number | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNumber(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

function parseOptionalInt(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[.,]/g, ""));
  if (!Number.isInteger(n) || n < 0) return "invalid";
  return n;
}

function origToSelect(v: string | null): string {
  return v === "new" || v === "used" ? v : ORIG_NULL;
}

export function ClienteAdminEditPanel({
  clienteId,
  initial,
}: ClienteAdminEditPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [af, setAf] = useState(initial.af);
  const [nombre, setNombre] = useState(initial.nombre);
  const [telefono, setTelefono] = useState(initial.telefono ?? "");
  const [vehiculo, setVehiculo] = useState(initial.vehiculo ?? "");
  const [plataforma, setPlataforma] = useState(initial.plataforma ?? "");
  const [originacionVehiculo, setOriginacionVehiculo] = useState<string>(
    origToSelect(initial.originacion_vehiculo)
  );
  const [plazoRemanente, setPlazoRemanente] = useState(toFormString(initial.plazo_remanente));
  const [adeudo, setAdeudo] = useState(toFormString(initial.adeudo));
  const [semana, setSemana] = useState(toFormString(initial.semana));
  const [semanaSiguiente, setSemanaSiguiente] = useState(toFormString(initial.semana_siguiente));
  const [ingresosApi, setIngresosApi] = useState(toFormString(initial.ingresos_api));
  const [viajesApi, setViajesApi] = useState(toFormString(initial.viajes_api));

  const [error, setError] = useState<string | null>(null);

  // Al abrir el modal, reseteamos los campos a los valores actuales del cliente.
  const resetForm = useMemo(
    () => () => {
      setAf(initial.af);
      setNombre(initial.nombre);
      setTelefono(initial.telefono ?? "");
      setVehiculo(initial.vehiculo ?? "");
      setPlataforma(initial.plataforma ?? "");
      setOriginacionVehiculo(origToSelect(initial.originacion_vehiculo));
      setPlazoRemanente(toFormString(initial.plazo_remanente));
      setAdeudo(toFormString(initial.adeudo));
      setSemana(toFormString(initial.semana));
      setSemanaSiguiente(toFormString(initial.semana_siguiente));
      setIngresosApi(toFormString(initial.ingresos_api));
      setViajesApi(toFormString(initial.viajes_api));
      setError(null);
    },
    [initial]
  );

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const isDirty = useMemo(() => {
    return (
      af !== initial.af ||
      nombre !== initial.nombre ||
      telefono !== (initial.telefono ?? "") ||
      vehiculo !== (initial.vehiculo ?? "") ||
      plataforma !== (initial.plataforma ?? "") ||
      originacionVehiculo !== origToSelect(initial.originacion_vehiculo) ||
      plazoRemanente !== toFormString(initial.plazo_remanente) ||
      adeudo !== toFormString(initial.adeudo) ||
      semana !== toFormString(initial.semana) ||
      semanaSiguiente !== toFormString(initial.semana_siguiente) ||
      ingresosApi !== toFormString(initial.ingresos_api) ||
      viajesApi !== toFormString(initial.viajes_api)
    );
  }, [
    initial,
    af,
    nombre,
    telefono,
    vehiculo,
    plataforma,
    originacionVehiculo,
    plazoRemanente,
    adeudo,
    semana,
    semanaSiguiente,
    ingresosApi,
    viajesApi,
  ]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!af.trim()) {
      setError("El AF no puede estar vacío.");
      return;
    }
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (!plataforma.trim()) {
      setError("La plataforma no puede estar vacía.");
      return;
    }

    const plazoNum = parseRequiredNumber(plazoRemanente);
    if (plazoNum == null || !Number.isInteger(plazoNum) || plazoNum <= 0) {
      setError("Plazo remanente debe ser un entero mayor que 0.");
      return;
    }

    const adeudoNum = parseRequiredNumber(adeudo);
    if (adeudoNum == null || adeudoNum < 0) {
      setError("Adeudo debe ser un número ≥ 0.");
      return;
    }

    const semanaNum = parseRequiredNumber(semana);
    if (semanaNum == null || semanaNum < 0) {
      setError("Semanalidad actual debe ser un número ≥ 0.");
      return;
    }

    const semanaSigNum = parseRequiredNumber(semanaSiguiente);
    if (semanaSigNum == null || semanaSigNum < 0) {
      setError("Semanalidad siguiente debe ser un número ≥ 0.");
      return;
    }

    const ingresosParsed = parseOptionalNumber(ingresosApi);
    if (ingresosParsed === "invalid") {
      setError("Ingresos API debe ser un número válido o quedar vacío.");
      return;
    }

    const viajesParsed = parseOptionalInt(viajesApi);
    if (viajesParsed === "invalid") {
      setError("Viajes API debe ser un entero ≥ 0 o quedar vacío.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateClienteFields({
          clienteId,
          af: af.trim(),
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          vehiculo: vehiculo.trim() || null,
          plataforma: plataforma.trim(),
          originacion_vehiculo:
            originacionVehiculo === "new" || originacionVehiculo === "used"
              ? originacionVehiculo
              : null,
          plazo_remanente: plazoNum,
          adeudo: adeudoNum,
          semana: semanaNum,
          semana_siguiente: semanaSigNum,
          ingresos_api: ingresosParsed,
          viajes_api: viajesParsed,
        });

        if (!res.ok) {
          setError(res.error);
          return;
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudieron guardar los datos del cliente."
        );
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar datos del cliente
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar datos del cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estos son los campos que llegan en la carga del Excel. Los cambios se guardan en la
            base de datos y reemplazan los valores cargados.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="AF" required>
                <Input value={af} onChange={(e) => setAf(e.target.value)} required />
              </Field>
              <Field label="Nombre" required>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field label="Vehículo">
                <Input
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field label="Plataforma" required>
                <Input
                  value={plataforma}
                  onChange={(e) => setPlataforma(e.target.value)}
                  required
                />
              </Field>
              <Field label="Originación vehículo">
                <Select value={originacionVehiculo} onValueChange={setOriginacionVehiculo}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ORIG_NULL}>—</SelectItem>
                    <SelectItem value="new">Nuevo (new)</SelectItem>
                    <SelectItem value="used">Usado (used)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Plazo remanente (semanas)" required>
                <Input
                  inputMode="numeric"
                  value={plazoRemanente}
                  onChange={(e) => setPlazoRemanente(e.target.value)}
                  required
                />
              </Field>
              <Field label="Adeudo (saldo vencido)" required>
                <Input
                  inputMode="decimal"
                  value={adeudo}
                  onChange={(e) => setAdeudo(e.target.value)}
                  required
                />
              </Field>
              <Field label="Semanalidad actual" required>
                <Input
                  inputMode="decimal"
                  value={semana}
                  onChange={(e) => setSemana(e.target.value)}
                  required
                />
              </Field>
              <Field label="Semanalidad siguiente" required>
                <Input
                  inputMode="decimal"
                  value={semanaSiguiente}
                  onChange={(e) => setSemanaSiguiente(e.target.value)}
                  required
                />
              </Field>
              <Field label="Ingresos API (Net earnings)">
                <Input
                  inputMode="decimal"
                  value={ingresosApi}
                  onChange={(e) => setIngresosApi(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field label="Viajes API">
                <Input
                  inputMode="numeric"
                  value={viajesApi}
                  onChange={(e) => setViajesApi(e.target.value)}
                  placeholder="—"
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={pending || !isDirty}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
