"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_LEN = 8;

export default function CompletarContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [bienvenida, setBienvenida] = useState(false);

  useEffect(() => {
    setBienvenida(new URLSearchParams(window.location.search).get("bienvenida") === "1");
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setChecking(false);
      if (!user) {
        router.replace("/login");
      }
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < MIN_LEN) {
      setMessage(`La contraseña debe tener al menos ${MIN_LEN} caracteres.`);
      return;
    }
    if (password !== password2) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-center text-lg font-semibold">
          {bienvenida ? "Creá tu contraseña" : "Definir contraseña"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {bienvenida
            ? "Sos nuevo en la plataforma: elegí una contraseña que vayas a recordar. La vas a usar con tu correo para entrar."
            : "Elegí una contraseña para tu cuenta. Después podés iniciar sesión con correo y contraseña."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LEN}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password2">Confirmar contraseña</Label>
            <Input
              id="password2"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LEN}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          {message ? (
            <p className="text-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando…" : "Guardar y continuar"}
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">Ir al login</Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
