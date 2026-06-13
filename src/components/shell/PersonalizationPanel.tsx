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
import { useVisualPreferences } from "@/lib/visual-preferences";

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

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
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
            placeholder="Busca una categoría…"
            className="w-full rounded-full border bg-muted/30 py-1.5 pl-9 pr-3.5 text-xs placeholder:text-muted-foreground/70 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Categorías — fila horizontal de chips, compacta y siempre visible */}
        {filteredSections.length === 0 ? (
          <p className="mt-3 px-1 text-[11px] leading-snug text-muted-foreground">
            No encontramos coincidencias — prueba con otra palabra.
          </p>
        ) : (
          <nav
            aria-label="Categorías de personalización"
            className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
          >
            {filteredSections.map((section) => {
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
