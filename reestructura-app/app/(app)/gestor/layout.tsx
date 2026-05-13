import { redirect } from "next/navigation";

import { isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export default async function GestorSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isDevAuthBypass()) {
    return <>{children}</>;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { role } = await getSessionProfile(supabase, user);
  if (role !== "gestor" && role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
