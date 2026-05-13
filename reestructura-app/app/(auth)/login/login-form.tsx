"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setMessage("No pudimos validar el acceso. Probá de nuevo o pedí una nueva invitación.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "No se pudo conectar con el servidor.";
      const isNetwork =
        text.includes("fetch") ||
        text.includes("NetworkError") ||
        err instanceof TypeError;
      setMessage(
        isNetwork
          ? `${text} Revisá que en .env.local tengas la URL y la anon key reales de Supabase (Settings → API), guardá el archivo y reiniciá con npm run dev.`
          : text
      );
    } finally {
      setLoading(false);
    }
  }

  async function onMicrosoftSignIn() {
    setMicrosoftLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: getAuthCallbackUrl("/dashboard"),
          scopes: "email openid profile",
        },
      });
      if (error) {
        setMessage(error.message);
        setMicrosoftLoading(false);
      }
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "No se pudo iniciar sesión con Microsoft.";
      setMessage(text);
      setMicrosoftLoading(false);
    }
  }

  const busy = loading || microsoftLoading;

  return (
    <div className="mt-6 space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={onMicrosoftSignIn}
      >
        {microsoftLoading ? "Redirigiendo a Microsoft…" : "Continuar con Microsoft"}
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">o con correo</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {message ? (
          <p className="text-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {loading ? "Entrando…" : "Iniciar sesión"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/recuperar" className="text-primary underline-offset-4 hover:underline">
            Olvidé mi contraseña
          </Link>
        </p>
      </form>
    </div>
  );
}
