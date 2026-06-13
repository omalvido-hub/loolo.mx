"use client";

// Personalizar nelzzon (FASE 1M-A a 1M-D) — panel 100% local, sin servidor.
// Cada cambio se aplica de inmediato (vista previa + Dashboard real vía
// data-visual-* en <html>) y se guarda en localStorage. Cinco categorías:
// Inicio, Marca, Apariencia, Fondos e imágenes y Módulos — todas con
// controles reales, ninguna "próximamente".

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Search,
  Home,
  Award,
  Palette,
  Image as ImageIcon,
  Blocks,
  Sparkles,
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
  DOCK_STYLES,
  DOCK_SIZES,
  DOCK_ACTIVE_STYLES,
  DOCK_LABEL_VISIBILITIES,
  type BusinessTemplateId,
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
      <div className="grid grid-cols-2 gap-2">
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

function DockCustomizerSection() {
  const {
    preferences,
    setDockStyle,
    setDockSize,
    setDockActiveStyle,
    setDockLabelVisibility,
    setDockShadow,
    setDockRadius,
  } = useVisualPreferences();

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dock inferior</p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Estilo del menú de accesos rápidos en la parte inferior de la pantalla.
      </p>
      <Segmented label="Estilo del dock" options={DOCK_STYLES} value={preferences.dockStyle} onChange={(dockStyle: DockStyle) => setDockStyle(dockStyle)} />
      <Segmented label="Tamaño" options={DOCK_SIZES} value={preferences.dockSize} onChange={(dockSize: DockSize) => setDockSize(dockSize)} />
      <Segmented label="Estilo activo" options={DOCK_ACTIVE_STYLES} value={preferences.dockActiveStyle} onChange={(dockActiveStyle: DockActiveStyle) => setDockActiveStyle(dockActiveStyle)} />
      <Segmented label="Etiquetas" options={DOCK_LABEL_VISIBILITIES} value={preferences.dockLabelVisibility} onChange={(dockLabelVisibility: DockLabelVisibility) => setDockLabelVisibility(dockLabelVisibility)} />
      <Segmented label="Sombra" options={DOCK_SHADOW_OPTIONS} value={preferences.dockShadow} onChange={(dockShadow: VisualShadow) => setDockShadow(dockShadow)} />
      <Segmented label="Radio" options={DOCK_RADIUS_OPTIONS} value={preferences.dockRadius} onChange={(dockRadius: VisualRadius) => setDockRadius(dockRadius)} />
    </div>
  );
}

interface StudioSection {
  key: string;
  label: string;
  icon: React.ElementType;
  tagline: string;
}

const SECTIONS: StudioSection[] = [
  {
    key: "inicio",
    label: "Inicio",
    icon: Home,
    tagline: "La portada de Personalizar — un vistazo a cómo se ve y se siente tu nelzzon hoy.",
  },
  {
    key: "marca",
    label: "Marca",
    icon: Award,
    tagline: "Nombre visible, lema y estilo de tu marca dentro de nelzzon — local, en este navegador.",
  },
  {
    key: "apariencia",
    label: "Apariencia",
    icon: Palette,
    tagline: "Tema, estilos curados e intensidad visual — pruébalos aquí mismo, en vivo.",
  },
  {
    key: "fondos",
    label: "Fondos e imágenes",
    icon: ImageIcon,
    tagline: "Estilo, intensidad, blur e imagen propia para el fondo de tu Dashboard.",
  },
  {
    key: "modulos",
    label: "Módulos",
    icon: Blocks,
    tagline: "Tu biblioteca de módulos — actívalos, dales tu propio estilo e identidad.",
  },
];

// Índice de búsqueda del buscador de Personalizar — cada entrada apunta a
// una sección real (key de SECTIONS) y describe un control concreto dentro
// de ella, con términos coloquiales para que el buscador encuentre tanto
// categorías como controles internos.
interface PersonalizationSearchEntry {
  key: string;
  title: string;
  description: string;
  terms: string[];
}

const PERSONALIZATION_SEARCH_INDEX: PersonalizationSearchEntry[] = [
  {
    key: "inicio",
    title: "Inicio",
    description: "La portada de Personalizar — un vistazo a tu nelzzon.",
    terms: ["inicio", "portada", "resumen", "empezar"],
  },
  {
    key: "marca",
    title: "Marca",
    description: "Nombre visible, lema, tamaño de marca, estilo de texto y de símbolo.",
    terms: ["logo", "marca", "nombre", "lema", "símbolo", "tamaño"],
  },
  {
    key: "marca",
    title: "Nombre visible y lema",
    description: "Cambia cómo se llama tu nelzzon y qué lema corto muestra.",
    terms: ["nombre", "lema", "marca", "logo", "texto"],
  },
  {
    key: "marca",
    title: "Tamaño y estilo de símbolo",
    description: "Tamaño de marca y estilo del símbolo: normal, suave, intenso o monocromático.",
    terms: ["tamaño", "símbolo", "estilo de texto", "monocromático", "marca"],
  },
  {
    key: "apariencia",
    title: "Apariencia",
    description: "Tema, presets visuales, acento, densidad, sombra, radio y estilo de tarjeta.",
    terms: ["apariencia", "preset", "acento", "densidad", "sombra", "radio", "tarjeta", "tema", "color"],
  },
  {
    key: "apariencia",
    title: "Vista previa en vivo",
    description: "Mira los cambios reflejados al instante, antes de cerrarlos.",
    terms: ["vista previa", "preview", "apariencia"],
  },
  {
    key: "fondos",
    title: "Fondos e imágenes",
    description: "Estilo, intensidad y blur del fondo del Dashboard, más imagen propia.",
    terms: ["fondo", "fondos", "imagen", "blur", "intensidad", "degradado", "glass", "clínico", "ejecutivo", "intenso"],
  },
  {
    key: "fondos",
    title: "Imagen propia",
    description: "Sube tu propia imagen de fondo (PNG, JPEG o WEBP, hasta 700 KB).",
    terms: ["imagen", "subir imagen", "fondo propio", "foto"],
  },
  {
    key: "modulos",
    title: "Módulos",
    description: "Biblioteca de módulos, iconos, emojis, widgets y KPIs del Dashboard.",
    terms: ["módulos", "iconos", "emojis", "widgets", "kpi", "color", "forma", "ocultar", "mostrar", "biblioteca"],
  },
  {
    key: "modulos",
    title: "Resetear personalización",
    description: "Restablece iconos, identidades de módulos o toda la personalización.",
    terms: ["reset", "resetear", "restablecer"],
  },
  {
    key: "inicio",
    title: "Plantillas por tipo de negocio",
    description: "Cambia el estilo completo de nelzzon según tu tipo de negocio.",
    terms: [
      "plantilla", "plantillas", "estilo", "estética", "taller", "médico", "dental", "clínico",
      "legal", "ejecutivo", "educación", "creativo", "minimal", "wellness", "retail", "negocio",
      "restaurar estilo base",
    ],
  },
  {
    key: "fondos",
    title: "Galería de fondos",
    description: "Más de 30 fondos listos: limpios, clínicos, ejecutivos, estéticos, degradados, glass y patrones.",
    terms: ["galería", "fondos", "degradados", "pastel", "glass", "patrón", "patrones", "colores"],
  },
  {
    key: "modulos",
    title: "Estilo de módulos",
    description: "Define la forma y textura de las tarjetas de módulo en toda la app.",
    terms: ["módulos", "tarjeta", "card", "estilo de módulos", "glass", "ejecutivo", "clínico", "estética", "taller", "minimal"],
  },
  {
    key: "modulos",
    title: "Tarjeta avanzada del widget",
    description: "Posición y tamaño de icono, alineación, apariencia, fondo, borde y sombra de cada KPI.",
    terms: [
      "tarjeta", "card", "widget", "kpi", "icono grande", "centro", "marca de agua", "sombra",
      "borde", "apariencia", "fondo de tarjeta", "posición del icono", "tamaño del icono",
    ],
  },
  {
    key: "modulos",
    title: "Dock inferior",
    description: "Estilo, tamaño, etiquetas, sombra y radio del menú inferior de accesos rápidos.",
    terms: ["dock", "menú inferior", "accesos rápidos", "etiquetas", "sombra", "radio", "app moderna", "glass"],
  },
];

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

const HOME_QUICK_LINKS: { key: string; label: string; hint: string; icon: React.ElementType; accent: string }[] = [
  { key: "marca", label: "Marca", hint: "Nombre, lema y estilo de tu marca", icon: Award, accent: "bg-violet-500/10 text-violet-600" },
  { key: "apariencia", label: "Apariencia", hint: "Tema, estilos y modo de vista", icon: Palette, accent: "bg-sky-500/10 text-sky-600" },
  { key: "fondos", label: "Fondos", hint: "Estilo, intensidad e imagen propia", icon: ImageIcon, accent: "bg-amber-500/10 text-amber-600" },
  { key: "modulos", label: "Módulos", hint: "Tu biblioteca, a tu estilo", icon: Blocks, accent: "bg-emerald-500/10 text-emerald-600" },
];

const HOME_STATUS_SUMMARY: { label: string; detail: string }[] = [
  { label: "Cambios en vivo", detail: "Lo que ajustas aquí se aplica de inmediato en tu Dashboard" },
  { label: "Guardado local", detail: "Se guarda en este navegador, sin necesidad de servidor" },
  { label: "Reversible", detail: "Cada sección tiene su botón de reset, y hay un reset general" },
];

function StudioMiniPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border bg-gradient-to-br from-sky-50 via-violet-50 to-fuchsia-50 p-2 shadow-inner ring-1 ring-foreground/[0.04] dark:from-sky-500/[0.07] dark:via-violet-500/[0.07] dark:to-fuchsia-500/[0.07]"
    >
      <div className="overflow-hidden rounded-lg border bg-card/80 shadow-sm ring-1 ring-foreground/[0.05] backdrop-blur">
        {/* topbar miniatura */}
        <div className="flex items-center gap-1.5 border-b px-2 py-1">
          <span className="size-1.5 rounded-full bg-rose-400/70" />
          <span className="size-1.5 rounded-full bg-amber-400/70" />
          <span className="size-1.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 h-1.5 w-16 rounded-full bg-gradient-to-r from-sky-400/50 via-violet-400/50 to-fuchsia-400/50" />
        </div>
        <div className="flex">
          {/* sidebar miniatura */}
          <div className="hidden w-8 shrink-0 space-y-1 border-r p-1.5 sm:block">
            <span className="block h-1 w-5 rounded-full bg-primary/30" />
            <span className="block h-1 w-6 rounded-full bg-muted" />
            <span className="block h-1 w-4 rounded-full bg-muted" />
          </div>
          {/* tarjetas tipo dashboard */}
          <div className="grid flex-1 grid-cols-3 gap-1 p-2">
            <span className="col-span-2 row-span-2 rounded-md bg-gradient-to-br from-sky-400/25 to-violet-400/15 ring-1 ring-foreground/[0.04]" />
            <span className="rounded-md bg-emerald-400/20 ring-1 ring-foreground/[0.04]" />
            <span className="rounded-md bg-amber-400/20 ring-1 ring-foreground/[0.04]" />
            <span className="col-span-2 rounded-md bg-fuchsia-400/15 ring-1 ring-foreground/[0.04]" />
          </div>
        </div>
        {/* dock miniatura */}
        <div className="flex items-center justify-center gap-1 border-t bg-muted/30 px-2 py-1">
          <span className="size-2.5 rounded-md bg-primary/20 ring-1 ring-primary/30" />
          <span className="size-2.5 rounded-md bg-muted ring-1 ring-foreground/[0.05]" />
          <span className="size-2.5 rounded-md bg-muted ring-1 ring-foreground/[0.05]" />
        </div>
      </div>
      <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-muted-foreground">
        Una idea de cómo se vería tu nelzzon.
      </p>
    </div>
  );
}

function StudioHome({ onNavigate }: { onNavigate: (key: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-primary">
          <Sparkles className="h-2.5 w-2.5" />
          Personalizar
        </span>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">Tu nelzzon</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Diseña cómo se ve y se siente tu sistema — todo se guarda en este navegador.
        </p>
      </div>

      <StudioMiniPreview />

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Empieza por aquí</p>
        <div className="grid grid-cols-2 gap-2">
          {HOME_QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.key}
                type="button"
                onClick={() => onNavigate(link.key)}
                className="group flex items-center gap-2 rounded-xl border bg-background/60 px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm hover:ring-1 hover:ring-foreground/10"
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105", link.accent)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{link.label}</span>
                  <span className="block truncate text-[10px] leading-snug text-muted-foreground">{link.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <BusinessTemplatesSection />

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cómo funciona</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {HOME_STATUS_SUMMARY.map((item) => (
            <span
              key={item.label}
              title={item.detail}
              className="inline-flex cursor-default items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium tracking-wide"
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PersonalizationPanelProps {
  mode: PersonalizationMode;
  onChange: (mode: PersonalizationMode) => void;
  onClose: () => void;
  onOpenModuleLibrary?: () => void;
  className?: string;
}

export function PersonalizationPanel({ mode, onChange, onClose, onOpenModuleLibrary, className }: PersonalizationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const [query, setQuery] = useState("");

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

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PERSONALIZATION_SEARCH_INDEX.filter((entry) => {
      const section = SECTIONS.find((s) => s.key === entry.key);
      const haystack = [section?.label, section?.tagline, entry.title, entry.description, ...entry.terms]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];
  const ActiveIcon = active.icon;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Personalizar nelzzon"
      className={cn(
        "flex max-h-[min(33rem,76vh)] w-[min(25rem,92vw)] flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_28px_76px_-26px_rgba(0,0,0,0.30)] ring-1 ring-foreground/[0.06]",
        className
      )}
    >
      <div
        aria-hidden
        className="h-1.5 w-full shrink-0 bg-gradient-to-r from-sky-400/70 via-violet-400/70 to-fuchsia-400/70"
      />

      {/* Header */}
      <div className="shrink-0 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">Personalizar nelzzon</h2>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Haz que el sistema se sienta tuyo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Personalizar"
            className="flex items-center justify-center size-7 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca una categoría o control…"
            className="w-full rounded-full border bg-muted/30 py-1.5 pl-9 pr-3.5 text-xs placeholder:text-muted-foreground/70 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Categorías — fila horizontal de chips, compacta y siempre visible */}
        <nav
          aria-label="Categorías de personalización"
          className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = section.key === activeKey;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveKey(section.key)}
                aria-current={isActive}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                {section.label}
              </button>
            );
          })}
        </nav>

        {/* Resultados de búsqueda — solo aparecen mientras hay texto en el buscador */}
        {query.trim() && (
          <div className="mt-2" role="region" aria-label="Resultados de búsqueda">
            {searchResults.length === 0 ? (
              <p className="px-1 py-2 text-[11px] leading-snug text-muted-foreground">
                No encontré esa opción en Personalizar.
              </p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-1.5">
                {searchResults.map((result, index) => {
                  const section = SECTIONS.find((s) => s.key === result.key) ?? SECTIONS[0];
                  const Icon = section.icon;
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
                          {section.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Sección activa */}
      <div className="min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-5 pb-7 pt-4">
          {active.key === "inicio" ? (
            <StudioHome onNavigate={setActiveKey} />
          ) : (
            <>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ActiveIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{active.label}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{active.tagline}</p>
            </div>
          </div>

          {active.key === "marca" && (
            <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
              <BrandCustomizer />
            </div>
          )}

          {active.key === "apariencia" && (
            <div className="mt-5 space-y-5 rounded-2xl border bg-muted/20 p-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de vista</p>
                <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">1. Estilo visual</p>
                <VisualPresetSelector />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">2. Vista previa</p>
                <PersonalizationPreviewCanvas />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">3. Acciones</p>
                <PersonalizationActions />
              </div>
            </div>
          )}

          {active.key === "fondos" && (
            <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
              <BackgroundCustomizer />
            </div>
          )}

          {active.key === "modulos" && onOpenModuleLibrary && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
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

          {active.key === "modulos" && (
            <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
              <ModuleIdentityCustomizer />
            </div>
          )}

          {active.key === "modulos" && (
            <div className="mt-3 rounded-2xl border bg-muted/20 p-4">
              <DockCustomizerSection />
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Footer — estado informativo, no es un botón */}
      <div className="shrink-0 border-t bg-muted/20 px-5 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Los cambios se guardan localmente en este navegador.
        </p>
      </div>
    </div>
  );
}
