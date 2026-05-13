const DEFAULT_NEXT = "/dashboard";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

/** URL de callback PKCE para OAuth (Microsoft / Azure en Supabase). */
export function getAuthCallbackUrl(next: string = DEFAULT_NEXT) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  const nextPath = next.startsWith("/") ? next : `/${next}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
