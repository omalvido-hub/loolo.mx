"use client";

// Selector visual de "modo de vista". Anticipa el futuro motor de personalización
// de nelzzon: el usuario podrá elegir cómo "siente" su espacio de trabajo (plano,
// interactivo, o en edición para acomodar módulos). Vive dentro de PersonalizationPanel.
// Por ahora NO persiste nada — es un preview de la dirección de producto.

import { Layers, MousePointerClick, PencilRuler } from "lucide-react";
import { cn } from "@/lib/utils";

export type PersonalizationMode = "flat" | "interactive" | "edit";

const MODES: {
  key: PersonalizationMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "flat",
    label: "Modo plano",
    description: "Vista simple y silenciosa — sin acentos extra, ideal para enfocarte en los datos.",
    icon: Layers,
  },
  {
    key: "interactive",
    label: "Modo interactivo",
    description: "Tarjetas y accesos resaltan al interactuar — la experiencia recomendada por defecto.",
    icon: MousePointerClick,
  },
  {
    key: "edit",
    label: "Editar vista",
    description: "Vista previa de cómo se sentirá acomodar tus propios módulos (próximamente).",
    icon: PencilRuler,
  },
];

interface PersonalizationPreviewToggleProps {
  mode: PersonalizationMode;
  onChange: (mode: PersonalizationMode) => void;
  className?: string;
}

export function PersonalizationPreviewToggle({ mode, onChange, className }: PersonalizationPreviewToggleProps) {
  return (
    <div className={cn("space-y-1.5", className)} role="radiogroup" aria-label="Modo de vista">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            role="radio"
            aria-checked={active}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-primary/25 bg-primary/[0.06]"
                : "border-transparent hover:bg-muted/60"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center size-8 shrink-0 rounded-lg transition-colors",
                active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{m.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
