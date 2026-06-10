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
import { BrandLogo } from "@/components/brand/BrandLogo";
import { hasPermission } from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string;
  // Solo true cuando existe una página real en src/app para este href. Los
  // accesos sin página propia se muestran como "Próximamente" — sin navegar —
  // para no llevar al usuario a un 404. Mismo patrón que AppDock/ModuleCatalog
  // (ver auditoría de rutas en NELZZON-EXPERIENCE-1B / NELZZON-MODULE-SAFETY-1A).
  available: boolean;
}

// "Configuración" vive aparte, anclada al pie del menú expandido junto a
// "Personalizar" — para distinguirla del menú operativo principal.
const NAV_ITEMS: NavItem[] = [
  { label: "Inicio",            href: "/dashboard",      icon: LayoutDashboard, permission: "dashboard.view",    available: true },
  { label: "Pacientes",         href: "/pacientes",      icon: UserCircle,      permission: "patients.view",     available: true },
  { label: "Agenda",            href: "/agenda",         icon: CalendarDays,    permission: "appointments.view", available: true },
  { label: "Consultas",         href: "/consultas",      icon: Stethoscope,     permission: "clinical.view",     available: false },
  { label: "Plan de tratamiento", href: "/tratamiento",  icon: ClipboardList,   permission: "treatment.view",    available: false },
  { label: "Presupuestos",      href: "/presupuestos",   icon: FileText,        permission: "quote.view",        available: true },
  { label: "Cobros",            href: "/cobros",         icon: CreditCard,      permission: "payment.view",      available: true },
];

const SETTINGS_ITEM: NavItem = {
  label: "Configuración", href: "/configuracion", icon: Settings, permission: "settings.view", available: false,
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

  // Colapsado = invisible a propósito: el dock inferior ya cubre los accesos
  // rápidos, así que aquí no repetimos marca, sección activa ni menú, y no
  // reservamos columna ni dejamos línea divisoria. El control para reabrir vive
  // en la topbar como SidebarMenuTrigger — alineado con ella, no flotando suelto.
  if (collapsed) {
    return null;
  }

  return (
    <aside className="flex flex-col min-h-screen w-64 shrink-0 border-r bg-sidebar transition-[width] duration-200 ease-out">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-5">
        <div className="min-w-0">
          <BrandLogo size="compact" className="text-sidebar-foreground" />
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{orgName}</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Colapsar menú"
          title="Colapsar menú"
          className="flex items-center justify-center size-7 shrink-0 rounded-full border bg-card text-sidebar-foreground/60 shadow-sm ring-1 ring-foreground/[0.06] transition-colors hover:text-sidebar-accent-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          if (!item.available) {
            return (
              <span
                key={item.href}
                title={`${item.label} — próximamente`}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-default"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex items-center gap-2">
                  {item.label}
                  <span className="rounded-full bg-sidebar-accent/60 px-1.5 py-px text-[10px] font-medium tracking-wide text-sidebar-foreground/60">
                    Próximamente
                  </span>
                </span>
              </span>
            );
          }

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
          SETTINGS_ITEM.available ? (
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
          ) : (
            <span
              title={`${SETTINGS_ITEM.label} — próximamente`}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-default"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex items-center gap-2">
                {SETTINGS_ITEM.label}
                <span className="rounded-full bg-sidebar-accent/60 px-1.5 py-px text-[10px] font-medium tracking-wide text-sidebar-foreground/60">
                  Próximamente
                </span>
              </span>
            </span>
          )
        )}
      </div>
    </aside>
  );
}

interface SidebarMenuTriggerProps {
  onClick: () => void;
}

// Control para reabrir el menú cuando el sidebar está colapsado. Vive dentro de
// la topbar (no flotando sobre el contenido): así queda al nivel de la barra,
// con la separación que le da el gap del header, y no invade el dashboard.
export function SidebarMenuTrigger({ onClick }: SidebarMenuTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir menú"
      title="Abrir menú"
      className="flex shrink-0 items-center justify-center size-8 rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <PanelLeftOpen className="h-4 w-4" />
    </button>
  );
}
