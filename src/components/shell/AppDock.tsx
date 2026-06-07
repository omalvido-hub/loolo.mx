"use client";

// Dock inferior estilo "OS". Presentacional: accesos rápidos a módulos frecuentes
// más un botón "Agregar" que abre el catálogo de módulos. Colapsable con estado
// local; no persiste preferencias — es la base visual para la futura personalización.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle, CalendarDays, Stethoscope, FileText, CreditCard, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

interface DockItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string;
}

const DOCK_ITEMS: DockItem[] = [
  { label: "Pacientes",   href: "/pacientes",    icon: UserCircle,  permission: "patients.view" },
  { label: "Agenda",      href: "/agenda",       icon: CalendarDays, permission: "appointments.view" },
  { label: "Consultas",   href: "/consultas",    icon: Stethoscope, permission: "clinical.view" },
  { label: "Presupuestos",href: "/presupuestos", icon: FileText,    permission: "quote.view" },
  { label: "Cobros",      href: "/cobros",       icon: CreditCard,  permission: "payment.view" },
];

interface AppDockProps {
  roleKey: string;
  open: boolean;
  onToggleOpen: () => void;
  onOpenCatalog: () => void;
}

export function AppDock({ roleKey, open, onToggleOpen, onOpenCatalog }: AppDockProps) {
  const pathname = usePathname();
  const visibleItems = DOCK_ITEMS.filter((item) => hasPermission(roleKey, item.permission));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 pb-4">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label={open ? "Ocultar accesos rápidos" : "Mostrar accesos rápidos"}
        title={open ? "Ocultar accesos rápidos" : "Mostrar accesos rápidos"}
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-card/90 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground shadow-sm ring-1 ring-foreground/[0.06] backdrop-blur transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        {open ? "Ocultar accesos" : "Mostrar accesos"}
      </button>

      {open && (
        <nav
          className="pointer-events-auto flex max-w-[94vw] items-center gap-1 overflow-x-auto rounded-[1.75rem] border bg-card/90 px-3 py-2.5 shadow-[0_20px_56px_-20px_rgba(0,0,0,0.24)] ring-1 ring-foreground/[0.06] backdrop-blur-md"
          aria-label="Accesos rápidos"
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3.5 py-2 text-[11px] font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          <div className="mx-1.5 h-9 w-px shrink-0 bg-border/70" />

          <button
            type="button"
            onClick={onOpenCatalog}
            title="Agregar — abrir catálogo de módulos"
            className="flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3.5 py-2 text-[11px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            Agregar
          </button>
        </nav>
      )}
    </div>
  );
}
