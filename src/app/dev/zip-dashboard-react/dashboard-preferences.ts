// Arquitectura de preferencias del dashboard React (ZIP).
//
// Centraliza tipos, valores por defecto y almacenamiento versionado en
// localStorage. ZipDashboardReactClient.tsx consume estas funciones/tipos sin
// lógica de validación o storage propia.

// ---------- Tipos ----------

export type AccentKey =
  | "morado" | "azul" | "verde" | "naranja" | "rosa"
  | "violeta" | "aqua" | "grafito"
  | "personalizado";

export type Density    = "comodo" | "compact" | "amplio";
export type CardStyle  = "suave"  | "marcado" | "minimal";
export type IconStyle  = "normal" | "redondo" | "grande";
export type Typography = "normal" | "grande"  | "compacta";

export type BackgroundType    = "solido" | "galeria" | "patron" | "manual" | "imagen";
export type GradientDirection = "135deg" | "90deg" | "180deg" | "45deg";
export type PatternKey        = "puntos" | "cuadricula" | "diagonal" | "papel";

export interface DashboardPreferences {
  accent:            AccentKey;
  customAccentColor: string;
  backgroundType:    BackgroundType;
  backgroundValue:   string;
  gradientDirection: GradientDirection;
  gradientFrom:      string;
  gradientTo:        string;
  backgroundImage:   string | null;
  recentAccents:     string[];
  density:           Density;
  cardStyle:         CardStyle;
  iconStyle:         IconStyle;
  typography:        Typography;
  showDock:          boolean;
}

// ---------- Fondos sólidos (4 categorías) ----------

export interface BgOption {
  key:   string;
  label: string;
  value: string;
}

export const SOLID_BACKGROUNDS: BgOption[] = [
  // Claros (6)
  { key: "default",        label: "Predeterminado", value: "transparent" },
  { key: "blanco",         label: "Blanco",         value: "#ffffff" },
  { key: "nieve",          label: "Nieve",          value: "#f9fafb" },
  { key: "perla",          label: "Perla",          value: "#f8f7f5" },
  { key: "marfil",         label: "Marfil",         value: "#fffef0" },
  { key: "crema",          label: "Crema",          value: "#fef9ef" },
  // Pasteles (8)
  { key: "azulado",        label: "Azulado",        value: "#eef2f7" },
  { key: "menta-sol",      label: "Menta",          value: "#f0fdf4" },
  { key: "lavanda-sol",    label: "Lavanda",        value: "#faf5ff" },
  { key: "durazno-sol",    label: "Durazno",        value: "#fff7ed" },
  { key: "rosa-suave",     label: "Rosa suave",     value: "#fff1f2" },
  { key: "limon-sol",      label: "Limón",          value: "#fefce8" },
  { key: "teal-sol",       label: "Teal",           value: "#f0fdfa" },
  { key: "violeta-sol",    label: "Violeta",        value: "#fdf4ff" },
  // Neutros (6)
  { key: "calido",         label: "Cálido",         value: "#f6f3ee" },
  { key: "arena",          label: "Arena",          value: "#fdfaf5" },
  { key: "pizarra",        label: "Pizarra",        value: "#f0f2f5" },
  { key: "piedra",         label: "Piedra",         value: "#f5f5f4" },
  { key: "beige",          label: "Beige",          value: "#f2ede8" },
  { key: "platino",        label: "Platino",        value: "#f4f4f6" },
  // Vibrantes suaves (5)
  { key: "cielo-vivo",     label: "Cielo",          value: "#e0f2fe" },
  { key: "verde-vivo",     label: "Esmeralda",      value: "#dcfce7" },
  { key: "violeta-vivo",   label: "Violeta",        value: "#ede9fe" },
  { key: "amber-vivo",     label: "Ámbar",          value: "#fef3c7" },
  { key: "rosa-vivo",      label: "Rosa",           value: "#fce7f3" },
  // Oscuros suaves (5)
  { key: "azul-noche",     label: "Azul noche",     value: "#1e1b4b" },
  { key: "carbon",         label: "Carbón",         value: "#111827" },
  { key: "bosque-n",       label: "Bosque",         value: "#052e16" },
  { key: "pizarra-oscura", label: "Pizarra",        value: "#1e293b" },
  { key: "vino",           label: "Vino",           value: "#2d1220" },
];

// ---------- Galería de fondos visuales (CSS/gradientes puros) ----------

export interface GalleryBg {
  key:      string;
  label:    string;
  category: string;
  css:      string;
}

export const GALLERY_BACKGROUNDS: GalleryBg[] = [
  // Minimal / limpio (6)
  { key: "min-1", category: "minimal",    label: "Humo",          css: "linear-gradient(180deg,#f8fafc,#f1f5f9)" },
  { key: "min-2", category: "minimal",    label: "Papel",         css: "linear-gradient(180deg,#fefefe,#efefef)" },
  { key: "min-3", category: "minimal",    label: "Hielo",         css: "linear-gradient(180deg,#f0f9ff,#e0f2fe)" },
  { key: "min-4", category: "minimal",    label: "Caliza",        css: "linear-gradient(180deg,#faf9f7,#f0ece6)" },
  { key: "min-5", category: "minimal",    label: "Seda",          css: "linear-gradient(180deg,#ffffff,#f4f4f6)" },
  { key: "min-6", category: "minimal",    label: "Nube",          css: "linear-gradient(165deg,#f9fafb,#e5e7eb)" },
  // Pastel / suave (8)
  { key: "pas-1", category: "pastel",     label: "Lavanda",       css: "linear-gradient(135deg,#faf5ff,#ede9fe)" },
  { key: "pas-2", category: "pastel",     label: "Menta",         css: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
  { key: "pas-3", category: "pastel",     label: "Cielo",         css: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
  { key: "pas-4", category: "pastel",     label: "Durazno",       css: "linear-gradient(135deg,#fff7ed,#fed7aa)" },
  { key: "pas-5", category: "pastel",     label: "Rosa palo",     css: "linear-gradient(135deg,#fff1f2,#fce7eb)" },
  { key: "pas-6", category: "pastel",     label: "Limón",         css: "linear-gradient(135deg,#fefce8,#fef9c3)" },
  { key: "pas-7", category: "pastel",     label: "Teal suave",    css: "linear-gradient(135deg,#f0fdfa,#ccfbf1)" },
  { key: "pas-8", category: "pastel",     label: "Violeta suave", css: "linear-gradient(135deg,#fdf4ff,#f5d0fe)" },
  // Abstracto premium (8, rgba sobre base — sin opacity en contenedor)
  { key: "abs-1", category: "abstracto",  label: "Aurora",        css: "linear-gradient(135deg,rgba(99,102,241,.08) 0%,rgba(139,92,246,.08) 100%),#f9f8ff" },
  { key: "abs-2", category: "abstracto",  label: "Atardecer",     css: "linear-gradient(135deg,rgba(251,146,60,.09) 0%,rgba(239,68,68,.07) 100%),#fff9f7" },
  { key: "abs-3", category: "abstracto",  label: "Océano",        css: "linear-gradient(135deg,rgba(14,165,233,.09) 0%,rgba(99,102,241,.07) 100%),#f0f8ff" },
  { key: "abs-4", category: "abstracto",  label: "Bosque",        css: "linear-gradient(135deg,rgba(5,150,105,.08) 0%,rgba(6,182,212,.07) 100%),#f0fdf8" },
  { key: "abs-5", category: "abstracto",  label: "Crepúsculo",    css: "linear-gradient(135deg,rgba(126,34,206,.08) 0%,rgba(219,39,119,.07) 100%),#fff5f8" },
  { key: "abs-6", category: "abstracto",  label: "Cielo norte",   css: "linear-gradient(135deg,rgba(2,132,199,.08) 0%,rgba(14,165,233,.07) 100%),#f0f9ff" },
  { key: "abs-7", category: "abstracto",  label: "Tierra cálida", css: "linear-gradient(135deg,rgba(180,83,9,.07) 0%,rgba(161,98,7,.06) 100%),#fffbf0" },
  { key: "abs-8", category: "abstracto",  label: "Jade",          css: "linear-gradient(135deg,rgba(5,150,105,.07) 0%,rgba(16,185,129,.06) 100%),#f0fdf6" },
  // Ondas / fluidos (6)
  { key: "ond-1", category: "ondas",      label: "Burbuja",       css: "radial-gradient(ellipse at 20% 50%,rgba(99,102,241,.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(139,92,246,.10) 0%,transparent 50%),#f8f7ff" },
  { key: "ond-2", category: "ondas",      label: "Marea",         css: "radial-gradient(ellipse at top,rgba(14,165,233,.12) 0%,transparent 60%),radial-gradient(ellipse at bottom,rgba(6,182,212,.09) 0%,transparent 60%),#f0f8ff" },
  { key: "ond-3", category: "ondas",      label: "Bruma",         css: "radial-gradient(ellipse at 30% 70%,rgba(5,150,105,.09) 0%,transparent 50%),radial-gradient(ellipse at 70% 30%,rgba(234,179,8,.07) 0%,transparent 50%),#f5fdf8" },
  { key: "ond-4", category: "ondas",      label: "Coral",         css: "radial-gradient(ellipse at 25% 25%,rgba(251,146,60,.14) 0%,transparent 50%),radial-gradient(ellipse at 75% 75%,rgba(249,115,22,.10) 0%,transparent 50%),#fff8f2" },
  { key: "ond-5", category: "ondas",      label: "Índigo fluido", css: "radial-gradient(ellipse at top left,rgba(79,70,229,.12) 0%,transparent 45%),radial-gradient(ellipse at bottom right,rgba(109,40,217,.09) 0%,transparent 45%),#f5f4ff" },
  { key: "ond-6", category: "ondas",      label: "Solar",         css: "radial-gradient(ellipse at center,rgba(234,179,8,.10) 0%,transparent 60%),radial-gradient(ellipse at bottom,rgba(251,146,60,.08) 0%,transparent 60%),#fffdf0" },
  // Glass / moderno (6)
  { key: "gls-1", category: "glass",      label: "Cristal",       css: "linear-gradient(160deg,#e0f2fe 0%,#f0f9ff 35%,#faf5ff 70%,#fdf4ff 100%)" },
  { key: "gls-2", category: "glass",      label: "Prisma",        css: "linear-gradient(160deg,#ecfdf5 0%,#eff6ff 50%,#fdf4ff 100%)" },
  { key: "gls-3", category: "glass",      label: "Cálido",        css: "linear-gradient(160deg,#fff7ed 0%,#fffbeb 50%,#f0fdf4 100%)" },
  { key: "gls-4", category: "glass",      label: "Hielo polar",   css: "linear-gradient(160deg,#e0f7fa 0%,#e8f5e9 50%,#f3e5f5 100%)" },
  { key: "gls-5", category: "glass",      label: "Neón suave",    css: "linear-gradient(160deg,#e8f5e9 0%,#e3f2fd 50%,#fce4ec 100%)" },
  { key: "gls-6", category: "glass",      label: "Espejo",        css: "linear-gradient(160deg,#b3e5fc 0%,#e1f5fe 50%,#f8f9fa 100%)" },
  // Oscuro elegante (6, tarjetas siguen blancas y opacas)
  { key: "osc-1", category: "oscuro",     label: "Índigo",        css: "linear-gradient(135deg,#1e1b4b,#312e81)" },
  { key: "osc-2", category: "oscuro",     label: "Pizarra",       css: "linear-gradient(135deg,#0f172a,#1e293b)" },
  { key: "osc-3", category: "oscuro",     label: "Bosque",        css: "linear-gradient(135deg,#042f2e,#064e3b)" },
  { key: "osc-4", category: "oscuro",     label: "Madera",        css: "linear-gradient(135deg,#1c0a00,#292524)" },
  { key: "osc-5", category: "oscuro",     label: "Marina",        css: "linear-gradient(135deg,#0c1445,#1a237e)" },
  { key: "osc-6", category: "oscuro",     label: "Carbón",        css: "linear-gradient(135deg,#212121,#37474f)" },
  // Creativo / colorido (6)
  { key: "cre-1", category: "creativo",   label: "Arcoíris",      css: "linear-gradient(135deg,#fce7f3,#e0e7ff,#d1fae5)" },
  { key: "cre-2", category: "creativo",   label: "Amanecer",      css: "linear-gradient(135deg,#fef3c7,#fde68a 30%,#fca5a5 70%,#fde8d8)" },
  { key: "cre-3", category: "creativo",   label: "Cielo vivo",    css: "linear-gradient(135deg,#a5f3fc,#93c5fd,#d8b4fe)" },
  { key: "cre-4", category: "creativo",   label: "Tropical",      css: "linear-gradient(135deg,#bbf7d0,#bae6fd,#c7d2fe)" },
  { key: "cre-5", category: "creativo",   label: "Candy",         css: "linear-gradient(135deg,#ffecd2,#fcb69f 50%,#ffecd2)" },
  { key: "cre-6", category: "creativo",   label: "Retro pastel",  css: "linear-gradient(135deg,#f8e1c8,#e8c9d0 50%,#d4b8e0)" },
  // Naturaleza suave (6)
  { key: "nat-1", category: "naturaleza", label: "Musgo",         css: "linear-gradient(180deg,#ecfdf5,#d1fae5)" },
  { key: "nat-2", category: "naturaleza", label: "Pino",          css: "linear-gradient(135deg,#f0fdf4,#bbf7d0 60%,#a7f3d0)" },
  { key: "nat-3", category: "naturaleza", label: "Otoño",         css: "linear-gradient(135deg,#fef3c7,#fde68a 30%,#fed7aa 70%,#fca5a5)" },
  { key: "nat-4", category: "naturaleza", label: "Brezo",         css: "linear-gradient(135deg,#fdf4ff,#e9d5ff 50%,#c4b5fd)" },
  { key: "nat-5", category: "naturaleza", label: "Pétalo",        css: "linear-gradient(180deg,#fff0f3,#ffd6e0 50%,#ffb3c6)" },
  { key: "nat-6", category: "naturaleza", label: "Tierra verde",  css: "linear-gradient(135deg,#f7fee7,#d9f99d 50%,#bbf7d0)" },
  // Espacios / interiores limpios (6)
  { key: "esp-1", category: "espacios",   label: "Lino",          css: "linear-gradient(180deg,#fdf9f3,#f5ede0)" },
  { key: "esp-2", category: "espacios",   label: "Concreto",      css: "linear-gradient(180deg,#e9e9e9,#d4d4d8)" },
  { key: "esp-3", category: "espacios",   label: "Yeso",          css: "linear-gradient(180deg,#fafafa,#f4f4f5)" },
  { key: "esp-4", category: "espacios",   label: "Madera clara",  css: "linear-gradient(135deg,#fef3c7,#fde68a 40%,#fef9c3)" },
  { key: "esp-5", category: "espacios",   label: "Mármol",        css: "linear-gradient(135deg,#f9f9f9 0%,#e8e8e8 30%,#f9f9f9 60%,#f0f0f0 100%)" },
  { key: "esp-6", category: "espacios",   label: "Cuero suave",   css: "linear-gradient(135deg,#fdf4e3,#f9e4b7 50%,#fdf4e3)" },
  // Patrones sutiles (6, CSS background shorthand con tamaño incluido)
  { key: "pat-1", category: "patron",     label: "Puntos",        css: "radial-gradient(circle,#cbd5e1 1.5px,transparent 1.5px) 0 0/20px 20px #f5f6f8" },
  { key: "pat-2", category: "patron",     label: "Cuadrícula",    css: "linear-gradient(#e5e7eb 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,#e5e7eb 1px,transparent 1px) 0 0/28px 28px #f9fafb" },
  { key: "pat-3", category: "patron",     label: "Diagonal",      css: "repeating-linear-gradient(45deg,#e3e5ea,#e3e5ea 1px,transparent 0,transparent 50%) 0 0/16px 16px #f5f6f8" },
  { key: "pat-4", category: "patron",     label: "Puntos finos",  css: "radial-gradient(circle,#d1d5db 1px,transparent 1px) 0 0/12px 12px #ffffff" },
  { key: "pat-5", category: "patron",     label: "Rombos",        css: "repeating-linear-gradient(45deg,transparent,transparent 8px,#e9eaed 8px,#e9eaed 9px),repeating-linear-gradient(-45deg,transparent,transparent 8px,#e9eaed 8px,#e9eaed 9px) #f8f9fa" },
  { key: "pat-6", category: "patron",     label: "Puntos grandes",css: "radial-gradient(circle,#e2e8f0 2px,transparent 2px) 0 0/30px 30px #f8fafc" },
];

// ---------- Patrones ----------

export const PATTERN_KEYS: PatternKey[] = ["puntos", "cuadricula", "diagonal", "papel"];

export const PATTERN_LABELS: Record<PatternKey, string> = {
  puntos:     "Puntos",
  cuadricula: "Cuadrícula",
  diagonal:   "Diagonal",
  papel:      "Papel",
};

export interface PatternStyle {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize:  string;
}

export function getPatternBackground(key: PatternKey): PatternStyle {
  switch (key) {
    case "puntos":
      return {
        backgroundColor: "#f5f6f8",
        backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
        backgroundSize:  "20px 20px",
      };
    case "cuadricula":
      return {
        backgroundColor: "#f5f6f8",
        backgroundImage:
          "linear-gradient(var(--line,#ecedf1) 1px, transparent 1px)," +
          "linear-gradient(90deg, var(--line,#ecedf1) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      };
    case "diagonal":
      return {
        backgroundColor: "#f5f6f8",
        backgroundImage:
          "repeating-linear-gradient(45deg,#e3e5ea 0,#e3e5ea 1px,transparent 0,transparent 50%)",
        backgroundSize: "16px 16px",
      };
    case "papel":
      return {
        backgroundColor: "#faf9f7",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E\")",
        backgroundSize: "300px 300px",
      };
  }
}

// ---------- Utilidades de color ----------

export const MAX_BACKGROUND_IMAGE_BYTES = 200 * 1024;

export function isValidHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function deriveAccentSoft(hex: string): string {
  try {
    const clean = hex.replace("#", "");
    const n = parseInt(clean, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const mix = (c: number) => Math.round(c * 0.12 + 255 * 0.88);
    return (
      "#" +
      [mix(r), mix(g), mix(b)]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return "#eef2ff";
  }
}

// ---------- Versión y defaults ----------

export const PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  accent:            "morado",
  customAccentColor: "#4f46e5",
  backgroundType:    "solido",
  backgroundValue:   "default",
  gradientDirection: "135deg",
  gradientFrom:      "#eef2ff",
  gradientTo:        "#f5f3ff",
  backgroundImage:   null,
  recentAccents:     [],
  density:           "comodo",
  cardStyle:         "suave",
  iconStyle:         "normal",
  typography:        "normal",
  showDock:          true,
};

// ---------- Storage ----------

export const PREFERENCES_STORAGE_KEY = "nelzzon.dashboard.preferences.v1";

const LEGACY_STORAGE_KEY = "nelzzon:zip-dashboard-react:prefs";

interface StoredPreferences {
  version:     number;
  preferences: DashboardPreferences;
}

// ---------- Validación / sanitize ----------

const ACCENT_KEYS: readonly AccentKey[] = [
  "morado", "azul", "verde", "naranja", "rosa",
  "violeta", "aqua", "grafito", "personalizado",
];
const DENSITY_KEYS:            readonly Density[]          = ["comodo", "compact", "amplio"];
const CARD_STYLE_KEYS:         readonly CardStyle[]        = ["suave", "marcado", "minimal"];
const ICON_STYLE_KEYS:         readonly IconStyle[]        = ["normal", "redondo", "grande"];
const TYPOGRAPHY_KEYS:         readonly Typography[]       = ["normal", "grande", "compacta"];
const BG_TYPE_KEYS:            readonly BackgroundType[]   = ["solido", "galeria", "patron", "manual", "imagen"];
const GRADIENT_DIRECTION_KEYS: readonly GradientDirection[]= ["135deg", "90deg", "180deg", "45deg"];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function sanitizePreferences(value: unknown): DashboardPreferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }
  const c = value as Partial<Record<string, unknown>>;
  return {
    accent:            isOneOf(c.accent, ACCENT_KEYS)              ? c.accent            : DEFAULT_PREFERENCES.accent,
    customAccentColor: isValidHex(c.customAccentColor)             ? c.customAccentColor  : DEFAULT_PREFERENCES.customAccentColor,
    backgroundType:    isOneOf(c.backgroundType, BG_TYPE_KEYS)     ? c.backgroundType     : DEFAULT_PREFERENCES.backgroundType,
    backgroundValue:   typeof c.backgroundValue === "string" && c.backgroundValue.length <= 64
                         ? c.backgroundValue : DEFAULT_PREFERENCES.backgroundValue,
    gradientDirection: isOneOf(c.gradientDirection, GRADIENT_DIRECTION_KEYS) ? c.gradientDirection : DEFAULT_PREFERENCES.gradientDirection,
    gradientFrom:      isValidHex(c.gradientFrom)                  ? c.gradientFrom       : DEFAULT_PREFERENCES.gradientFrom,
    gradientTo:        isValidHex(c.gradientTo)                    ? c.gradientTo         : DEFAULT_PREFERENCES.gradientTo,
    backgroundImage:   (
                         typeof c.backgroundImage === "string" &&
                         c.backgroundImage.startsWith("data:image/") &&
                         c.backgroundImage.length <= MAX_BACKGROUND_IMAGE_BYTES * 1.4
                       ) ? c.backgroundImage : null,
    recentAccents:     Array.isArray(c.recentAccents)
                         ? (c.recentAccents as unknown[]).filter(isValidHex).slice(0, 8)
                         : DEFAULT_PREFERENCES.recentAccents,
    density:           isOneOf(c.density, DENSITY_KEYS)            ? c.density            : DEFAULT_PREFERENCES.density,
    cardStyle:         isOneOf(c.cardStyle, CARD_STYLE_KEYS)       ? c.cardStyle          : DEFAULT_PREFERENCES.cardStyle,
    iconStyle:         isOneOf(c.iconStyle, ICON_STYLE_KEYS)       ? c.iconStyle          : DEFAULT_PREFERENCES.iconStyle,
    typography:        isOneOf(c.typography, TYPOGRAPHY_KEYS)      ? c.typography         : DEFAULT_PREFERENCES.typography,
    showDock:          typeof c.showDock === "boolean"             ? c.showDock           : DEFAULT_PREFERENCES.showDock,
  };
}

// ---------- Reset parcial (solo fondo) ----------

export function resetBackgroundPreferences(current: DashboardPreferences): DashboardPreferences {
  return {
    ...current,
    backgroundType:    DEFAULT_PREFERENCES.backgroundType,
    backgroundValue:   DEFAULT_PREFERENCES.backgroundValue,
    gradientDirection: DEFAULT_PREFERENCES.gradientDirection,
    gradientFrom:      DEFAULT_PREFERENCES.gradientFrom,
    gradientTo:        DEFAULT_PREFERENCES.gradientTo,
    backgroundImage:   DEFAULT_PREFERENCES.backgroundImage,
  };
}

// ---------- load / save / reset ----------

function loadLegacyPreferences(): DashboardPreferences | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return loadLegacyPreferences() ?? { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    if (parsed.version !== PREFERENCES_VERSION) return { ...DEFAULT_PREFERENCES };
    return sanitizePreferences(parsed.preferences);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: DashboardPreferences): void {
  if (typeof window === "undefined") return;
  const payload: StoredPreferences = { version: PREFERENCES_VERSION, preferences };
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Almacenamiento no disponible — la personalización no persiste.
  }
}

export function resetPreferences(): DashboardPreferences {
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(PREFERENCES_STORAGE_KEY); } catch { /* ignorar */ }
  }
  return { ...DEFAULT_PREFERENCES };
}
