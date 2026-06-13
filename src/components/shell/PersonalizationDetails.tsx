"use client";

// FASE 1M-F — "Personalizar detalles": colores, iconos, fondos y portadas,
// tarjetas, menú inferior y marca — todo con nombres simples y vistas
// previas, sin chips técnicos. Reutiliza BrandCustomizer y BackgroundCustomizer
// (FASE 1M-D) y ModuleIdentityCustomizer (edición uno por uno, opcional).

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalizationPreviewCanvas } from "@/components/shell/PersonalizationPreviewCanvas";
import { BrandCustomizer } from "@/components/shell/BrandCustomizer";
import { BackgroundCustomizer } from "@/components/shell/BackgroundCustomizer";
import { ModuleIdentityCustomizer } from "@/components/shell/ModuleIdentityCustomizer";
import { VisualPresetSelector } from "@/components/shell/VisualPresetSelector";
import {
  useVisualPreferences,
  COLOR_PALETTES,
  SIMPLE_CARD_STYLES,
  SIMPLE_DOCK_STYLES,
  DOCK_STYLES,
  DOCK_SIZES,
  DOCK_ACTIVE_STYLES,
  DOCK_LABEL_VISIBILITIES,
  type ColorPaletteId,
  type SimpleCardStyleId,
  type SimpleDockStyleId,
  type DockStyle,
  type DockSize,
  type DockActiveStyle,
  type DockLabelVisibility,
  type VisualShadow,
  type VisualRadius,
} from "@/lib/visual-preferences";
import { useModuleIdentities, MODULE_ICON_PACKAGES, type ModuleIconPackageId } from "@/lib/module-identity";

type DetailTab = "colores" | "iconos" | "fondos" | "tarjetas" | "menu" | "marca";

const DOCK_SHADOW_OPTIONS: { key: VisualShadow; label: string }[] = [
  { key: "soft", label: "Suave" },
  { key: "elevated", label: "Elevada" },
  { key: "glass", label: "Glass" },
];

const DOCK_RADIUS_OPTIONS: { key: VisualRadius; label: string }[] = [
  { key: "soft", label: "Suave" },
  { key: "rounded", label: "Redondo" },
  { key: "square", label: "Cuadrado" },
];

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
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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

const TABS: { key: DetailTab; label: string }[] = [
  { key: "colores", label: "Colores" },
  { key: "iconos", label: "Iconos" },
  { key: "fondos", label: "Fondos y portadas" },
  { key: "tarjetas", label: "Tarjetas" },
  { key: "menu", label: "Menú" },
  { key: "marca", label: "Marca" },
];

export function PersonalizationDetails({ initialTab = "colores" }: { initialTab?: DetailTab }) {
  const [tab, setTab] = useState<DetailTab>(initialTab);

  return (
    <div className="space-y-4">
      <PersonalizationPreviewCanvas />

      <nav aria-label="Detalles de personalización" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              tab === t.key ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "colores" && <ColoresSection />}
      {tab === "iconos" && <IconosSection />}
      {tab === "fondos" && <BackgroundCustomizer />}
      {tab === "tarjetas" && <TarjetasSection />}
      {tab === "menu" && <MenuSection />}
      {tab === "marca" && <BrandCustomizer />}
    </div>
  );
}

function ColoresSection() {
  const { preferences, applyColorPalette, resetVisualPreferences } = useVisualPreferences();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Elige una combinación de colores lista para tu negocio.
        </p>
        <button
          type="button"
          onClick={resetVisualPreferences}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Resetear diseño
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {COLOR_PALETTES.map((palette) => {
          const active = preferences.accent === palette.accent && preferences.backgroundPresetId === palette.backgroundPresetId;
          return (
            <button
              key={palette.key}
              type="button"
              aria-pressed={active}
              onClick={() => applyColorPalette(palette.key as ColorPaletteId)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span className="flex shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/[0.06]">
                {palette.swatches.map((color, i) => (
                  <span key={i} aria-hidden className="block size-5" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="min-w-0 flex-1 text-xs font-medium">{palette.label}</span>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-accent" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Ajustes avanzados de apariencia
      </button>

      {showAdvanced && (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <VisualPresetSelector />
        </div>
      )}
    </div>
  );
}

function IconosSection() {
  const { applyIconPackage } = useModuleIdentities();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Elige un paquete completo de iconos para las tarjetas de tu Dashboard.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MODULE_ICON_PACKAGES.map((pkg) => (
          <button
            key={pkg.key}
            type="button"
            onClick={() => applyIconPackage(pkg.key as ModuleIconPackageId)}
            className="flex flex-col gap-1 rounded-xl border border-transparent bg-background/60 p-2.5 text-left transition-all hover:border-foreground/10"
          >
            <span className="text-xs font-semibold">{pkg.label}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">{pkg.description}</span>
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Aplicar paquete
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Editar iconos uno por uno
      </button>

      {showAdvanced && (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <ModuleIdentityCustomizer />
        </div>
      )}
    </div>
  );
}

function TarjetasSection() {
  const { preferences, applySimpleCardStyle } = useVisualPreferences();

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Elige el estilo de las tarjetas de tu Dashboard.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SIMPLE_CARD_STYLES.map((style) => {
          const active = preferences.dashboardCardStyle === style.dashboardCardStyle;
          return (
            <button
              key={style.key}
              type="button"
              aria-pressed={active}
              onClick={() => applySimpleCardStyle(style.key as SimpleCardStyleId)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span className="text-xs font-semibold">{style.label}</span>
              <span className="text-[10px] leading-snug text-muted-foreground">{style.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MenuSection() {
  const {
    preferences,
    applySimpleDockStyle,
    setDockStyle,
    setDockSize,
    setDockActiveStyle,
    setDockLabelVisibility,
    setDockShadow,
    setDockRadius,
  } = useVisualPreferences();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Elige el estilo del menú inferior de accesos rápidos.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SIMPLE_DOCK_STYLES.map((style) => {
          const active = preferences.dockStyle === style.dockStyle && preferences.dockSize === style.dockSize && preferences.dockLabelVisibility === style.dockLabelVisibility;
          return (
            <button
              key={style.key}
              type="button"
              aria-pressed={active}
              onClick={() => applySimpleDockStyle(style.key as SimpleDockStyleId)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span className="text-xs font-semibold">{style.label}</span>
              <span className="text-[10px] leading-snug text-muted-foreground">{style.description}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Ajustes avanzados del menú
      </button>

      {showAdvanced && (
        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <Segmented label="Estilo del menú" options={DOCK_STYLES} value={preferences.dockStyle} onChange={(dockStyle: DockStyle) => setDockStyle(dockStyle)} />
          <Segmented label="Tamaño" options={DOCK_SIZES} value={preferences.dockSize} onChange={(dockSize: DockSize) => setDockSize(dockSize)} />
          <Segmented label="Estilo activo" options={DOCK_ACTIVE_STYLES} value={preferences.dockActiveStyle} onChange={(dockActiveStyle: DockActiveStyle) => setDockActiveStyle(dockActiveStyle)} />
          <Segmented label="Etiquetas" options={DOCK_LABEL_VISIBILITIES} value={preferences.dockLabelVisibility} onChange={(dockLabelVisibility: DockLabelVisibility) => setDockLabelVisibility(dockLabelVisibility)} />
          <Segmented label="Sombra" options={DOCK_SHADOW_OPTIONS} value={preferences.dockShadow} onChange={(dockShadow: VisualShadow) => setDockShadow(dockShadow)} />
          <Segmented label="Radio" options={DOCK_RADIUS_OPTIONS} value={preferences.dockRadius} onChange={(dockRadius: VisualRadius) => setDockRadius(dockRadius)} />
        </div>
      )}
    </div>
  );
}
