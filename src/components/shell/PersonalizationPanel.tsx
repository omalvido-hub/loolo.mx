"use client";

// Personalizar nelzzon (FASE 1M-F — rebuild "iPhone simple"). Panel 100%
// local, sin servidor. Inicio con 3 acciones grandes, sin menú técnico:
// "Cambiar estilo completo" (StyleWizard, 3 pasos), "Acomodar dashboard"
// (DashboardArranger) y "Personalizar detalles" (PersonalizationDetails:
// colores, iconos, fondos, tarjetas, menú, marca). Todo se aplica de
// inmediato y se guarda en este navegador (visual-preferences.tsx,
// module-identity.tsx, dashboard-layout.tsx).

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, ChevronLeft, Palette, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";
import { StyleWizard } from "@/components/shell/StyleWizard";
import { DashboardArranger } from "@/components/shell/DashboardArranger";
import { PersonalizationDetails } from "@/components/shell/PersonalizationDetails";

type PanelView = "home" | "estilo" | "acomodar" | "detalles";
type DetailTab = "colores" | "iconos" | "fondos" | "tarjetas" | "menu" | "marca";

interface HomeAction {
  view: PanelView;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}

const HOME_ACTIONS: HomeAction[] = [
  {
    view: "estilo",
    title: "Cambiar estilo completo",
    description: "Elige negocio, estilo, colores, iconos y fondos en pocos pasos.",
    icon: Palette,
    accent: "bg-violet-500/10 text-violet-600",
  },
  {
    view: "acomodar",
    title: "Acomodar dashboard",
    description: "Mueve tarjetas, cambia tamaños y oculta lo que no uses.",
    icon: LayoutGrid,
    accent: "bg-sky-500/10 text-sky-600",
  },
  {
    view: "detalles",
    title: "Personalizar detalles",
    description: "Ajusta colores, iconos, fondos, tarjetas y menú.",
    icon: SlidersHorizontal,
    accent: "bg-emerald-500/10 text-emerald-600",
  },
];

const VIEW_TITLES: Record<PanelView, string> = {
  home: "Personalizar nelzzon",
  estilo: "Cambiar estilo completo",
  acomodar: "Acomoda tu dashboard",
  detalles: "Personalizar detalles",
};

// Índice de búsqueda — cada entrada apunta a una pantalla real (home/estilo/
// acomodar/detalles), con términos coloquiales para encontrar tanto la
// pantalla como un control concreto dentro de ella.
interface SearchEntry {
  view: PanelView;
  detailTab?: DetailTab;
  title: string;
  description: string;
  terms: string[];
}

const PERSONALIZATION_SEARCH_INDEX: SearchEntry[] = [
  {
    view: "estilo",
    title: "Cambiar estilo completo",
    description: "Elige el tipo de negocio, el estilo y una plantilla visual.",
    terms: [
      "estilo", "negocio", "plantilla", "plantillas", "dental", "médico", "clínico", "clínica",
      "estética", "spa", "taller", "legal", "ejecutivo", "educación", "veterinaria", "wellness",
      "creativo", "minimal", "retail", "comercio", "restaurar estilo base",
    ],
  },
  {
    view: "acomodar",
    title: "Acomodar dashboard",
    description: "Mueve, ordena, cambia el tamaño u oculta tus tarjetas.",
    terms: [
      "acomodar", "dashboard", "mover", "ordenar", "orden", "tamaño", "ocultar", "mostrar",
      "tarjetas", "kpi", "card", "reset", "restaurar acomodo",
    ],
  },
  {
    view: "detalles",
    detailTab: "colores",
    title: "Colores",
    description: "Paletas de color listas, con nombre.",
    terms: ["colores", "color", "paleta", "azul", "menta", "rosa", "negro", "naranja", "verde", "morado", "arena", "oscuro"],
  },
  {
    view: "detalles",
    detailTab: "iconos",
    title: "Iconos",
    description: "Paquetes completos de iconos para tu Dashboard.",
    terms: ["iconos", "icono grande", "paquete", "emoji", "emojis", "símbolos"],
  },
  {
    view: "detalles",
    detailTab: "fondos",
    title: "Fondos y portadas",
    description: "Galería de fondos, degradados, glass y patrones, intensidad, blur, o sube tu imagen.",
    terms: ["fondos", "fondo", "portadas", "portada", "galería", "degradados", "glass", "patrones", "imagen", "subir imagen", "intensidad", "blur"],
  },
  {
    view: "detalles",
    detailTab: "tarjetas",
    title: "Tarjetas",
    description: "Estilo de las tarjetas de tu Dashboard.",
    terms: ["tarjetas", "tarjeta", "card", "cards", "kpi", "sombra", "borde"],
  },
  {
    view: "detalles",
    detailTab: "menu",
    title: "Menú",
    description: "Estilo del menú inferior (dock) de accesos rápidos.",
    terms: ["menú", "menú inferior", "dock", "iconos grandes", "sin texto", "marca de agua"],
  },
  {
    view: "detalles",
    detailTab: "marca",
    title: "Marca",
    description: "Nombre visible, lema, símbolo y estilo de tu marca.",
    terms: ["marca", "logo", "nombre", "lema", "símbolo"],
  },
  {
    view: "detalles",
    detailTab: "colores",
    title: "Apariencia avanzada",
    description: "Preset, acento, densidad, sombra, radio y forma de tarjeta.",
    terms: ["apariencia", "preset", "acento", "densidad", "radio", "forma", "tamaño"],
  },
  {
    view: "acomodar",
    title: "Tarjetas y widgets del dashboard",
    description: "Ordena, oculta o muestra los widgets de tu Dashboard.",
    terms: ["widgets", "ocultar", "mostrar", "reset"],
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
  const [view, setView] = useState<PanelView>("home");
  const [detailTab, setDetailTab] = useState<DetailTab>("colores");
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
      const haystack = [entry.title, entry.description, ...entry.terms].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  function goTo(entry: SearchEntry) {
    setView(entry.view);
    if (entry.detailTab) setDetailTab(entry.detailTab);
    setQuery("");
  }

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
          <div className="flex min-w-0 items-center gap-2">
            {view !== "home" && (
              <button
                type="button"
                onClick={() => setView("home")}
                aria-label="Volver al inicio de Personalizar"
                className="flex items-center justify-center size-7 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight">{VIEW_TITLES[view]}</h2>
              {view === "home" && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">Haz que el sistema se sienta tuyo.</p>}
            </div>
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
            placeholder="Busca una categoría o algo que quieras cambiar…"
            className="w-full rounded-full border bg-muted/30 py-1.5 pl-9 pr-3.5 text-xs placeholder:text-muted-foreground/70 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {query.trim() && (
          <div className="mt-2" role="region" aria-label="Resultados de búsqueda">
            {searchResults.length === 0 ? (
              <p className="px-1 py-2 text-[11px] leading-snug text-muted-foreground">
                No encontré esa opción en Personalizar.
              </p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border bg-muted/20 p-1.5">
                {searchResults.map((result, index) => (
                  <li key={`${result.view}-${result.detailTab ?? ""}-${index}`}>
                    <button
                      type="button"
                      onClick={() => goTo(result)}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-background"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{result.title}</span>
                        <span className="block truncate text-[10px] leading-snug text-muted-foreground">{result.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-5 pb-7 pt-4">
          {view === "home" && (
            <div className="space-y-3">
              {HOME_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.view}
                    type="button"
                    onClick={() => setView(action.view)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm hover:ring-1 hover:ring-foreground/10"
                  >
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", action.accent)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{action.title}</span>
                      <span className="block text-xs leading-snug text-muted-foreground">{action.description}</span>
                    </span>
                  </button>
                );
              })}

              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de vista</p>
                <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
              </div>

              {onOpenModuleLibrary && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
                  <div>
                    <p className="text-xs font-medium">Tu biblioteca de módulos</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Explora todos los módulos de nelzzon y ábrelos.
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

          {view === "estilo" && <StyleWizard />}
          {view === "acomodar" && <DashboardArranger />}
          {view === "detalles" && <PersonalizationDetails initialTab={detailTab} />}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-muted/20 px-5 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Los cambios se guardan localmente en este navegador.
        </p>
      </div>
    </div>
  );
}
