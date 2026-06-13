"use client";

// Selector real de personalización visual (FASE 1M-A) — vive dentro de
// PersonalizationPanel, sección "Apariencia". A diferencia de
// VisualStylePreview (vista previa local sin efecto), este selector está
// conectado a VisualPreferencesProvider: cambiar preset/acento/densidad/
// sombra/radio/estilo de tarjeta aplica de inmediato en el Dashboard y se
// guarda en localStorage (nelzzon.visualPrefs.v1).

import { cn } from "@/lib/utils";
import {
  useVisualPreferences,
  VISUAL_PRESET_KEYS,
  VISUAL_PRESETS,
  VISUAL_ACCENTS,
  type VisualPreset,
  type VisualDensity,
  type VisualShadow,
  type VisualRadius,
  type VisualCardStyle,
} from "@/lib/visual-preferences";

const DENSITY_OPTIONS: { key: VisualDensity; label: string }[] = [
  { key: "compact", label: "Compacto" },
  { key: "comfortable", label: "Cómodo" },
  { key: "spacious", label: "Amplio" },
];

const SHADOW_OPTIONS: { key: VisualShadow; label: string }[] = [
  { key: "soft", label: "Suave" },
  { key: "elevated", label: "Elevada" },
  { key: "glass", label: "Glass" },
];

const RADIUS_OPTIONS: { key: VisualRadius; label: string }[] = [
  { key: "soft", label: "Suave" },
  { key: "rounded", label: "Redondo" },
  { key: "square", label: "Cuadrado" },
];

const CARD_STYLE_OPTIONS: { key: VisualCardStyle; label: string }[] = [
  { key: "flat", label: "Plano" },
  { key: "bordered", label: "Bordes" },
  { key: "floating", label: "Flotante" },
  { key: "glass", label: "Glass" },
];

const ACCENT_SWATCH_CLASS: Record<string, string> = {
  teal: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="inline-flex w-full items-center gap-1 rounded-full border bg-muted/40 p-1" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.key === value;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              role="radio"
              aria-checked={active}
              className={cn(
                "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                active ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface VisualPresetSelectorProps {
  className?: string;
}

export function VisualPresetSelector({ className }: VisualPresetSelectorProps) {
  const { preferences, setPreset, setAccent, setDensity, setShadow, setRadius, setCardStyle } = useVisualPreferences();

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Preset visual</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VISUAL_PRESET_KEYS.map((key: VisualPreset) => {
            const preset = VISUAL_PRESETS[key];
            const active = preferences.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all",
                  active ? "border-brand-accent/40 bg-brand-accent-soft/40 shadow-sm" : "border-transparent hover:bg-muted/50"
                )}
              >
                <span className="block text-xs font-medium tracking-tight">{preset.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Acento</p>
        <div className="flex flex-wrap gap-2">
          {VISUAL_ACCENTS.map((accent) => {
            const active = preferences.accent === accent.key;
            return (
              <button
                key={accent.key}
                type="button"
                onClick={() => setAccent(accent.key)}
                aria-pressed={active}
                title={accent.label}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full ring-2 transition-all",
                  active ? "ring-foreground/60" : "ring-transparent hover:ring-foreground/20"
                )}
              >
                <span className={cn("size-5 rounded-full", ACCENT_SWATCH_CLASS[accent.key])} />
              </button>
            );
          })}
        </div>
      </div>

      <Segmented label="Densidad" options={DENSITY_OPTIONS} value={preferences.density} onChange={setDensity} />
      <Segmented label="Sombra" options={SHADOW_OPTIONS} value={preferences.shadow} onChange={setShadow} />
      <Segmented label="Radio" options={RADIUS_OPTIONS} value={preferences.radius} onChange={setRadius} />
      <Segmented label="Estilo de tarjeta" options={CARD_STYLE_OPTIONS} value={preferences.cardStyle} onChange={setCardStyle} />

      <p className="px-1 text-[11px] leading-snug text-muted-foreground">
        Estos cambios se aplican ahora mismo al Dashboard y se guardan en este navegador.
      </p>
    </div>
  );
}
