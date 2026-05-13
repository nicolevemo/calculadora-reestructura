import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  if (isDevAuthBypass()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-primary">
          LTO Reestructura
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Entrá con Microsoft o con el correo y contraseña que definiste al aceptar la invitación.
        </p>
        <Suspense fallback={<p className="mt-6 text-center text-sm">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
