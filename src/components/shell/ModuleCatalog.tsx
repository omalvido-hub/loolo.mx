"use client";

// Catálogo visual de módulos. Presentacional y NO persistente:
// "Agregar al dock" solo cambia el estado local del botón (vista previa de la idea),
// no modifica el dock real ni guarda nada en BD/sesión. Eso queda para una fase futura
// del motor de personalización.

import { useState } from "react";
import Link from "next/link";
import { X, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogModule {
  key: string;
  emoji: string;
  name: string;
  description: string;
  href: string;
}

const CATALOG_MODULES: CatalogModule[] = [
  { key: "pacientes",   emoji: "🧑‍⚕️", name: "Pacientes",          description: "Busca, da de alta y revisa la ficha completa de cada paciente.", href: "/pacientes" },
  { key: "agenda",      emoji: "🗓️",  name: "Agenda",              description: "Citas, recursos y disponibilidad del día a día de la clínica.", href: "/agenda" },
  { key: "consultas",   emoji: "🩺",  name: "Consultas",           description: "Historial clínico y notas de cada encuentro con el paciente.", href: "/consultas" },
  { key: "tratamiento", emoji: "📋",  name: "Plan de tratamiento", description: "Procedimientos propuestos y su seguimiento por estado.", href: "/tratamiento" },
  { key: "presupuestos",emoji: "🧾",  name: "Presupuestos",        description: "Cotizaciones con líneas, totales y su ciclo de aprobación.", href: "/presupuestos" },
  { key: "cobros",      emoji: "💳",  name: "Cobros",              description: "Pagos registrados y saldos pendientes por paciente.", href: "/cobros" },
  { key: "configuracion",emoji: "⚙️", name: "Configuración",       description: "Preferencias de la organización y del módulo de trabajo.", href: "/configuracion" },
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
        className="w-full max-w-2xl rounded-t-2xl border bg-card shadow-2xl ring-1 ring-foreground/10 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Catálogo de módulos"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Catálogo de módulos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vista previa — explora los módulos disponibles y prueba cómo se vería agregarlos a tu dock.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar catálogo"
            className="flex items-center justify-center size-8 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-2.5">
          {CATALOG_MODULES.map((mod) => {
            const isAdded = !!added[mod.key];
            return (
              <div
                key={mod.key}
                className="flex items-center gap-4 rounded-xl border bg-background px-4 py-3 ring-1 ring-foreground/5"
              >
                <span className="flex items-center justify-center size-10 shrink-0 rounded-lg bg-muted text-lg">
                  {mod.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{mod.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                  <Link
                    href={mod.href}
                    onClick={onClose}
                    className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t px-5 py-3">
          <p className="text-[11px] text-muted-foreground">
            "Agregar al dock" es una vista previa visual — la personalización real (guardar tu propio dock) llega en una fase futura.
          </p>
        </div>
      </div>
    </div>
  );
}
