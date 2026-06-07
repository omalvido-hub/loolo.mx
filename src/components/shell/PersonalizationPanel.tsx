"use client";

// Design Studio de nelzzon — vista previa del Centro de Control Visual descrito en
// docs/NELZZON_PERSONALIZAR_MASTER.md y docs/NELZZON_PERSONALIZAR_WIREFRAME.md.
// Se abre desde el botón "Personalizar" de la topbar o desde la entrada del
// sidebar — ambos controlan el mismo estado en AppShell. Es enteramente local y
// presentacional: navega categorías, declara con honestidad qué es vista previa
// real (dentro de este panel), qué es próximamente, qué requiere el motor de
// personalización futuro y qué será exclusivo de owner/admin. Nada se guarda ni
// se aplica a la app real — eso es trabajo de las fases 0C en adelante descritas
// en el documento maestro.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Search,
  Home,
  Award,
  Palette,
  Image as ImageIcon,
  Type,
  LayoutDashboard,
  LayoutGrid,
  Compass,
  Blocks,
  Globe,
  FileStack,
  Accessibility,
  Settings2,
  Sparkles,
  Lock,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";
import { VisualStylePreview } from "@/components/shell/VisualStylePreview";

type StudioOptionStatus = "preview" | "soon" | "engine" | "admin";

const STATUS_META: Record<StudioOptionStatus, { label: string; className: string }> = {
  preview: { label: "Vista previa aquí", className: "bg-emerald-500/10 text-emerald-700" },
  soon: { label: "Próximamente", className: "bg-muted text-muted-foreground" },
  engine: { label: "Requiere motor", className: "bg-violet-500/10 text-violet-700" },
  admin: { label: "Solo admin", className: "bg-amber-500/10 text-amber-700" },
};

function StatusBadge({ status }: { status: StudioOptionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide", meta.className)}>
      {status === "admin" && <Lock className="h-2.5 w-2.5" />}
      {meta.label}
    </span>
  );
}

interface StudioOption {
  label: string;
  hint: string;
  status: StudioOptionStatus;
}

interface StudioSection {
  key: string;
  label: string;
  icon: React.ElementType;
  tagline: string;
  options: StudioOption[];
}

const SECTIONS: StudioSection[] = [
  {
    key: "inicio",
    label: "Inicio",
    icon: Home,
    tagline: "La portada de tu Design Studio — un vistazo a cómo se ve y se siente tu nelzzon hoy.",
    options: [
      { label: "Resumen visual de tu espacio", hint: "Una tarjeta con el estilo y la marca activos.", status: "soon" },
      { label: "Atajos a lo más usado", hint: "Salta directo a Apariencia, Marca o Dashboard.", status: "soon" },
      { label: "Comparar antes / después", hint: "Revisa tu última sesión de cambios.", status: "engine" },
    ],
  },
  {
    key: "marca",
    label: "Marca",
    icon: Award,
    tagline: "Logo, nombre, colores y firma visual — el punto de entrada para que nelzzon hable como tu negocio.",
    options: [
      { label: "Logo e isotipo", hint: "Sube tu marca y velo aplicada en topbar y portal.", status: "soon" },
      { label: "Nombre visible", hint: "Cómo te ven tu equipo y tus pacientes.", status: "admin" },
      { label: "Paleta corporativa", hint: "Tus colores, aplicados en toda la experiencia.", status: "engine" },
      { label: "Firma visual", hint: "Una frase corta que te representa.", status: "soon" },
    ],
  },
  {
    key: "apariencia",
    label: "Apariencia",
    icon: Palette,
    tagline: "Tema, estilos curados e intensidad visual — pruébalos aquí mismo, en vivo.",
    options: [
      { label: "Tema claro / oscuro / automático", hint: "Cómo se siente tu espacio según la hora del día.", status: "preview" },
      { label: "Estilos curados", hint: "Profesional, clínico, creativo, glass…", status: "preview" },
      { label: "Intensidad visual", hint: "De sobrio a expresivo, a tu medida.", status: "engine" },
    ],
  },
  {
    key: "fondos",
    label: "Fondos e imágenes",
    icon: ImageIcon,
    tagline: "Fondos, gradientes e imágenes propias — siempre cuidando que todo se siga leyendo bien.",
    options: [
      { label: "Galería de fondos y gradientes", hint: "Curados para mantener la legibilidad.", status: "soon" },
      { label: "Imagen propia", hint: "Tu fondo, tu estilo — con validación automática de contraste.", status: "soon" },
      { label: "Opacidad y blur", hint: "Ajusta la intensidad sin perder claridad.", status: "engine" },
    ],
  },
  {
    key: "tipografias",
    label: "Tipografías",
    icon: Type,
    tagline: "La voz visual de tu nelzzon — familia, escala y personalidad tipográfica.",
    options: [
      { label: "Familia tipográfica", hint: "Un set curado, pensado para legibilidad clínica y financiera.", status: "soon" },
      { label: "Tamaño y escala", hint: "Cómo respiran tus títulos, cifras y textos.", status: "engine" },
      { label: "Personalidad", hint: "Corporativa, creativa o clínica.", status: "soon" },
    ],
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tagline: "Tu panorama de cada día — qué ves primero y cómo se acomoda.",
    options: [
      { label: "Mostrar / ocultar widgets", hint: "Quédate solo con lo que usas.", status: "engine" },
      { label: "Layouts predefinidos", hint: "1, 2 o 3 columnas — listo para tu forma de trabajar.", status: "soon" },
      { label: "Vistas por rol", hint: "Una vista para recepción, otra para el doctor, otra para ti.", status: "admin" },
    ],
  },
  {
    key: "widgets",
    label: "Widgets",
    icon: LayoutGrid,
    tagline: "Cada tarjeta de tu panorama, a tu manera — color, ícono, tamaño y orden.",
    options: [
      { label: "Reordenar y renombrar", hint: "Acomoda tus widgets como tú los piensas.", status: "soon" },
      { label: "Color e ícono propio", hint: "Encuéntralos de un vistazo.", status: "engine" },
      { label: "Widgets exclusivos de admin", hint: "Información sensible, solo para quien debe verla.", status: "admin" },
    ],
  },
  {
    key: "navegacion",
    label: "Navegación",
    icon: Compass,
    tagline: "Sidebar, topbar y dock — cómo te mueves por tu nelzzon todos los días.",
    options: [
      { label: "Accesos del dock", hint: "Elige qué módulos viven en tu acceso rápido.", status: "preview" },
      { label: "Orden de sidebar y topbar", hint: "Tu menú, en el orden que tiene sentido para ti.", status: "engine" },
      { label: "Buscador y favoritos", hint: "Encuentra lo tuyo más rápido.", status: "soon" },
    ],
  },
  {
    key: "modulos",
    label: "Módulos",
    icon: Blocks,
    tagline: "Tu biblioteca de módulos — actívalos, agrúpalos y dales tu propio estilo.",
    options: [
      { label: "Biblioteca de módulos", hint: "Explora, abre o pruébalos en tu dock.", status: "preview" },
      { label: "Agrupar y renombrar", hint: "Organízalos como organizas tu clínica.", status: "soon" },
      { label: "Recomendados por IA", hint: "Sugerencias según cómo trabajas.", status: "soon" },
    ],
  },
  {
    key: "portal",
    label: "Portal del paciente",
    icon: Globe,
    tagline: "La cara de tu negocio ante quienes más importan: tus pacientes y clientes.",
    options: [
      { label: "Branding del portal", hint: "Tu logo, tus colores, tu tono — donde tus pacientes te ven.", status: "admin" },
      { label: "Tono de voz", hint: "Formal, cercano, clínico o premium.", status: "soon" },
      { label: "Visibilidad de información", hint: "Qué ven tus pacientes — citas, pagos, avances.", status: "engine" },
    ],
  },
  {
    key: "plantillas",
    label: "Plantillas",
    icon: FileStack,
    tagline: "Empieza por algo que ya se ve increíble y hazlo tuyo — listas por profesión.",
    options: [
      { label: "Plantillas por profesión", hint: "Dental, estética, despacho legal, taller, y más.", status: "soon" },
      { label: "Guardar y duplicar", hint: "Crea tus propias variantes.", status: "engine" },
      { label: "Exportar / importar", hint: "Lleva tu estilo entre sucursales.", status: "admin" },
    ],
  },
  {
    key: "accesibilidad",
    label: "Accesibilidad",
    icon: Accessibility,
    tagline: "Que tu nelzzon se sienta cómodo para todos, todos los días — pruébalo aquí mismo.",
    options: [
      { label: "Tamaño de letra", hint: "Cómodo para leer, también de cerca o de lejos.", status: "preview" },
      { label: "Alto contraste", hint: "Más claridad cuando la luz no ayuda.", status: "preview" },
      { label: "Reducir movimiento", hint: "Una experiencia más calmada, sin animaciones de más.", status: "preview" },
    ],
  },
  {
    key: "avanzado",
    label: "Avanzado",
    icon: Settings2,
    tagline: "Reglas finas para organizaciones que quieren ir más profundo — pensado para owner y admin.",
    options: [
      { label: "Reglas por rol y sucursal", hint: "Quién ve qué, y dónde.", status: "admin" },
      { label: "Historial de versiones", hint: "Vuelve atrás cuando lo necesites.", status: "engine" },
      { label: "Exportar configuración", hint: "Tu estilo, respaldado y portable.", status: "engine" },
    ],
  },
  {
    key: "ia",
    label: "IA de personalización",
    icon: Wand2,
    tagline: "Tu asistente de diseño — pídele que afine tu espacio y te sugiera mejoras.",
    options: [
      { label: "“Hazlo más premium”", hint: "Pide un ajuste y mira cómo se vería.", status: "soon" },
      { label: "“Organiza mi dashboard”", hint: "Sugerencias según cómo trabajas tú.", status: "soon" },
      { label: "“Recomiéndame widgets”", hint: "Lo que más te conviene, sin buscarlo.", status: "soon" },
    ],
  },
];

type FontScale = "cómodo" | "grande" | "más grande";
const FONT_SCALES: { key: FontScale; label: string; sizeClass: string }[] = [
  { key: "cómodo", label: "Cómodo", sizeClass: "text-sm" },
  { key: "grande", label: "Grande", sizeClass: "text-base" },
  { key: "más grande", label: "Más grande", sizeClass: "text-lg" },
];

function AccessibilityPreview() {
  const [scale, setScale] = useState<FontScale>("cómodo");
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const activeScale = FONT_SCALES.find((s) => s.key === scale) ?? FONT_SCALES[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">Tamaño de letra</span>
        <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1">
          {FONT_SCALES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScale(s.key)}
              aria-pressed={scale === s.key}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                scale === s.key ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="size-3.5 rounded border-foreground/20 accent-foreground"
          />
          Alto contraste
        </label>
        <label className="inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="size-3.5 rounded border-foreground/20 accent-foreground"
          />
          Reducir movimiento
        </label>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4 transition-colors",
          highContrast ? "border-foreground bg-foreground text-background" : "bg-muted/30"
        )}
      >
        <p className={cn("font-semibold tracking-tight transition-[font-size]", activeScale.sizeClass)}>
          Así se vería un texto en tu nelzzon
        </p>
        <p className={cn("mt-1 leading-relaxed transition-[font-size]", activeScale.sizeClass === "text-lg" ? "text-base" : "text-xs", highContrast ? "text-background/80" : "text-muted-foreground")}>
          Ajusta el tamaño y el contraste hasta que se sienta cómodo para ti — esta muestra
          cambia en vivo, dentro de este panel.
        </p>
        <span
          aria-hidden
          className={cn(
            "mt-3 inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary",
            !reduceMotion && "animate-pulse"
          )}
        >
          <Sparkles className="h-3 w-3" />
        </span>
        <span className="ml-2 align-middle text-[10px] text-muted-foreground">
          {reduceMotion ? "Movimiento reducido" : "Movimiento normal"}
        </span>
      </div>
    </div>
  );
}

const HOME_QUICK_LINKS: { key: string; label: string; hint: string; icon: React.ElementType; accent: string }[] = [
  { key: "apariencia", label: "Apariencia", hint: "Tema, estilos y modo de vista", icon: Palette, accent: "bg-violet-500/10 text-violet-600" },
  { key: "fondos", label: "Fondos", hint: "Imágenes y gradientes propios", icon: ImageIcon, accent: "bg-sky-500/10 text-sky-600" },
  { key: "dashboard", label: "Dashboard", hint: "Tu panorama, a tu manera", icon: LayoutDashboard, accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "portal", label: "Portal", hint: "La cara de tu negocio", icon: Globe, accent: "bg-amber-500/10 text-amber-600" },
];

const HOME_STATUS_SUMMARY: { label: string; detail: string; status: StudioOptionStatus }[] = [
  { label: "Vista previa local", detail: "Lo que pruebas aquí vive solo en este panel", status: "preview" },
  { label: "Motor futuro", detail: "Guardar y aplicar de verdad llega después", status: "engine" },
  { label: "Sin guardar todavía", detail: "Nada se escribe en tu organización", status: "soon" },
];

function StudioMiniPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 via-violet-50 to-fuchsia-50 p-3 shadow-inner ring-1 ring-foreground/[0.04] dark:from-sky-500/[0.07] dark:via-violet-500/[0.07] dark:to-fuchsia-500/[0.07]"
    >
      <div className="overflow-hidden rounded-xl border bg-card/80 shadow-sm ring-1 ring-foreground/[0.05] backdrop-blur">
        {/* topbar miniatura */}
        <div className="flex items-center gap-1.5 border-b px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-rose-400/70" />
          <span className="size-1.5 rounded-full bg-amber-400/70" />
          <span className="size-1.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 h-1.5 w-20 rounded-full bg-gradient-to-r from-sky-400/50 via-violet-400/50 to-fuchsia-400/50" />
          <span className="ml-auto size-3.5 rounded-full bg-muted" />
        </div>
        <div className="flex">
          {/* sidebar miniatura */}
          <div className="hidden w-10 shrink-0 space-y-1.5 border-r p-2 sm:block">
            <span className="block h-1.5 w-6 rounded-full bg-primary/30" />
            <span className="block h-1.5 w-7 rounded-full bg-muted" />
            <span className="block h-1.5 w-5 rounded-full bg-muted" />
            <span className="block h-1.5 w-7 rounded-full bg-muted" />
          </div>
          {/* tarjetas tipo dashboard */}
          <div className="grid flex-1 grid-cols-3 gap-1.5 p-2.5">
            <span className="col-span-2 row-span-2 rounded-lg bg-gradient-to-br from-sky-400/25 to-violet-400/15 ring-1 ring-foreground/[0.04]" />
            <span className="rounded-lg bg-emerald-400/20 ring-1 ring-foreground/[0.04]" />
            <span className="rounded-lg bg-amber-400/20 ring-1 ring-foreground/[0.04]" />
            <span className="col-span-2 rounded-lg bg-fuchsia-400/15 ring-1 ring-foreground/[0.04]" />
            <span className="rounded-lg bg-violet-400/20 ring-1 ring-foreground/[0.04]" />
          </div>
        </div>
        {/* dock miniatura */}
        <div className="flex items-center justify-center gap-1 border-t bg-muted/30 px-2 py-1.5">
          <span className="size-3 rounded-md bg-primary/20 ring-1 ring-primary/30" />
          <span className="size-3 rounded-md bg-muted ring-1 ring-foreground/[0.05]" />
          <span className="size-3 rounded-md bg-muted ring-1 ring-foreground/[0.05]" />
          <span className="size-3 rounded-md bg-muted ring-1 ring-foreground/[0.05]" />
        </div>
      </div>
      <p className="mt-2 px-1 text-[10px] leading-snug text-muted-foreground">
        Una idea de cómo se vería tu nelzzon — colores, tarjetas y accesos, a tu manera.
      </p>
    </div>
  );
}

function StudioHome({ onNavigate }: { onNavigate: (key: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            Tu Design Studio
          </span>
          <h3 className="mt-2.5 text-2xl font-semibold tracking-tight">Tu nelzzon</h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Diseña cómo se ve, se siente y se organiza tu sistema — explora, prueba estilos
            y descubre hacia dónde puede llegar tu espacio de trabajo.
          </p>
        </div>
        <StudioMiniPreview />
      </div>

      <div>
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Empieza por aquí</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {HOME_QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.key}
                type="button"
                onClick={() => onNavigate(link.key)}
                className="group flex flex-col items-start gap-2 rounded-2xl border bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-foreground/10"
              >
                <span className={cn("flex size-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105", link.accent)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>
                  <span className="block text-xs font-medium">{link.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{link.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cómo va este adelanto</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {HOME_STATUS_SUMMARY.map((item) => (
            <li key={item.label} className="rounded-xl border bg-background/60 p-3">
              <StatusBadge status={item.status} />
              <p className="mt-1.5 text-xs font-medium">{item.label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
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
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.options.some((o) => o.label.toLowerCase().includes(q))
    );
  }, [query]);

  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];
  const ActiveIcon = active.icon;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Personalizar nelzzon"
      className={cn(
        "flex max-h-[min(40rem,82vh)] w-[min(46rem,94vw)] flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_32px_88px_-28px_rgba(0,0,0,0.32)] ring-1 ring-foreground/[0.06]",
        className
      )}
    >
      <div
        aria-hidden
        className="h-1.5 w-full shrink-0 bg-gradient-to-r from-sky-400/70 via-violet-400/70 to-fuchsia-400/70"
      />

      {/* Header */}
      <div className="shrink-0 border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Personalizar nelzzon</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                <Sparkles className="h-2.5 w-2.5" />
                Vista previa
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Haz que el sistema se sienta tuyo.
            </p>
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

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca una categoría — marca, fondos, dashboard, accesibilidad…"
            className="w-full rounded-full border bg-muted/30 py-2 pl-9 pr-3.5 text-xs placeholder:text-muted-foreground/70 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Body: rail + active section */}
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Categorías de personalización" className="w-44 shrink-0 overflow-y-auto border-r px-2.5 py-3 sm:w-52">
          {filteredSections.length === 0 && (
            <p className="px-2 py-4 text-[11px] leading-snug text-muted-foreground">
              No encontramos coincidencias — prueba con otra palabra.
            </p>
          )}
          <ul className="space-y-0.5">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.key === activeKey;
              return (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(section.key)}
                    aria-current={isActive}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-5">
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

          {/* Sección con vista previa real embebida */}
          {active.key === "apariencia" && (
            <div className="mt-5 space-y-5 rounded-2xl border bg-muted/20 p-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de vista</p>
                <PersonalizationPreviewToggle mode={mode} onChange={onChange} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estilos curados</p>
                <VisualStylePreview />
              </div>
            </div>
          )}

          {active.key === "accesibilidad" && (
            <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
              <AccessibilityPreview />
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

          {/* Opciones representativas de la categoría */}
          <ul className="mt-5 space-y-2">
            {active.options.map((option) => (
              <li
                key={option.label}
                className="flex items-start justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{option.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{option.hint}</p>
                </div>
                <StatusBadge status={option.status} />
              </li>
            ))}
          </ul>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Los cambios todavía no se guardan — esto es un adelanto de hacia dónde va nelzzon.
        </p>
        <span
          title="Guardar — requiere el motor de personalización"
          className="inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground/70"
        >
          <Lock className="h-3 w-3" />
          Guardar — requiere motor
        </span>
      </div>
    </div>
  );
}
