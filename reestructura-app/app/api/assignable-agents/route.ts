import { NextResponse } from "next/server";

import { listAssignableAgents } from "@/lib/assignable-agents";
import { isDevAuthBypass, isDevServerDataOverride } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  if (!isDevAuthBypass()) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    await getSessionProfile(supabase, user);
  } else if (!isDevServerDataOverride()) {
    return NextResponse.json(
      {
        error:
          "En modo bypass local agregá SUPABASE_SERVICE_ROLE_KEY en .env.local para listar agentes.",
      },
      { status: 403 }
    );
  }

  try {
    const agents = await listAssignableAgents(supabase);
    return NextResponse.json({ agents });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar agentes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
