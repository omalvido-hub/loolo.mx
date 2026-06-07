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
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ roleKey, orgName, collapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(roleKey, item.permission)
  );

  return (
    <aside
      className={cn(
        "flex flex-col min-h-screen border-r bg-sidebar shrink-0 transition-[width] duration-200 ease-out",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-5",
          collapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        {collapsed ? (
          <span
            className="flex items-center justify-center size-9 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-bold uppercase"
            title={`${APP_NAME} — ${orgName}`}
          >
            {APP_NAME.slice(0, 1)}
          </span>
        ) : (
          <div className="min-w-0">
            <span className="text-lg font-bold text-sidebar-foreground">{APP_NAME}</span>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="flex items-center justify-center size-7 rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
