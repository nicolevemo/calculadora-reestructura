import { redirect } from "next/navigation";

import { DevAuthBanner } from "@/components/dev-auth-banner";
import { Sidebar } from "@/components/sidebar";
import { DEV_AUTH_MOCK, isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isDevAuthBypass()) {
    return (
      <div className="flex min-h-screen flex-col">
        <DevAuthBanner />
        <div className="flex flex-1">
          <Sidebar fullName={DEV_AUTH_MOCK.fullName} role={DEV_AUTH_MOCK.role} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name?.trim() || user.email || "Usuario";
  const role = (profile?.role as UserRole | undefined) ?? "agente";

  return (
    <div className="flex min-h-screen">
      <Sidebar fullName={fullName} role={role} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
