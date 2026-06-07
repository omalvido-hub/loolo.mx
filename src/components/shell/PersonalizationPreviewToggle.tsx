"use client";

// Selector visual de "modo de vista" para el panel de personalización. Anticipa el
// futuro motor de personalización de nelzzon: el usuario podrá elegir cómo "siente"
// su espacio (plano, interactivo, edición). Por ahora NO persiste nada — vive dentro
// de PersonalizationPanel como una vista previa de la dirección de producto.

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
    label: "Plano",
    description: "Vista simple y silenciosa, sin acentos extra — pensada para enfocarte en los datos.",
    icon: Layers,
  },
  {
    key: "interactive",
    label: "Interactivo",
    description: "Tarjetas y accesos resaltan al interactuar — la experiencia recomendada por defecto.",
    icon: MousePointerClick,
  },
  {
    key: "edit",
    label: "Edición",
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
  const current = MODES.find((m) => m.key === mode) ?? MODES[0];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="inline-flex w-full items-center gap-1 rounded-full border bg-muted/40 p-1" role="radiogroup" aria-label="Modo de vista">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.key === mode;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(m.key)}
              role="radio"
              aria-checked={active}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="px-1 text-xs leading-snug text-muted-foreground">{current.description}</p>
    </div>
  );
}
