"use client";

// Control puramente visual. Anticipa el futuro motor de personalización de nelzzon:
// el usuario podrá elegir cómo "siente" su espacio de trabajo (plano, interactivo,
// o en edición para acomodar módulos). Por ahora NO persiste nada — es un preview
// de la dirección de producto, sin guardar preferencias en BD ni en sesión.

import { Layers, MousePointerClick, PencilRuler } from "lucide-react";
import { cn } from "@/lib/utils";

export type PersonalizationMode = "flat" | "interactive" | "edit";

const MODES: { key: PersonalizationMode; label: string; icon: React.ElementType }[] = [
  { key: "flat", label: "Modo plano", icon: Layers },
  { key: "interactive", label: "Modo interactivo", icon: MousePointerClick },
  { key: "edit", label: "Editar vista", icon: PencilRuler },
];

interface PersonalizationPreviewToggleProps {
  mode: PersonalizationMode;
  onChange: (mode: PersonalizationMode) => void;
  className?: string;
}

export function PersonalizationPreviewToggle({ mode, onChange, className }: PersonalizationPreviewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5 text-xs",
        className
      )}
      title="Vista previa visual — la personalización real llega en una fase futura"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
