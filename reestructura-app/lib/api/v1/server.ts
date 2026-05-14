import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function getIntegrationReadClient() {
  try {
    return createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar Supabase admin";
    return { error: message };
  }
}
