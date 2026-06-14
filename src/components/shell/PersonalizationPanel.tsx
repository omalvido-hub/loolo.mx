"use client";

// Personalizar nelzzon — modal "Personalizar tu sistema" (rediseño FASE 1M-F).
// Pantalla grande y centrada, no un popover anclado. Seis bloques —
// Estilo general, Colores y fondos, Tarjetas y widgets, Iconos, Accesos y
// menú, Tipografía — cada uno con controles reales ya existentes
// (VisualPresetSelector, BackgroundCustomizer, ModuleIdentityCustomizer,
// BrandCustomizer, controles de dock y de tarjetas) más una vista previa en
// vivo. Todo se aplica de inmediato y se guarda en localStorage.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Search,
  Sparkles,
  Palette,
  LayoutGrid,
  PanelLeft,
  Type,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";
import { VisualPresetSelector } from "@/components/shell/VisualPresetSelector";
import { PersonalizationPreviewCanvas } from "@/components/shell/PersonalizationPreviewCanvas";
import { ModuleIdentityCustomizer } from "@/components/shell/ModuleIdentityCustomizer";
import { BackgroundCustomizer } from "@/components/shell/BackgroundCustomizer";
import { BrandCustomizer } from "@/components/shell/BrandCustomizer";
import {
  useVisualPreferences,
  BUSINESS_VISUAL_TEMPLATES,
  BUSINESS_TEMPLATE_KEYS,
  BACKGROUND_GALLERY,
  MODULE_TILE_STYLES,
  DASHBOARD_CARD_STYLES,
  DOCK_STYLES,
  DOCK_SIZES,
  DOCK_ACTIVE_STYLES,
  DOCK_LABEL_VISIBILITIES,
  type BusinessTemplateId,
  type ModuleTileStyle,
  type DashboardCardStyle,
  type DockStyle,
  type DockSize,
  type DockActiveStyle,
  type DockLabelVisibility,
  type VisualShadow,
  type VisualRadius,
} from "@/lib/visual-preferences";

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

function BusinessTemplatesSection() {
  const { preferences, applyBusinessTemplate, resetBusinessTemplate } = useVisualPreferences();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Plantillas por tipo de negocio</p>
        <button
          type="button"
          onClick={resetBusinessTemplate}
          className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Restaurar estilo base
        </button>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Cambia de un golpe el estilo visual completo de tu nelzzon — fondo, tarjetas, módulos, iconos y dock.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUSINESS_TEMPLATE_KEYS.map((key) => {
          const tpl = BUSINESS_VISUAL_TEMPLATES[key];
          const bg = BACKGROUND_GALLERY.find((entry) => entry.id === tpl.backgroundPreset);
          const active = preferences.businessTemplateId === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => applyBusinessTemplate(key as BusinessTemplateId)}
              className={cn(
                "group flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span
                aria-hidden
                className="block h-10 w-full rounded-lg ring-1 ring-foreground/[0.06]"
                style={{ backgroundImage: bg?.preview }}
              />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold">{tpl.label}</span>
                <span className="block truncate text-[10px] leading-snug text-muted-foreground">{tpl.usage}</span>
              </span>
              {active && (
                <span className="inline-flex items-center self-start rounded-full bg-brand-accent-soft px-1.5 py-px text-[9px] font-medium text-brand-accent">
                  Activa
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PersonalizationActions() {
  const { resetVisualPreferences, resetAllPersonalization } = useVisualPreferences();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Guardado en este navegador — cada cambio se aplica y se guarda automáticamente.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={resetVisualPreferences}
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear diseño
        </button>
        <button
          type="button"
          onClick={resetAllPersonalization}
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Resetear todo
        </button>
      </div>
    </div>
  );
}

// Bloque 3 (Tarjetas y widgets) — estilo de las tarjetas KPI del Dashboard.
// Expone dashboardCardStyle (ya aplicado vía data-visual-dashboard-card en
// globals.css) con el mismo patrón de cuadrícula que "Estilo de módulos".
function DashboardCardStyleSection() {
  const { preferences, setDashboardCardStyle } = useVisualPreferences();

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilo de tarjetas del Dashboard</p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Define la apariencia de las tarjetas KPI del Dashboard.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {DASHBOARD_CARD_STYLES.map((opt) => {
          const active = preferences.dashboardCardStyle === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              title={opt.label}
              onClick={() => setDashboardCardStyle(opt.key as DashboardCardStyle)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30 bg-brand-accent-soft" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span aria-hidden className="block h-6 w-full rounded-md bg-foreground/10" />
              <span className="truncate text-[10px] font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Bloque 3 (Tarjetas y widgets) — forma y textura de las tarjetas de módulo
// en toda la app (antes vivía dentro de ModuleIdentityCustomizer).
function ModuleTileStyleSection() {
  const { preferences, setModuleTileStyle } = useVisualPreferences();

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilo de módulos</p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Define la forma y textura de las tarjetas de módulo en todo nelzzon.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {MODULE_TILE_STYLES.map((opt) => {
          const active = preferences.moduleTileStyle === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              title={opt.description}
              onClick={() => setModuleTileStyle(opt.key as ModuleTileStyle)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                active ? "border-brand-accent/50 ring-2 ring-brand-accent/30 bg-brand-accent-soft" : "border-transparent bg-background/60 hover:border-foreground/10"
              )}
            >
              <span aria-hidden className="block h-6 w-full rounded-md bg-foreground/10" />
              <span className="truncate text-[10px] font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Bloque 3 (Tarjetas y widgets) — tamaño y forma del dock inferior.
function DockSizeSection() {
  const { preferences, setDockSize, setDockShadow, setDockRadius } = useVisualPreferences();

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dock inferior — tamaño y forma</p>
      <Segmented label="Tamaño" options={DOCK_SIZES} value={preferences.dockSize} onChange={(dockSize: DockSize) => setDockSize(dockSize)} />
      <Segmented label="Sombra" options={DOCK_SHADOW_OPTIONS} value={preferences.dockShadow} onChange={(dockShadow: VisualShadow) => setDockShadow(dockShadow)} />
      <Segmented label="Radio" options={DOCK_RADIUS_OPTIONS} value={preferences.dockRadius} onChange={(dockRadius: VisualRadius) => setDockRadius(dockRadius)} />
    </div>
  );
}

// Bloque 5 (Accesos y menú) — estilo, resaltado y etiquetas del dock inferior.
function DockStyleSection() {
  const { preferences, setDockStyle, setDockActiveStyle, setDockLabelVisibility } = useVisualPreferences();

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dock inferior — accesos rápidos</p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Estilo del menú de accesos rápidos en la parte inferior de la pantalla.
      </p>
      <Segmented label="Estilo del dock" options={DOCK_STYLES} value={preferences.dockStyle} onChange={(dockStyle: DockStyle) => setDockStyle(dockStyle)} />
      <Segmented label="Estilo activo" options={DOCK_ACTIVE_STYLES} value={preferences.dockActiveStyle} onChange={(dockActiveStyle: DockActiveStyle) => setDockActiveStyle(dockActiveStyle)} />
      <Segmented label="Etiquetas" options={DOCK_LABEL_VISIBILITIES} value={preferences.dockLabelVisibility} onChange={(dockLabelVisibility: DockLabelVisibility) => setDockLabelVisibility(dockLabelVisibility)} />
    </div>
  );
}

interface PersonalizationBlock {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badgeClass: string;
}

// Seis bloques — coinciden con la referencia aprobada "Personalizar tu
// sistema". Cada uno agrupa controles reales ya existentes.
const BLOCKS: PersonalizationBlock[] = [
  {
    key: "estilo-general",
    label: "1. Estilo general",
    description: "Tema, bordes, sombras y ambiente visual",
    icon: Wand2,
    badgeClass: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
  {
    key: "colores-fondos",
    label: "2. Colores y fondos",
    description: "Paletas, degradados, imagen y portada",
    icon: Palette,
    badgeClass: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  },
  {
    key: "tarjetas-widgets",
    label: "3. Tarjetas y widgets",
    description: "Tamaño, forma, intensidad y distribución",
    icon: LayoutGrid,
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  },
  {
    key: "iconos",
    label: "4. Iconos",
    description: "Estilo, tamaño, forma y combinaciones de icono y texto",
    icon: Sparkles,
    badgeClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  {
    key: "accesos-menu",
    label: "5. Accesos y menú",
    description: "Módulos rápidos, menú lateral e inferior",
    icon: PanelLeft,
    badgeClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  {
    key: "tipografia",
    label: "6. Tipografía",
    description: "Fuente, tamaño y legibilidad",
    icon: Type,
    badgeClass: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
];

// Índice de búsqueda — cada entrada apunta a un bloque real (key de BLOCKS) y
// describe un control concreto dentro de él, con términos coloquiales para
// que el buscador encuentre tanto bloques como controles internos.
interface PersonalizationSearchEntry {
  key: string;
  title: string;
  description: string;
  terms: string[];
}

const PERSONALIZATION_SEARCH_INDEX: PersonalizationSearchEntry[] = [
  {
    key: "estilo-general",
    title: "Estilo general",
    description: "Tema, presets visuales, acento, densidad, sombra, radio y estilo de tarjeta.",
    terms: ["apariencia", "preset", "acento", "densidad", "sombra", "radio", "tarjeta", "tema", "color", "ambiente", "atmósfera"],
  },
  {
    key: "estilo-general",
    title: "Vista previa en vivo",
    description: "Mira los cambios reflejados al instante, antes de cerrar.",
    terms: ["vista previa", "preview", "apariencia", "en vivo"],
  },
  {
    key: "estilo-general",
    title: "Plantillas por tipo de negocio",
    description: "Cambia el estilo completo de nelzzon según tu tipo de negocio.",
    terms: [
      "plantilla", "plantillas", "estilo", "estética", "taller", "médico", "dental", "clínico",
      "legal", "ejecutivo", "educación", "creativo", "minimal", "wellness", "retail", "negocio",
      "restaurar estilo base",
    ],
  },
  {
    key: "colores-fondos",
    title: "Colores y fondos",
    description: "Estilo, intensidad y blur del fondo, más imagen propia.",
    terms: ["fondo", "fondos", "imagen", "blur", "intensidad", "degradado", "glass", "clínico", "ejecutivo", "intenso", "colores", "paleta"],
  },
  {
    key: "colores-fondos",
    title: "Imagen propia",
    description: "Sube tu propia imagen de fondo (PNG, JPEG o WEBP, hasta 700 KB).",
    terms: ["imagen", "subir imagen", "fondo propio", "foto", "portada"],
  },
  {
    key: "colores-fondos",
    title: "Galería de fondos",
    description: "Más de 30 fondos listos: limpios, clínicos, ejecutivos, estéticos, degradados, glass y patrones.",
    terms: ["galería", "fondos", "degradados", "pastel", "glass", "patrón", "patrones", "colores"],
  },
  {
    key: "tarjetas-widgets",
    title: "Estilo de tarjetas y módulos",
    description: "Define la forma, textura y apariencia de las tarjetas de módulo y KPI.",
    terms: ["módulos", "tarjeta", "card", "estilo de módulos", "glass", "ejecutivo", "clínico", "estética", "taller", "minimal", "widgets", "kpi"],
  },
  {
    key: "tarjetas-widgets",
    title: "Dock inferior — tamaño y forma",
    description: "Tamaño, sombra y radio del dock inferior.",
    terms: ["dock", "tamaño", "sombra", "radio", "forma", "intensidad", "distribución"],
  },
  {
    key: "iconos",
    title: "Iconos de módulos y widgets",
    description: "Tipo, estilo, color, forma y visibilidad de cada módulo, KPI y widget.",
    terms: ["módulos", "iconos", "emojis", "widgets", "kpi", "color", "forma", "ocultar", "mostrar", "biblioteca", "combinaciones"],
  },
  {
    key: "iconos",
    title: "Resetear personalización",
    description: "Restablece iconos, identidades de módulos o toda la personalización.",
    terms: ["reset", "resetear", "restablecer"],
  },
  {
    key: "iconos",
    title: "Tarjeta avanzada del widget",
    description: "Posición y tamaño de icono, alineación, apariencia, fondo, borde y sombra de cada KPI.",
    terms: [
      "tarjeta", "card", "widget", "kpi", "icono grande", "centro", "marca de agua", "sombra",
      "borde", "apariencia", "fondo de tarjeta", "posición del icono", "tamaño del icono",
    ],
  },
  {
    key: "accesos-menu",
    title: "Dock inferior — accesos rápidos",
    description: "Estilo, etiquetas y accesos rápidos del menú inferior.",
    terms: ["dock", "menú inferior", "accesos rápidos", "etiquetas", "app moderna", "glass", "atajos", "menú lateral"],
  },
  {
    key: "tipografia",
    title: "Tipografía y marca",
    description: "Nombre visible, lema, tamaño y estilo del símbolo de marca.",
    terms: ["logo", "marca", "nombre", "lema", "símbolo", "tamaño", "tipografía", "fuente", "legibilidad"],
  },
  {
    key: "tipografia",
    title: "Nombre visible y lema",
    description: "Personaliza el nombre y el lema corto que se muestran en la barra lateral.",
    terms: ["nombre", "lema", "marca", "tagline"],
  },
  {
    key: "tipografia",
    title: "Tamaño y estilo de símbolo",
    description: "Ajusta el tamaño de marca y el estilo visual del símbolo.",
    terms: ["tamaño", "símbolo", "estilo de texto", "marca"],
  },
];

interface PersonalizationPanelProps {
  mode: PersonalizationMode;
  onChange: (mode: PersonalizationMode) => void;
  onClose: () => void;
  onOpenModuleLibrary?: () => void;
  className?: string;
}

export function PersonalizationPanel({ mode, onChange, onClose, onOpenModuleLibrary, className }: PersonalizationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState(BLOCKS[0].key);
  const [query, setQuery] = useState("");
  const { resetAllPersonalization } = useVisualPreferences();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PERSONALIZATION_SEARCH_INDEX.filter((entry) => {
      const block = BLOCKS.find((b) => b.key === entry.key);
      const haystack = [block?.label, block?.description, entry.title, entry.description, ...entry.terms]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const active = BLOCKS.find((b) => b.key === activeKey) ?? BLOCKS[0];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Personalizar tu sistema"
      className={cn(
        "flex h-[min(42rem,90vh)] w-[min(72rem,96vw)] flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_28px_76px_-26px_rgba(0,0,0,0.30)] ring-1 ring-foreground/[0.06]",
        className
      )}
    >
      {/* Encabezado */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              Personalizar tu sistema
              <Sparkles className="h-4 w-4 text-violet-500" />
            </h2>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              Cambia el estilo de tu sistema de forma fácil y visual.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca una opción..."
                className="w-56 rounded-full border bg-muted/30 py-1.5 pl-9 pr-3.5 text-xs placeholder:text-muted-foreground/70 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar Personalizar"
              className="flex items-center justify-center size-8 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {query.trim() && (
          <div className="mt-3" role="region" aria-label="Resultados de búsqueda">
            {searchResults.length === 0 ? (
              <p className="px-1 py-2 text-[11px] leading-snug text-muted-foreground">
                No encontré esa opción en Personalizar.
              </p>
            ) : (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-1.5">
                {searchResults.map((result, index) => {
                  const block = BLOCKS.find((b) => b.key === result.key) ?? BLOCKS[0];
                  const Icon = block.icon;
                  return (
                    <li key={`${result.key}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKey(result.key);
                          setQuery("");
                        }}
                        className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-background"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{result.title}</span>
                          <span className="block truncate text-[10px] leading-snug text-muted-foreground">{result.description}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {block.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Seis bloques */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {BLOCKS.map((block) => {
            const Icon = block.icon;
            const isActive = block.key === activeKey;
            return (
              <button
                key={block.key}
                type="button"
                onClick={() => setActiveKey(block.key)}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-2xl border p-2.5 text-left transition-all",
                  isActive
                    ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-200 dark:border-violet-400/40 dark:bg-violet-500/10 dark:ring-violet-500/20"
                    : "border-border/60 bg-background/60 hover:border-foreground/15"
                )}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-xl", block.badgeClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold">{block.label}</span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">{block.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido + vista previa en vivo */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
          {active.key === "estilo-general" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de vista</p>
                <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilo visual</p>
                <VisualPresetSelector />
              </div>
              <BusinessTemplatesSection />
              <PersonalizationActions />
            </div>
          )}

          {active.key === "colores-fondos" && (
            <div className="rounded-2xl border bg-muted/20 p-4">
              <BackgroundCustomizer />
            </div>
          )}

          {active.key === "tarjetas-widgets" && (
            <div className="space-y-3">
              <DashboardCardStyleSection />
              <ModuleTileStyleSection />
              <DockSizeSection />
            </div>
          )}

          {active.key === "iconos" && (
            <div className="rounded-2xl border bg-muted/20 p-4">
              <ModuleIdentityCustomizer />
            </div>
          )}

          {active.key === "accesos-menu" && (
            <div className="space-y-3">
              <DockStyleSection />
              {onOpenModuleLibrary && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
                  <div>
                    <p className="text-xs font-medium">Tu biblioteca de módulos</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Explora todos los módulos de nelzzon, ábrelos o prueba cómo se sentiría
                      agregarlos a tu dock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenModuleLibrary}
                    className="inline-flex shrink-0 items-center rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                  >
                    Abrir biblioteca
                  </button>
                </div>
              )}
            </div>
          )}

          {active.key === "tipografia" && (
            <div className="rounded-2xl border bg-muted/20 p-4">
              <BrandCustomizer />
            </div>
          )}
        </div>

        {/* Vista previa en vivo */}
        <div className="hidden w-72 shrink-0 overflow-y-auto border-l bg-muted/10 p-4 lg:block">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Vista previa en vivo</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
              En vivo
            </span>
          </div>
          <PersonalizationPreviewCanvas />
        </div>
      </div>

      {/* Pie — acciones y estado de guardado */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Los cambios se guardan localmente en este navegador.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={resetAllPersonalization}
            className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            Restablecer predeterminado
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          >
            Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
