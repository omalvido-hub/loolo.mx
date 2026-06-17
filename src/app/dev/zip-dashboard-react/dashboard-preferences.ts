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

// ---------- Fondos sólidos (5 categorías) ----------

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

// ---------- Galería de fondos visuales (10 categorías, CSS puro) ----------

export interface GalleryBg {
  key:      string;
  label:    string;
  category: string;
  css:      string;
}

export const GALLERY_BACKGROUNDS: GalleryBg[] = [
  // ── Minimal / limpio (6) — gradientes suaves con profundidad visible ──
  { key: "min-1", category: "minimal", label: "Humo",    css: "linear-gradient(160deg,#f8fafc 0%,#e2e8f0 60%,#cbd5e1 100%)" },
  { key: "min-2", category: "minimal", label: "Papel",   css: "linear-gradient(150deg,#fffbf5 0%,#f0ede8 55%,#e0d8cc 100%)" },
  { key: "min-3", category: "minimal", label: "Hielo",   css: "linear-gradient(135deg,#e0f7ff 0%,#bae6fd 50%,#7dd3fc 100%)" },
  { key: "min-4", category: "minimal", label: "Caliza",  css: "linear-gradient(155deg,#faf9f7 0%,#e8dfd4 60%,#cfc0b0 100%)" },
  { key: "min-5", category: "minimal", label: "Seda",    css: "radial-gradient(ellipse at 30% 20%,#ddd6fe 0%,#ede9fe 50%,#f5f3ff 100%)" },
  { key: "min-6", category: "minimal", label: "Nube",    css: "radial-gradient(ellipse at 70% 30%,#c7d2fe 0%,#e0e7ff 50%,#f0f4ff 100%)" },

  // ── Pastel / suave (8) — pasteles con midtone visible ──
  { key: "pas-1", category: "pastel", label: "Lavanda",       css: "linear-gradient(135deg,#ede9fe 0%,#d8b4fe 60%,#c084fc 100%)" },
  { key: "pas-2", category: "pastel", label: "Menta",         css: "linear-gradient(135deg,#dcfce7 0%,#86efac 60%,#4ade80 100%)" },
  { key: "pas-3", category: "pastel", label: "Cielo",         css: "linear-gradient(135deg,#dbeafe 0%,#93c5fd 60%,#60a5fa 100%)" },
  { key: "pas-4", category: "pastel", label: "Durazno",       css: "linear-gradient(135deg,#ffedd5 0%,#fdba74 60%,#fb923c 100%)" },
  { key: "pas-5", category: "pastel", label: "Rosa palo",     css: "linear-gradient(135deg,#ffe4e6 0%,#fda4af 60%,#fb7185 100%)" },
  { key: "pas-6", category: "pastel", label: "Limón",         css: "linear-gradient(135deg,#fef9c3 0%,#fde047 60%,#eab308 100%)" },
  { key: "pas-7", category: "pastel", label: "Teal suave",    css: "linear-gradient(135deg,#ccfbf1 0%,#5eead4 60%,#2dd4bf 100%)" },
  { key: "pas-8", category: "pastel", label: "Violeta suave", css: "linear-gradient(135deg,#f5d0fe 0%,#e879f9 60%,#c026d3 100%)" },

  // ── Abstracto premium (8) — degradados multi-stop de 4 colores ──
  { key: "abs-1", category: "abstracto", label: "Aurora",        css: "linear-gradient(135deg,#6366f1 0%,#a855f7 33%,#ec4899 66%,#f97316 100%)" },
  { key: "abs-2", category: "abstracto", label: "Atardecer",     css: "linear-gradient(135deg,#fbbf24 0%,#f97316 33%,#ef4444 66%,#be185d 100%)" },
  { key: "abs-3", category: "abstracto", label: "Océano",        css: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 50%,#8b5cf6 100%)" },
  { key: "abs-4", category: "abstracto", label: "Bosque",        css: "linear-gradient(135deg,#34d399 0%,#059669 35%,#0d9488 70%,#0284c7 100%)" },
  { key: "abs-5", category: "abstracto", label: "Crepúsculo",    css: "linear-gradient(160deg,#7c3aed 0%,#a21caf 35%,#db2777 70%,#f97316 100%)" },
  { key: "abs-6", category: "abstracto", label: "Cielo norte",   css: "linear-gradient(135deg,#0ea5e9 0%,#38bdf8 40%,#22d3ee 70%,#2dd4bf 100%)" },
  { key: "abs-7", category: "abstracto", label: "Tierra cálida", css: "linear-gradient(135deg,#78350f 0%,#b45309 40%,#d97706 70%,#fbbf24 100%)" },
  { key: "abs-8", category: "abstracto", label: "Jade",          css: "linear-gradient(135deg,#064e3b 0%,#059669 40%,#10b981 70%,#6ee7b7 100%)" },

  // ── Ondas / fluidos (6) — radiales superpuestos (efecto orbe/lens flare) ──
  { key: "ond-1", category: "ondas", label: "Burbuja",       css: "radial-gradient(circle at 25% 35%,#c4b5fd 0%,transparent 55%),radial-gradient(circle at 75% 70%,#fbcfe8 0%,transparent 55%),#f0e8ff" },
  { key: "ond-2", category: "ondas", label: "Marea",         css: "radial-gradient(circle at 30% 30%,#7dd3fc 0%,transparent 55%),radial-gradient(circle at 70% 70%,#38bdf8 0%,transparent 55%),#ddf4ff" },
  { key: "ond-3", category: "ondas", label: "Bruma",         css: "radial-gradient(circle at 20% 80%,#86efac 0%,transparent 55%),radial-gradient(circle at 80% 20%,#fde047 0%,transparent 55%),#edfff4" },
  { key: "ond-4", category: "ondas", label: "Coral",         css: "radial-gradient(circle at 30% 30%,#fdba74 0%,transparent 55%),radial-gradient(circle at 70% 70%,#f97316 0%,transparent 55%),#fff3e0" },
  { key: "ond-5", category: "ondas", label: "Índigo fluido", css: "radial-gradient(circle at 20% 80%,#818cf8 0%,transparent 55%),radial-gradient(circle at 80% 20%,#a78bfa 0%,transparent 55%),#eef0ff" },
  { key: "ond-6", category: "ondas", label: "Solar",         css: "radial-gradient(circle at 50% 20%,#fde047 0%,#fbbf24 30%,transparent 65%),radial-gradient(circle at 80% 80%,#fb923c 0%,transparent 50%),#fffce0" },

  // ── Glass / moderno (6) — candy multicolor tipo holográfico ──
  { key: "gls-1", category: "glass", label: "Cristal",     css: "linear-gradient(135deg,#bfdbfe 0%,#ddd6fe 33%,#fbcfe8 66%,#fed7aa 100%)" },
  { key: "gls-2", category: "glass", label: "Prisma",      css: "linear-gradient(160deg,#a7f3d0 0%,#bfdbfe 50%,#ddd6fe 100%)" },
  { key: "gls-3", category: "glass", label: "Cálido",      css: "linear-gradient(135deg,#fde68a 0%,#fca5a5 50%,#f9a8d4 100%)" },
  { key: "gls-4", category: "glass", label: "Hielo polar", css: "linear-gradient(135deg,#a5f3fc 0%,#a7f3d0 50%,#ddd6fe 100%)" },
  { key: "gls-5", category: "glass", label: "Neón suave",  css: "linear-gradient(135deg,#6ee7b7 0%,#93c5fd 50%,#f9a8d4 100%)" },
  { key: "gls-6", category: "glass", label: "Espejo",      css: "linear-gradient(135deg,#bae6fd 0%,#c7d2fe 33%,#ddd6fe 66%,#f5d0fe 100%)" },

  // ── Oscuro elegante (6) — oscuros profundos con gradiente real ──
  { key: "osc-1", category: "oscuro", label: "Índigo",   css: "linear-gradient(135deg,#0f0a2e 0%,#1e1b4b 50%,#3730a3 100%)" },
  { key: "osc-2", category: "oscuro", label: "Pizarra",  css: "linear-gradient(135deg,#020617 0%,#0f172a 50%,#1e293b 100%)" },
  { key: "osc-3", category: "oscuro", label: "Bosque",   css: "linear-gradient(135deg,#022c22 0%,#064e3b 50%,#065f46 100%)" },
  { key: "osc-4", category: "oscuro", label: "Madera",   css: "linear-gradient(135deg,#0c0502 0%,#1c0a00 50%,#292524 100%)" },
  { key: "osc-5", category: "oscuro", label: "Marina",   css: "linear-gradient(135deg,#020740 0%,#0c1445 50%,#1e3a8a 100%)" },
  { key: "osc-6", category: "oscuro", label: "Carbón",   css: "linear-gradient(135deg,#030712 0%,#111827 50%,#1f2937 100%)" },

  // ── Creativo / colorido (6) — arcoíris y candy bold ──
  { key: "cre-1", category: "creativo", label: "Arcoíris",    css: "linear-gradient(135deg,#f87171 0%,#fb923c 20%,#fbbf24 40%,#4ade80 60%,#60a5fa 80%,#c084fc 100%)" },
  { key: "cre-2", category: "creativo", label: "Amanecer",    css: "linear-gradient(135deg,#fef3c7 0%,#fca5a5 50%,#f43f5e 100%)" },
  { key: "cre-3", category: "creativo", label: "Cielo vivo",  css: "linear-gradient(135deg,#67e8f9 0%,#818cf8 50%,#c084fc 100%)" },
  { key: "cre-4", category: "creativo", label: "Tropical",    css: "linear-gradient(135deg,#4ade80 0%,#22d3ee 50%,#818cf8 100%)" },
  { key: "cre-5", category: "creativo", label: "Candy",       css: "linear-gradient(135deg,#f9a8d4 0%,#fde68a 50%,#f9a8d4 100%)" },
  { key: "cre-6", category: "creativo", label: "Retro pastel",css: "linear-gradient(135deg,#fed7aa 0%,#fda4af 33%,#c4b5fd 66%,#a5f3fc 100%)" },

  // ── Naturaleza suave (6) — tonos tierra y naturaleza ──
  { key: "nat-1", category: "naturaleza", label: "Musgo",        css: "linear-gradient(160deg,#ecfdf5 0%,#86efac 50%,#4ade80 100%)" },
  { key: "nat-2", category: "naturaleza", label: "Pino",         css: "linear-gradient(135deg,#052e16 0%,#166534 50%,#15803d 100%)" },
  { key: "nat-3", category: "naturaleza", label: "Otoño",        css: "linear-gradient(135deg,#fef3c7 0%,#fbbf24 30%,#f97316 65%,#dc2626 100%)" },
  { key: "nat-4", category: "naturaleza", label: "Brezo",        css: "linear-gradient(135deg,#fdf4ff 0%,#c084fc 50%,#7c3aed 100%)" },
  { key: "nat-5", category: "naturaleza", label: "Pétalo",       css: "radial-gradient(ellipse at top,#fff1f2 0%,#fda4af 50%,#fb7185 100%)" },
  { key: "nat-6", category: "naturaleza", label: "Tierra verde", css: "linear-gradient(160deg,#f7fee7 0%,#bef264 50%,#84cc16 100%)" },

  // ── Espacios limpios (6) — interiores cálidos con profundidad ──
  { key: "esp-1", category: "espacios", label: "Lino",        css: "linear-gradient(160deg,#fdf9f3 0%,#d4b896 50%,#a07030 100%)" },
  { key: "esp-2", category: "espacios", label: "Concreto",    css: "linear-gradient(160deg,#f3f4f6 0%,#9ca3af 50%,#6b7280 100%)" },
  { key: "esp-3", category: "espacios", label: "Yeso",        css: "radial-gradient(ellipse at 30% 20%,#ffffff 0%,#f3f4f6 50%,#d1d5db 100%)" },
  { key: "esp-4", category: "espacios", label: "Madera clara",css: "linear-gradient(135deg,#fef9c3 0%,#ca8a04 50%,#92400e 100%)" },
  { key: "esp-5", category: "espacios", label: "Mármol",      css: "linear-gradient(145deg,#f9f9f9 0%,#d1d5db 25%,#f5f5f5 50%,#9ca3af 75%,#e5e7eb 100%)" },
  { key: "esp-6", category: "espacios", label: "Cuero suave", css: "linear-gradient(135deg,#fef3c7 0%,#b45309 50%,#78350f 100%)" },

  // ── Patrones sutiles (6, background shorthand con size incluido) ──
  { key: "pat-1", category: "patron", label: "Puntos",         css: "radial-gradient(circle,#cbd5e1 1.5px,transparent 1.5px) 0 0/20px 20px #f5f6f8" },
  { key: "pat-2", category: "patron", label: "Cuadrícula",     css: "linear-gradient(#e5e7eb 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,#e5e7eb 1px,transparent 1px) 0 0/28px 28px #f9fafb" },
  { key: "pat-3", category: "patron", label: "Diagonal",       css: "repeating-linear-gradient(45deg,#e3e5ea,#e3e5ea 1px,transparent 0,transparent 50%) 0 0/16px 16px #f5f6f8" },
  { key: "pat-4", category: "patron", label: "Puntos finos",   css: "radial-gradient(circle,#d1d5db 1px,transparent 1px) 0 0/12px 12px #ffffff" },
  { key: "pat-5", category: "patron", label: "Rombos",         css: "repeating-linear-gradient(45deg,transparent,transparent 8px,#e9eaed 8px,#e9eaed 9px),repeating-linear-gradient(-45deg,transparent,transparent 8px,#e9eaed 8px,#e9eaed 9px) #f8f9fa" },
  { key: "pat-6", category: "patron", label: "Puntos grandes", css: "radial-gradient(circle,#e2e8f0 2px,transparent 2px) 0 0/30px 30px #f8fafc" },
];

// ---------- Patrones (legacy, mantenidos para compatibilidad) ----------

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
