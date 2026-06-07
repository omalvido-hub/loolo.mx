"use client";

// Vista previa de "estilos visuales" para nelzzon. Totalmente local y visual:
// elegir una opción aquí NO cambia el aspecto real de la app ni se guarda en
// ningún lado. Anticipa la visión de producto de que cada negocio (despacho,
// clínica, agencia creativa, estudio de diseño, spa…) podrá vestir su nelzzon
// a su manera. El motor real que aplique y persista un estilo es trabajo futuro.

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StylePreset {
  key: string;
  name: string;
  description: string;
  swatch: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { key: "professional", name: "Profesional", description: "Sobrio y corporativo — para despachos y consultorías.", swatch: "from-slate-700 to-slate-900" },
  { key: "clinical",     name: "Clínico",     description: "Limpio y confiable — blancos, azules y verdes suaves.", swatch: "from-sky-400 to-emerald-400" },
  { key: "creative",     name: "Creativo",    description: "Vivo y dinámico — colores y acentos llamativos.",       swatch: "from-fuchsia-400 to-amber-300" },
  { key: "glass",        name: "Glass",       description: "Translúcido y suave — superficies tipo vidrio.",        swatch: "from-cyan-200 to-indigo-300" },
];

interface VisualStylePreviewProps {
  className?: string;
}

export function VisualStylePreview({ className }: VisualStylePreviewProps) {
  const [selected, setSelected] = useState<string>(STYLE_PRESETS[1].key);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_PRESETS.map((preset) => {
          const active = preset.key === selected;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => setSelected(preset.key)}
              aria-pressed={active}
              title="Vista previa — no cambia nelzzon todavía"
              className={cn(
                "rounded-xl border p-2.5 text-left transition-colors",
                active ? "border-primary/30 bg-primary/[0.05]" : "border-transparent hover:bg-muted/60"
              )}
            >
              <span className={cn("block h-8 w-full rounded-lg bg-gradient-to-r", preset.swatch)} />
              <span className="mt-2 block text-xs font-medium">{preset.name}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground mt-0.5">{preset.description}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-[11px] text-muted-foreground leading-snug">
        Vista previa visual — elegir un estilo aquí no cambia nelzzon todavía.
      </p>
    </div>
  );
}
