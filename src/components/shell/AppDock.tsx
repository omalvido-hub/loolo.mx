"use client";

// Dock inferior estilo "OS". Presentacional: accesos rápidos a módulos frecuentes
// más un botón "Agregar" que abre el catálogo de módulos. Colapsable con estado local;
// no persiste preferencias — es la base visual para la futura personalización.

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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-3">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={open ? "Ocultar dock" : "Mostrar dock"}
          title={open ? "Ocultar dock" : "Mostrar dock"}
          className="flex items-center justify-center size-6 rounded-full border bg-card text-muted-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {open && (
          <nav
            className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border bg-card/95 px-2.5 py-2 shadow-xl ring-1 ring-foreground/10 backdrop-blur supports-[backdrop-filter]:bg-card/80 max-w-[92vw]"
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
                    "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors shrink-0",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            <div className="mx-1 h-8 w-px shrink-0 bg-border" />

            <button
              type="button"
              onClick={onOpenCatalog}
              title="Agregar — abrir catálogo de módulos"
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors shrink-0 hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
              Agregar
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
