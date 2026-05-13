"use server";

import { redirect } from "next/navigation";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (isDevAuthBypass()) {
    redirect("/dashboard");
  }
  redirect("/login");
}
