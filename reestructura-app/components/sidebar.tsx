import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Upload, Download, LogOut, UserPlus, FileBarChart } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  gestorOnly?: boolean;
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/gestor/invitar",
    label: "Invitar usuarios",
    icon: UserPlus,
    gestorOnly: true,
  },
  { href: "/gestor/cargar", label: "Cargar CSV", icon: Upload, gestorOnly: true },
  {
    href: "/gestor/exportar",
    label: "Exportar",
    icon: Download,
    gestorOnly: true,
  },
  {
    href: "/gestor/reporte-diario",
    label: "Reporte Diario",
    icon: FileBarChart,
    adminOnly: true,
  },
];

export function Sidebar({
  fullName,
  role,
}: {
  fullName: string;
  role: UserRole;
}) {
  const isGestor = role === "gestor" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r bg-card"
      style={{
        display: "flex",
        width: "14rem",
        flexShrink: 0,
        flexDirection: "column",
        borderRight: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <div className="border-b p-4">
        <p className="text-sm font-semibold text-primary">LTO Reestructura</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{fullName}</p>
        <p className="text-xs capitalize text-muted-foreground">{role}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {nav.map((item) => {
          if (item.gestorOnly && !isGestor) return null;
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="border-t p-2">
        <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </form>
    </aside>
  );
}
