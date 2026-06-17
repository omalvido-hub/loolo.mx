"use client";

// Personalizar > Marca (FASE 1M-D) — nombre visible, lema corto, tamaño,
// estilo de texto y estilo de símbolo para la marca de nelzzon dentro de tu
// espacio. Se aplica de inmediato en la vista previa y en el bloque de marca
// del menú lateral (AppSidebar), vía data-visual-brand-* en <html> + el
// contexto de VisualPreferencesProvider. No modifica el logo oficial ni el
// nombre de tu organización — todo es local, en este navegador.

import { cn } from "@/lib/utils";
import {
  useVisualPreferences,
  VISUAL_BRAND_SIZES,
  VISUAL_BRAND_TEXT_STYLES,
  VISUAL_BRAND_SYMBOL_STYLES,
  type VisualBrandSize,
  type VisualBrandTextStyle,
  type VisualBrandSymbolStyle,
} from "@/lib/visual-preferences";

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
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
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
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active ? "border-brand-accent/40 bg-brand-accent-soft text-brand-accent" : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground"
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

export function BrandCustomizer() {
  const {
    editorPreferences: preferences,
    setBrandName,
    setBrandTagline,
    setBrandSize,
    setBrandTextStyle,
    setBrandSymbolStyle,
    resetBrand,
  } = useVisualPreferences();

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Personaliza cómo se presenta tu marca dentro de nelzzon — se ve en la vista previa y en el menú
        lateral. No cambia tu logo oficial ni el nombre de tu organización.
      </p>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nombre visible</p>
        <input
          type="text"
          value={preferences.brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="nelzzon"
          className="w-full rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lema corto</p>
        <input
          type="text"
          value={preferences.brandTagline}
          onChange={(e) => setBrandTagline(e.target.value)}
          placeholder="Sistema operativo para servicios"
          className="w-full rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <Segmented
        label="Tamaño de marca"
        options={VISUAL_BRAND_SIZES}
        value={preferences.brandSize}
        onChange={(brandSize: VisualBrandSize) => setBrandSize(brandSize)}
      />

      <Segmented
        label="Estilo de texto"
        options={VISUAL_BRAND_TEXT_STYLES}
        value={preferences.brandTextStyle}
        onChange={(brandTextStyle: VisualBrandTextStyle) => setBrandTextStyle(brandTextStyle)}
      />

      <Segmented
        label="Estilo de símbolo"
        options={VISUAL_BRAND_SYMBOL_STYLES}
        value={preferences.brandSymbolStyle}
        onChange={(brandSymbolStyle: VisualBrandSymbolStyle) => setBrandSymbolStyle(brandSymbolStyle)}
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Guardado en este navegador — cada cambio se aplica y se guarda automáticamente.
        </p>
        <button
          type="button"
          onClick={resetBrand}
          className="inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear marca
        </button>
      </div>
    </div>
  );
}
