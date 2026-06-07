"use client";

// Catálogo visual de módulos. Presentacional y NO persistente:
// "Agregar al dock" solo cambia el estado local del botón (vista previa de la idea),
// no modifica el dock real ni guarda nada en BD/sesión. Eso queda para una fase futura
// del motor de personalización. Los módulos que ya viven en el dock por defecto se
// señalan como "Ya en tu dock" en vez de ofrecer un botón de agregar contradictorio.

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Check,
  Plus,
  UserCircle,
  CalendarDays,
  Stethoscope,
  ListChecks,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCK_HREFS } from "@/components/shell/AppDock";

interface CatalogModule {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  // Solo true cuando existe una página real en src/app para este href. Los
  // módulos sin página propia muestran "Próximamente" en vez de "Abrir" — para
  // no llevar al usuario a un 404. Ver auditoría de rutas en NELZZON-EXPERIENCE-1B.
  available: boolean;
}

interface CatalogGroup {
  key: string;
  label: string;
  modules: CatalogModule[];
}

const CATALOG_GROUPS: CatalogGroup[] = [
  {
    key: "atencion",
    label: "Atención al paciente",
    modules: [
      { key: "pacientes",    name: "Pacientes",          description: "Busca, da de alta y revisa la ficha completa de cada paciente.",   href: "/pacientes",    icon: UserCircle,  accent: "bg-blue-500/10 text-blue-600",   available: true },
      { key: "agenda",       name: "Agenda",             description: "Citas, recursos y disponibilidad del día a día de la clínica.",     href: "/agenda",       icon: CalendarDays, accent: "bg-emerald-500/10 text-emerald-600", available: true },
      { key: "consultas",    name: "Consultas",          description: "Historial clínico y notas de cada encuentro con el paciente.",       href: "/consultas",    icon: Stethoscope, accent: "bg-violet-500/10 text-violet-600", available: false },
      { key: "tratamiento",  name: "Plan de tratamiento",description: "Procedimientos propuestos y su seguimiento por estado.",             href: "/tratamiento",  icon: ListChecks,  accent: "bg-amber-500/10 text-amber-600",  available: false },
    ],
  },
  {
    key: "negocio",
    label: "Cobros y administración",
    modules: [
      { key: "presupuestos", name: "Presupuestos",       description: "Cotizaciones con líneas, totales y su ciclo de aprobación.",          href: "/presupuestos", icon: FileText,    accent: "bg-cyan-500/10 text-cyan-600", available: true },
      { key: "cobros",       name: "Cobros",             description: "Pagos registrados y saldos pendientes por paciente.",                 href: "/cobros",       icon: CreditCard,  accent: "bg-teal-500/10 text-teal-600", available: true },
    ],
  },
  {
    key: "organizacion",
    label: "Organización",
    modules: [
      { key: "configuracion",name: "Configuración",      description: "Preferencias de la organización y del módulo de trabajo.",            href: "/configuracion",icon: Settings,    accent: "bg-slate-500/10 text-slate-600", available: false },
    ],
  },
];

interface ModuleCatalogProps {
  onClose: () => void;
}

export function ModuleCatalog({ onClose }: ModuleCatalogProps) {
  const [added, setAdded] = useState<Record<string, boolean>>({});

  function toggleAdded(key: string) {
    setAdded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl ring-1 ring-foreground/10 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Biblioteca de módulos"
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">Biblioteca de módulos</h2>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                Vista previa
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Así se siente explorar y armar tu espacio de trabajo en nelzzon — abre cualquier
              módulo o prueba cómo se vería agregarlo a tu dock.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar biblioteca de módulos"
            className="flex shrink-0 items-center justify-center size-8 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {CATALOG_GROUPS.map((group) => (
            <div key={group.key}>
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-2.5">
                {group.modules.map((mod) => {
                  const isAdded = !!added[mod.key];
                  const inDock = DOCK_HREFS.includes(mod.href);
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.key}
                      className="flex items-center gap-4 rounded-2xl border bg-background px-4 py-3 shadow-sm ring-1 ring-foreground/5 transition-shadow hover:shadow-md"
                    >
                      <span className={cn("flex items-center justify-center size-10 shrink-0 rounded-xl", mod.accent)}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{mod.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!mod.available ? (
                          <span
                            title="Este módulo todavía está en preparación — su página llega en una fase futura"
                            className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground"
                          >
                            En preparación
                          </span>
                        ) : inDock ? (
                          <span
                            title="Este módulo ya vive en tu dock de accesos rápidos"
                            className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Ya en tu dock
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleAdded(mod.key)}
                            title="Vista previa — no se guarda todavía"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              isAdded
                                ? "border-transparent bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {isAdded ? "Agregado" : "Agregar al dock"}
                          </button>
                        )}
                        {mod.available ? (
                          <Link
                            href={mod.href}
                            onClick={onClose}
                            className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                          >
                            Abrir
                          </Link>
                        ) : (
                          <span
                            aria-disabled="true"
                            title="Próximamente — esta página todavía no existe"
                            className="inline-flex cursor-default items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground/70"
                          >
                            Próximamente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-5 py-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Esta biblioteca es una vista previa de hacia dónde va nelzzon — armar y guardar tu
            propio dock de accesos llega con el motor de personalización.
          </p>
        </div>
      </div>
    </div>
  );
}
