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
        "w-[23rem] max-w-[92vw] overflow-hidden rounded-2xl border bg-card shadow-[0_24px_64px_-24px_rgba(0,0,0,0.28)] ring-1 ring-foreground/[0.06]",
        className
      )}
    >
      <div
        aria-hidden
        className="h-1.5 w-full bg-gradient-to-r from-sky-400/70 via-violet-400/70 to-fuchsia-400/70"
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Personalizar tu espacio</p>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                Vista previa
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Prueba cómo se sentiría tu espacio de trabajo — estos controles son visuales,
              nada se guarda todavía.
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

        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de vista</p>
            <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilos visuales</p>
            <VisualStylePreview />
          </div>
        </div>

        <p className="mt-5 border-t pt-3 text-[11px] leading-snug text-muted-foreground">
          Guardar tu propio estilo, acomodar módulos y mucho más llega con el motor de
          personalización — esto es un adelanto de hacia dónde vamos.
        </p>
      </div>
    </div>
  );
}
