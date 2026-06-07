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
  const activeItem = [...visibleItems, SETTINGS_ITEM].find((item) => isActive(item.href));

  // Rail mínima cuando está colapsado: ya no repite todo el menú (eso lo cubre
  // el dock inferior). Solo deja marca, control de expansión y dónde estás parado —
  // así el dashboard respira más y el sidebar se siente como una pestaña discreta.
  if (collapsed) {
    const ActiveIcon = activeItem?.icon;
    return (
      <aside className="flex flex-col items-center min-h-screen w-[64px] shrink-0 gap-3 border-r bg-sidebar px-2 py-4 transition-[width] duration-200 ease-out">
        <span
          className="flex items-center justify-center size-10 rounded-xl bg-sidebar-accent text-sidebar-accent-foreground text-sm font-bold uppercase"
          title={`${APP_NAME} — ${orgName}`}
        >
          {APP_NAME.slice(0, 1)}
        </span>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expandir menú"
          title="Expandir menú"
          className="flex items-center justify-center size-9 rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="h-px w-7 bg-sidebar-border/60" />

        {activeItem && ActiveIcon && (
          <Link
            href={activeItem.href}
            title={activeItem.label}
            className="flex items-center justify-center size-10 rounded-xl bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <ActiveIcon className="h-4 w-4" />
          </Link>
        )}
      </aside>
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
