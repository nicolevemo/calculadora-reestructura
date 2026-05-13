import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isDevServerDataOverride } from "@/lib/dev-auth-bypass";

/**
 * Cliente Supabase en Server Components / Server Actions.
 * Con `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` + `SUPABASE_SERVICE_ROLE_KEY` usa service
 * role (solo local) para ver datos sin login; si no, usa la sesión del usuario.
 */
export function createClient() {
  const cookieStore = cookies();

  if (isDevServerDataOverride()) {
    return createServiceRoleClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* Server Component: cookies() read-only; middleware refreshes session */
          }
        },
      },
    }
  );
}
