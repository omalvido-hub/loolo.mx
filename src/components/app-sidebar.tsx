"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle,
  CalendarDays,
  Stethoscope,
  ClipboardList,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { hasPermission } from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio",            href: "/dashboard",      icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Pacientes",         href: "/pacientes",      icon: UserCircle,      permission: "patients.view" },
  { label: "Agenda",            href: "/agenda",         icon: CalendarDays,    permission: "appointments.view" },
  { label: "Consultas",         href: "/consultas",      icon: Stethoscope,     permission: "clinical.view" },
  { label: "Plan de tratamiento", href: "/tratamiento",  icon: ClipboardList,   permission: "treatment.view" },
  { label: "Presupuestos",      href: "/presupuestos",   icon: FileText,        permission: "quote.view" },
  { label: "Cobros",            href: "/cobros",         icon: CreditCard,      permission: "payment.view" },
  { label: "Configuración",     href: "/configuracion",  icon: Settings,        permission: "settings.view" },
];

interface AppSidebarProps {
  roleKey: string;
  orgName: string;
}

export function AppSidebar({ roleKey, orgName }: AppSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(roleKey, item.permission)
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-sidebar">
      <div className="px-6 py-5 border-b">
        <span className="text-lg font-bold text-sidebar-foreground">{APP_NAME}</span>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
