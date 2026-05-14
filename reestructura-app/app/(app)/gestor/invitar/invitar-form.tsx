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

type PlatformUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  agente: "Agente",
  gestor: "Gestor",
  admin: "Admin",
};

export function InvitarUsuariosForm({ callerRole }: { callerRole: UserRole }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("agente");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUserRow[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

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

  const loadPlatformUsers = useCallback(async () => {
    setUsersError(null);
    const res = await fetch("/api/users");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUsersError(typeof json.error === "string" ? json.error : "No se pudo cargar usuarios");
      return;
    }
    setPlatformUsers(json.users ?? []);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    if (callerRole !== "admin") return;
    loadPlatformUsers();
  }, [callerRole, loadPlatformUsers]);

  async function onRoleChange(userId: string, nextRole: UserRole) {
    const current = platformUsers.find((user) => user.id === userId);
    if (!current || current.role === nextRole) return;

    setRoleSavingId(userId);
    setRoleError(null);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: nextRole }),
    });
    const json = await res.json().catch(() => ({}));
    setRoleSavingId(null);

    if (!res.ok) {
      const err =
        typeof json.error === "string"
          ? json.error
          : JSON.stringify(json.error ?? "No se pudo actualizar el rol");
      setRoleError(err);
      return;
    }

    const updated = json.user as PlatformUserRow | undefined;
    if (updated) {
      setPlatformUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    } else {
      loadPlatformUsers();
    }
    loadInvites();
  }

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
    if (callerRole === "admin") {
      loadPlatformUsers();
    }
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

      {callerRole === "admin" ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Usuarios en la plataforma</h2>
            <p className="text-sm text-muted-foreground">
              Cuentas con perfil activo. Cambiá el rol desde aquí; también se actualiza la
              invitación asociada al mismo correo.
            </p>
          </div>
          {roleError ? <p className="text-sm text-destructive">{roleError}</p> : null}
          {usersError ? (
            <p className="text-sm text-destructive">{usersError}</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead>Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No hay usuarios conectados para mostrar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    platformUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name?.trim() || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDateTime(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => onRoleChange(user.id, value as UserRole)}
                            disabled={roleSavingId === user.id}
                          >
                            <SelectTrigger className="w-[10rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ROLE_LABELS) as UserRole[]).map((roleKey) => (
                                <SelectItem key={roleKey} value={roleKey}>
                                  {ROLE_LABELS[roleKey]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

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
