"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserRole } from "@/lib/types";

type InviteRow = {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  in_platform?: boolean;
  profile_id?: string | null;
  profile_created_at?: string | null;
};

export function InvitarUsuariosForm({ callerRole }: { callerRole: UserRole }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("agente");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setListError(null);
    const res = await fetch("/api/invite");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setListError(json.error ?? "No se pudo cargar el listado");
      return;
    }
    setInvites(json.invites ?? []);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        role,
        full_name: fullName.trim() || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      const err =
        typeof json.error === "string"
          ? json.error
          : JSON.stringify(json.error ?? "Error");
      setMessage(err);
      return;
    }
    setMessage("Invitación enviada. Revisá que el correo llegue (y spam).");
    setEmail("");
    setFullName("");
    setRole("agente");
    loadInvites();
  }

  const canPickGestor = callerRole === "admin";

  return (
    <div className="space-y-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Invitar usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre completo (opcional)</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as UserRole)}
                disabled={callerRole === "gestor"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  {canPickGestor ? (
                    <>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </>
                  ) : null}
                </SelectContent>
              </Select>
              {callerRole === "gestor" ? (
                <p className="text-xs text-muted-foreground">
                  Como gestor solo podés invitar agentes.
                </p>
              ) : null}
            </div>
            {message ? (
              <p
                className={
                  message.startsWith("Invitación")
                    ? "text-sm text-green-700"
                    : "text-sm text-destructive"
                }
                role="status"
              >
                {message}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando…" : "Enviar invitación"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Invitaciones recientes</h2>
        {listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Invitado</TableHead>
                  <TableHead>En plataforma</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No hay invitaciones para mostrar.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell className="capitalize">{inv.role}</TableCell>
                      <TableCell>{inv.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDateTime(inv.invited_at)}
                      </TableCell>
                      <TableCell>
                        {inv.in_platform ? (
                          <span className="text-emerald-700">
                            Sí
                            {inv.profile_created_at ? (
                              <span className="block text-xs text-muted-foreground">
                                {fmtDateTime(inv.profile_created_at)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inv.revoked_at
                          ? "Revocado"
                          : inv.accepted_at
                            ? "Aceptado"
                            : "Pendiente"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
