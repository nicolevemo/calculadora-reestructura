/**
 * Modo desarrollo: saltar login y usar perfil simulado en la UI.
 * Activar solo en local con NEXT_PUBLIC_DEV_AUTH_BYPASS=1 en .env.local.
 *
 * Si además tenés SUPABASE_SERVICE_ROLE_KEY en el mismo .env.local, el servidor
 * usa ese cliente para leer/escribir datos (bypasea RLS) y podés probar tablas
 * sin Microsoft ni sesión.
 *
 * Nunca en producción: no subas NEXT_PUBLIC_DEV_AUTH_BYPASS=1 a Vercel.
 */
export function isDevAuthBypass(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";
}

/** Cliente servidor con acceso total (solo con bypass + service role). */
export function isDevServerDataOverride(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return isDevAuthBypass() && !!key && key.length > 30;
}

export const DEV_AUTH_MOCK = {
  fullName: "Modo local (sin sesión)",
  role: "admin" as const,
};
