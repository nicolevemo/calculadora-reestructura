import { redirect } from "next/navigation";

import { DevAuthBanner } from "@/components/dev-auth-banner";
import { Sidebar } from "@/components/sidebar";
import { DEV_AUTH_MOCK, isDevAuthBypass } from "@/lib/dev-auth-bypass";
import { getSessionProfile } from "@/lib/session-profile";
import { createClient } from "@/lib/supabase/server";

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

  const { fullName, role } = await getSessionProfile(supabase, user);

  return (
    <div className="flex min-h-screen">
      <Sidebar fullName={fullName} role={role} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
