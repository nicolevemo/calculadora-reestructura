import { createBrowserClient } from "@supabase/ssr";

function assertPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local."
    );
  }
  if (
    url.includes("xxxx") ||
    url.includes("TU-PROYECTO") ||
    url.includes("placeholder")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL no es válida. Copiá la “Project URL” desde Supabase → Settings → API."
    );
  }
  if (
    key.includes("...") ||
    key.length < 80 ||
    key.includes("pega_aqui") ||
    key.includes("anon_completa")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY parece incompleta. Pegá la clave “anon public” completa desde Supabase → Settings → API."
    );
  }
}

export function createClient() {
  assertPublicSupabaseEnv();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
