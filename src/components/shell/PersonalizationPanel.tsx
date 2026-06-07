"use client";

// Panel de personalización (vista previa). Se abre desde el botón "Personalizar"
// de la topbar o desde la entrada "Personalizar" del sidebar — ambos controlan el
// mismo estado en AppShell. Contiene únicamente controles visuales locales; el motor
// real de personalización persistente (guardar tu vista, acomodar módulos) es trabajo futuro.

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";

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
        "w-[22rem] max-w-[90vw] rounded-2xl border bg-card p-4 shadow-2xl ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Personalizar tu espacio</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Vista previa de cómo se sentirá nelzzon — estos modos no se guardan todavía.
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

      <div className="mt-3">
        <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
      </div>

      <p className="mt-3 border-t pt-2.5 text-[11px] text-muted-foreground leading-snug">
        El motor de personalización real — guardar tu propia vista y acomodar módulos —
        llega en una fase futura.
      </p>
    </div>
  );
}
