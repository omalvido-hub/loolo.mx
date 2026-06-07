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
  // Solo true cuando existe una página real en src/app para este href. Los
  // accesos sin página propia se muestran como "Próximamente" — sin navegar —
  // para no llevar al usuario a un 404. Ver auditoría de rutas en NELZZON-EXPERIENCE-1B.
  available: boolean;
}

const DOCK_ITEMS: DockItem[] = [
  { label: "Pacientes",   href: "/pacientes",    icon: UserCircle,  permission: "patients.view",    available: true },
  { label: "Agenda",      href: "/agenda",       icon: CalendarDays, permission: "appointments.view", available: true },
  { label: "Consultas",   href: "/consultas",    icon: Stethoscope, permission: "clinical.view",    available: false },
  { label: "Presupuestos",href: "/presupuestos", icon: FileText,    permission: "quote.view",       available: true },
  { label: "Cobros",      href: "/cobros",       icon: CreditCard,  permission: "payment.view",     available: true },
];

// Hrefs con página real en el dock por defecto — el catálogo de módulos los usa
// para mostrar "Ya en tu dock" en vez de un control de "agregar" contradictorio.
export const DOCK_HREFS: string[] = DOCK_ITEMS.filter((item) => item.available).map((item) => item.href);

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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      {open ? (
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label="Ocultar accesos rápidos"
            title="Ocultar accesos rápidos"
            className="absolute -top-2.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center justify-center rounded-full border bg-card p-1 text-muted-foreground shadow-sm ring-1 ring-foreground/[0.06] transition-colors hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" />
          </button>

          <nav
            className="flex max-w-[94vw] items-center gap-0.5 overflow-x-auto rounded-[1.5rem] border bg-card/90 px-2 py-1.5 shadow-[0_16px_44px_-20px_rgba(0,0,0,0.22)] ring-1 ring-foreground/[0.06] backdrop-blur-md"
            aria-label="Accesos rápidos"
          >
            {visibleItems.map((item) => {
              const Icon = item.icon;

              if (!item.available) {
                return (
                  <span
                    key={item.href}
                    title={`${item.label} — próximamente`}
                    aria-disabled="true"
                    className="flex shrink-0 cursor-default flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground/50"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex items-center gap-1">
                      {item.label}
                      <span className="rounded-full bg-muted/70 px-1.5 py-px text-[8px] font-medium tracking-wide text-muted-foreground/80">
                        Pronto
                      </span>
                    </span>
                  </span>
                );
              }

              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="mx-1 h-7 w-px shrink-0 bg-border/70" />

            <button
              type="button"
              onClick={onOpenCatalog}
              title="Agregar — abrir catálogo de módulos"
              className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </nav>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Mostrar accesos rápidos"
          title="Mostrar accesos rápidos"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-card/90 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground shadow-sm ring-1 ring-foreground/[0.06] backdrop-blur transition-colors hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" />
          Mostrar accesos
        </button>
      )}
    </div>
  );
}
