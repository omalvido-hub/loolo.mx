// Arquitectura de preferencias del dashboard React (ZIP).
//
// Centraliza tipos, valores por defecto y almacenamiento versionado en
// localStorage. ZipDashboardReactClient.tsx consume estas funciones/tipos sin
// lógica de validación o storage propia. Migrar a UserPreference (backend)
// solo requiere cambiar load/save/reset, no el panel.

// ---------- Tipos ----------

export type AccentKey =
  | "morado" | "azul" | "verde" | "naranja" | "rosa"
  | "violeta" | "aqua" | "grafito"
  | "personalizado";

export type Density    = "comodo" | "compact" | "amplio";
export type CardStyle  = "suave"  | "marcado" | "minimal";
export type IconStyle  = "normal" | "redondo" | "grande";
export type Typography = "normal" | "grande"  | "compacta";

export type BackgroundType    = "solido" | "degradado" | "patron" | "imagen";
export type GradientMode      = "predefinido" | "manual";
export type GradientDirection = "135deg" | "90deg" | "180deg" | "45deg";
export type PatternKey        = "puntos" | "cuadricula" | "diagonal" | "papel";

export interface DashboardPreferences {
  // Acento
  accent:            AccentKey;
  customAccentColor: string;
  // Fondo del área principal (.main)
  backgroundType:  BackgroundType;
  backgroundValue: string;
  gradientMode:      GradientMode;
  gradientDirection: GradientDirection;
  gradientFrom:      string;
  gradientTo:        string;
  backgroundImage: string | null;
  // Layout y estilo
  density:    Density;
  cardStyle:  CardStyle;
  iconStyle:  IconStyle;
  typography: Typography;
  showDock:   boolean;
}

// ---------- Catálogos de fondo ----------

export interface BgOption {
  key:   string;
  label: string;
  value: string;
}

export const SOLID_BACKGROUNDS: BgOption[] = [
  { key: "default", label: "Predeterminado", value: "transparent" },
  { key: "blanco",  label: "Blanco",         value: "#ffffff" },
  { key: "azulado", label: "Azulado",        value: "#eef2f7" },
  { key: "calido",  label: "Cálido",         value: "#f6f3ee" },
  { key: "pizarra", label: "Pizarra",        value: "#f0f2f5" },
];

export const GRADIENT_BACKGROUNDS: BgOption[] = [
  { key: "aurora",  label: "Aurora",  value: "linear-gradient(135deg,#eef2ff,#f5f3ff)" },
  { key: "menta",   label: "Menta",   value: "linear-gradient(135deg,#ecfdf5,#eff8ff)" },
  { key: "calido",  label: "Cálido",  value: "linear-gradient(135deg,#fff7ed,#fef3c7)" },
  { key: "perla",   label: "Perla",   value: "linear-gradient(135deg,#f8fafc,#eef2f7)" },
  { key: "durazno", label: "Durazno", value: "linear-gradient(135deg,#fff1f3,#fff7ed)" },
  { key: "cielo",   label: "Cielo",   value: "linear-gradient(135deg,#eff8ff,#ecfdf5)" },
];

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
  gradientMode:      "predefinido",
  gradientDirection: "135deg",
  gradientFrom:      "#eef2ff",
  gradientTo:        "#f5f3ff",
  backgroundImage:   null,
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
const DENSITY_KEYS:       readonly Density[]       = ["comodo", "compact", "amplio"];
const CARD_STYLE_KEYS:    readonly CardStyle[]     = ["suave", "marcado", "minimal"];
const ICON_STYLE_KEYS:    readonly IconStyle[]     = ["normal", "redondo", "grande"];
const TYPOGRAPHY_KEYS:    readonly Typography[]    = ["normal", "grande", "compacta"];
const BG_TYPE_KEYS:       readonly BackgroundType[]= ["solido", "degradado", "patron", "imagen"];
const GRADIENT_MODE_KEYS:      readonly GradientMode[]      = ["predefinido", "manual"];
const GRADIENT_DIRECTION_KEYS: readonly GradientDirection[] = ["135deg", "90deg", "180deg", "45deg"];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function sanitizePreferences(value: unknown): DashboardPreferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }
  const c = value as Partial<Record<keyof DashboardPreferences, unknown>>;
  return {
    accent:            isOneOf(c.accent, ACCENT_KEYS)              ? c.accent            : DEFAULT_PREFERENCES.accent,
    customAccentColor: isValidHex(c.customAccentColor)              ? c.customAccentColor  : DEFAULT_PREFERENCES.customAccentColor,
    backgroundType:    isOneOf(c.backgroundType, BG_TYPE_KEYS)     ? c.backgroundType     : DEFAULT_PREFERENCES.backgroundType,
    backgroundValue:   typeof c.backgroundValue === "string" && c.backgroundValue.length <= 64
                         ? c.backgroundValue : DEFAULT_PREFERENCES.backgroundValue,
    gradientMode:      isOneOf(c.gradientMode, GRADIENT_MODE_KEYS)           ? c.gradientMode       : DEFAULT_PREFERENCES.gradientMode,
    gradientDirection: isOneOf(c.gradientDirection, GRADIENT_DIRECTION_KEYS) ? c.gradientDirection  : DEFAULT_PREFERENCES.gradientDirection,
    gradientFrom:      isValidHex(c.gradientFrom)                            ? c.gradientFrom       : DEFAULT_PREFERENCES.gradientFrom,
    gradientTo:        isValidHex(c.gradientTo)                    ? c.gradientTo         : DEFAULT_PREFERENCES.gradientTo,
    backgroundImage:   (
                         typeof c.backgroundImage === "string" &&
                         c.backgroundImage.startsWith("data:image/") &&
                         c.backgroundImage.length <= MAX_BACKGROUND_IMAGE_BYTES * 1.4
                       ) ? c.backgroundImage : null,
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
    backgroundType:  DEFAULT_PREFERENCES.backgroundType,
    backgroundValue: DEFAULT_PREFERENCES.backgroundValue,
    gradientMode:      DEFAULT_PREFERENCES.gradientMode,
    gradientDirection: DEFAULT_PREFERENCES.gradientDirection,
    gradientFrom:      DEFAULT_PREFERENCES.gradientFrom,
    gradientTo:      DEFAULT_PREFERENCES.gradientTo,
    backgroundImage: DEFAULT_PREFERENCES.backgroundImage,
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
