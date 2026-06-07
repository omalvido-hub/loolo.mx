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
  Sparkles,
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

// "Configuración" vive aparte, anclada al pie del menú expandido junto a
// "Personalizar" — para distinguirla del menú operativo principal.
const NAV_ITEMS: NavItem[] = [
  { label: "Inicio",            href: "/dashboard",      icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Pacientes",         href: "/pacientes",      icon: UserCircle,      permission: "patients.view" },
  { label: "Agenda",            href: "/agenda",         icon: CalendarDays,    permission: "appointments.view" },
  { label: "Consultas",         href: "/consultas",      icon: Stethoscope,     permission: "clinical.view" },
  { label: "Plan de tratamiento", href: "/tratamiento",  icon: ClipboardList,   permission: "treatment.view" },
  { label: "Presupuestos",      href: "/presupuestos",   icon: FileText,        permission: "quote.view" },
  { label: "Cobros",            href: "/cobros",         icon: CreditCard,      permission: "payment.view" },
];

const SETTINGS_ITEM: NavItem = {
  label: "Configuración", href: "/configuracion", icon: Settings, permission: "settings.view",
};

interface AppSidebarProps {
  roleKey: string;
  orgName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenPersonalization: () => void;
}

export function AppSidebar({ roleKey, orgName, collapsed, onToggleCollapse, onOpenPersonalization }: AppSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(roleKey, item.permission));
  const showSettings = hasPermission(roleKey, SETTINGS_ITEM.permission);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Colapsado = casi invisible a propósito: el dock inferior ya cubre los accesos
  // rápidos, así que aquí no repetimos marca, sección activa ni menú. Tampoco
  // reservamos columna: el botón flota sobre el contenido (fixed, fuera del flujo)
  // para que el dashboard ocupe todo el ancho y no quede ninguna línea divisoria.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label="Abrir menú"
        title="Abrir menú"
        className="fixed left-3 top-4 z-40 flex items-center justify-center size-9 rounded-full border bg-card/90 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors hover:text-foreground"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="flex flex-col min-h-screen w-64 shrink-0 border-r bg-sidebar transition-[width] duration-200 ease-out">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-5">
        <div className="min-w-0">
          <span className="text-lg font-bold text-sidebar-foreground">{APP_NAME}</span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Colapsar menú"
          title="Colapsar menú"
          className="flex items-center justify-center size-7 shrink-0 rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
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

      <div className="border-t px-3 py-3 space-y-1">
        <button
          type="button"
          onClick={onOpenPersonalization}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          Personalizar
        </button>
        {showSettings && (
          <Link
            href={SETTINGS_ITEM.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(SETTINGS_ITEM.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {SETTINGS_ITEM.label}
          </Link>
        )}
      </div>
    </aside>
  );
}
