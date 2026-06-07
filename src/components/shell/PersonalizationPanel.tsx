"use client";

// Panel de personalización (vista previa). Se abre desde el botón "Personalizar"
// de la topbar o desde la entrada "Personalizar" del sidebar abierto — ambos
// controlan el mismo estado en AppShell. Contiene únicamente controles visuales
// locales; el motor real de personalización persistente (guardar tu vista, tu
// estilo, acomodar módulos…) es trabajo de una fase futura.

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";
import { VisualStylePreview } from "@/components/shell/VisualStylePreview";

interface PersonalizationPanelProps {
  mode: PersonalizationMode;
  onChange: (mode: PersonalizationMode) => void;
  onClose: () => void;
  className?: string;
}

export function PersonalizationPanel({ mode, onChange, onClose, className }: PersonalizationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Personalizar tu espacio"
      className={cn(
        "w-[23rem] max-w-[92vw] rounded-2xl border bg-card p-4 shadow-2xl ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Personalizar tu espacio</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Vista previa de hacia dónde va nelzzon — nada de esto se guarda todavía.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de personalización"
          className="flex items-center justify-center size-7 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Modo de vista</p>
          <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Estilos visuales</p>
          <VisualStylePreview />
        </div>
      </div>

      <p className="mt-4 border-t pt-2.5 text-[11px] text-muted-foreground leading-snug">
        El motor real de personalización — guardar tu propio estilo, acomodar módulos
        y mucho más — llega en una fase futura.
      </p>
    </div>
  );
}
