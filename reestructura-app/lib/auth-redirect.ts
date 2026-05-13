import { getConfiguredAppOrigin } from "@/lib/request-origin";

const DEFAULT_NEXT = "/dashboard";

/** URL de callback PKCE para OAuth (Microsoft / Azure en Supabase). */
export function getAuthCallbackUrl(next: string = DEFAULT_NEXT) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : getConfiguredAppOrigin() ?? "http://localhost:3000";

  const nextPath = next.startsWith("/") ? next : `/${next}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
