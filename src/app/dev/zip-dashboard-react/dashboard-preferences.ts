// Arquitectura de preferencias del dashboard React (ZIP) — Fase A + Fase B.
//
// Centraliza el tipo de preferencias, sus valores por defecto, las paletas y
// fondos disponibles, y el almacenamiento versionado en localStorage. El
// objetivo es que ZipDashboardReactClient.tsx solo consuma estas
// funciones/tipos, sin lógica de validación o de storage propia — y que, al
// migrar a UserPreference (backend), solo haya que cambiar la implementación
// de loadPreferences/savePreferences/resetPreferences, no el panel.

export type ThemeMode = "light" | "dark";
export type PaletteKey =
  | "morado-nelzzon"
  | "azul-clinico"
  | "verde-salud"
  | "rosa-violeta"
  | "naranja-energia"
  | "grafito-premium"
  | "aqua"
  | "indigo";
export type BackgroundType = "solido" | "degradado" | "patron" | "imagen";
export type BackgroundIntensity = "suave" | "media" | "alta";
export type Density = "comodo" | "compact" | "amplio";
export type CardStyle = "suave" | "marcado" | "minimal";
export type IconStyle = "normal" | "redondo" | "grande";
export type Typography = "normal" | "grande" | "compacta";

export interface DashboardPreferences {
  // Fase B — colores, fondos y tema.
  theme: ThemeMode;
  palette: PaletteKey;
  backgroundType: BackgroundType;
  /** Id de la opción dentro del tipo de fondo elegido (ver listas más abajo). */
  backgroundValue: string;
  /** Data URL de la imagen/patrón subido por el usuario (solo si backgroundType === "imagen"). */
  backgroundImage: string | null;
  backgroundIntensity: BackgroundIntensity;
  // Fases previas (A) — ya funcionales, sin cambios de comportamiento.
  density: Density;
  cardStyle: CardStyle;
  iconStyle: IconStyle;
  typography: Typography;
  showDock: boolean;
}

export const PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: "light",
  palette: "morado-nelzzon",
  backgroundType: "solido",
  backgroundValue: "default",
  backgroundImage: null,
  backgroundIntensity: "media",
  density: "comodo",
  cardStyle: "suave",
  iconStyle: "normal",
  typography: "normal",
  showDock: true,
};

// Solo los campos de "Colores y fondos" — usados por
// "Volver al fondo original" para resetear sin tocar el resto del panel.
const BACKGROUND_PREFERENCE_KEYS = [
  "theme",
  "palette",
  "backgroundType",
  "backgroundValue",
  "backgroundImage",
  "backgroundIntensity",
] as const satisfies readonly (keyof DashboardPreferences)[];

/**
 * Devuelve una copia de `current` con solo los campos de tema/paleta/fondo
 * vueltos a sus valores por defecto. El resto de las preferencias
 * (densidad, estilo de tarjeta, iconos, dock, tipografía) no se tocan.
 */
export function resetBackgroundPreferences(current: DashboardPreferences): DashboardPreferences {
  const next = { ...current };
  for (const key of BACKGROUND_PREFERENCE_KEYS) {
    (next as Record<string, unknown>)[key] = DEFAULT_PREFERENCES[key];
  }
  return next;
}

// Una sola clave, versionada en el propio nombre y en el payload — si se
// necesita un cambio incompatible de esquema, se sube PREFERENCES_VERSION y
// se introduce una nueva clave (`...v2`) con su propia migración.
export const PREFERENCES_STORAGE_KEY = "nelzzon.dashboard.preferences.v1";

interface StoredPreferences {
  version: number;
  preferences: DashboardPreferences;
}

// ---------- Paletas premium ----------

export interface PaletteDefinition {
  key: PaletteKey;
  label: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  gradient: string;
}

export const PALETTES: Record<PaletteKey, PaletteDefinition> = {
  "morado-nelzzon": {
    key: "morado-nelzzon",
    label: "Morado Nelzzon",
    accent: "#4f46e5",
    accentSoft: "#eef2ff",
    accent2: "#6366f1",
    gradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
  },
  "azul-clinico": {
    key: "azul-clinico",
    label: "Azul Clínico",
    accent: "#0284c7",
    accentSoft: "#eff8ff",
    accent2: "#38bdf8",
    gradient: "linear-gradient(135deg,#0284c7,#0ea5e9)",
  },
  "verde-salud": {
    key: "verde-salud",
    label: "Verde Salud",
    accent: "#059669",
    accentSoft: "#ecfdf5",
    accent2: "#34d399",
    gradient: "linear-gradient(135deg,#059669,#10b981)",
  },
  "rosa-violeta": {
    key: "rosa-violeta",
    label: "Rosa / Violeta",
    accent: "#db2777",
    accentSoft: "#fdf2f8",
    accent2: "#a855f7",
    gradient: "linear-gradient(135deg,#db2777,#a855f7)",
  },
  "naranja-energia": {
    key: "naranja-energia",
    label: "Naranja Energía",
    accent: "#ea580c",
    accentSoft: "#fff7ed",
    accent2: "#f59e0b",
    gradient: "linear-gradient(135deg,#ea580c,#f59e0b)",
  },
  "grafito-premium": {
    key: "grafito-premium",
    label: "Grafito Premium",
    accent: "#475569",
    accentSoft: "#f1f5f9",
    accent2: "#1e293b",
    gradient: "linear-gradient(135deg,#334155,#0f172a)",
  },
  aqua: {
    key: "aqua",
    label: "Aqua",
    accent: "#0891b2",
    accentSoft: "#ecfeff",
    accent2: "#22d3ee",
    gradient: "linear-gradient(135deg,#0891b2,#22d3ee)",
  },
  indigo: {
    key: "indigo",
    label: "Indigo",
    accent: "#4338ca",
    accentSoft: "#e0e7ff",
    accent2: "#6366f1",
    gradient: "linear-gradient(135deg,#4338ca,#6366f1)",
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

// ---------- Variables base por tema ----------

export interface ThemeVars {
  bg: string;
  surface: string;
  cardBg: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  line2: string;
}

export const THEME_VARS: Record<ThemeMode, ThemeVars> = {
  light: {
    bg: "#f5f6f8",
    surface: "#ffffff",
    cardBg: "#ffffff",
    ink: "#161a23",
    muted: "#6b7280",
    faint: "#9aa1ad",
    line: "#ecedf1",
    line2: "#e3e5ea",
  },
  dark: {
    bg: "#0f172a",
    surface: "#161e2e",
    cardBg: "#1b2436",
    ink: "#e7eaf0",
    muted: "#9aa4b2",
    faint: "#6b7686",
    line: "#243049",
    line2: "#2c3a57",
  },
};

// ---------- Opciones de fondo ----------

export interface BackgroundOption {
  key: string;
  label: string;
  /** Valor CSS para `background` (color sólido o gradiente). */
  value: string;
}

export const SOLID_BACKGROUNDS: Record<ThemeMode, BackgroundOption[]> = {
  light: [
    { key: "default", label: "Gris claro", value: "#f5f6f8" },
    { key: "blanco", label: "Blanco", value: "#ffffff" },
    { key: "azulado", label: "Azulado", value: "#eef2f7" },
    { key: "calido", label: "Cálido", value: "#f6f3ee" },
  ],
  dark: [
    { key: "default", label: "Grafito", value: "#0f172a" },
    { key: "carbon", label: "Carbón", value: "#111827" },
    { key: "azulado", label: "Azul noche", value: "#0b1220" },
    { key: "calido", label: "Cálido oscuro", value: "#1c1917" },
  ],
};

export const GRADIENT_BACKGROUNDS: Record<ThemeMode, BackgroundOption[]> = {
  light: [
    { key: "aurora", label: "Aurora", value: "linear-gradient(135deg,#eef2ff 0%,#f5f3ff 50%,#eff8ff 100%)" },
    { key: "calido", label: "Cálido", value: "linear-gradient(135deg,#fff7ed 0%,#fff1f3 100%)" },
    { key: "menta", label: "Menta", value: "linear-gradient(135deg,#ecfdf5 0%,#eff8ff 100%)" },
    { key: "perla", label: "Perla", value: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)" },
  ],
  dark: [
    { key: "aurora", label: "Aurora nocturna", value: "linear-gradient(135deg,#1e293b 0%,#312e81 100%)" },
    { key: "grafito", label: "Grafito", value: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" },
    { key: "azulnoche", label: "Azul noche", value: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)" },
    { key: "carbon", label: "Carbón cálido", value: "linear-gradient(135deg,#1c1917 0%,#292524 100%)" },
  ],
};

export type PatternKey = "puntos" | "grid" | "diagonal" | "papel";

export const PATTERN_OPTIONS: { key: PatternKey; label: string }[] = [
  { key: "puntos", label: "Puntos" },
  { key: "grid", label: "Cuadrícula" },
  { key: "diagonal", label: "Diagonal" },
  { key: "papel", label: "Papel" },
];

/** SVG inline (data URI) de ruido muy suave — sin assets externos. */
function paperNoiseDataUri(): string {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)' opacity='0.35'/>" +
    "</svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Devuelve `backgroundImage`/`backgroundSize` para un patrón dado, generado
 * solo con CSS/SVG inline (gradientes y un SVG de ruido como data URI).
 */
export function getPatternBackground(pattern: PatternKey, theme: ThemeMode): { image: string; size?: string } {
  const lineColor = theme === "dark" ? "rgba(255,255,255,.07)" : "rgba(16,24,40,.05)";
  const dotColor = theme === "dark" ? "rgba(255,255,255,.10)" : "rgba(16,24,40,.07)";

  switch (pattern) {
    case "puntos":
      return { image: `radial-gradient(${dotColor} 1px, transparent 1.5px)`, size: "18px 18px" };
    case "grid":
      return {
        image: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
        size: "28px 28px",
      };
    case "diagonal":
      return { image: `repeating-linear-gradient(45deg, ${lineColor} 0 1px, transparent 1px 18px)` };
    case "papel":
      return { image: paperNoiseDataUri(), size: "200px 200px" };
    default:
      return { image: "none" };
  }
}

export const BACKGROUND_INTENSITY_OPACITY: Record<BackgroundIntensity, number> = {
  suave: 0.35,
  media: 0.65,
  alta: 1,
};

/** Tamaño máximo de imagen/patrón decorativo personalizado (200 KB). */
export const MAX_BACKGROUND_IMAGE_BYTES = 200 * 1024;

// ---------- Validación / storage ----------

const THEME_KEYS: ThemeMode[] = ["light", "dark"];
const BACKGROUND_TYPE_KEYS: BackgroundType[] = ["solido", "degradado", "patron", "imagen"];
const BACKGROUND_INTENSITY_KEYS: BackgroundIntensity[] = ["suave", "media", "alta"];
const DENSITY_KEYS: Density[] = ["comodo", "compact", "amplio"];
const CARD_STYLE_KEYS: CardStyle[] = ["suave", "marcado", "minimal"];
const ICON_STYLE_KEYS: IconStyle[] = ["normal", "redondo", "grande"];
const TYPOGRAPHY_KEYS: Typography[] = ["normal", "grande", "compacta"];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/**
 * Valida un valor desconocido (típicamente JSON.parse de localStorage) y
 * devuelve un objeto de preferencias seguro. Cualquier campo ausente,
 * inválido o de tipo incorrecto se reemplaza por su valor por defecto — el
 * resultado siempre es un DashboardPreferences completo y válido. Esto
 * también permite que datos guardados por una versión anterior (sin los
 * campos de Fase B) se completen automáticamente con los defaults.
 */
export function sanitizePreferences(value: unknown): DashboardPreferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const candidate = value as Partial<Record<keyof DashboardPreferences, unknown>>;

  const backgroundImage =
    typeof candidate.backgroundImage === "string" && candidate.backgroundImage.startsWith("data:")
      ? candidate.backgroundImage
      : DEFAULT_PREFERENCES.backgroundImage;

  return {
    theme: isOneOf(candidate.theme, THEME_KEYS) ? candidate.theme : DEFAULT_PREFERENCES.theme,
    palette: isOneOf(candidate.palette, PALETTE_KEYS) ? candidate.palette : DEFAULT_PREFERENCES.palette,
    backgroundType: isOneOf(candidate.backgroundType, BACKGROUND_TYPE_KEYS)
      ? candidate.backgroundType
      : DEFAULT_PREFERENCES.backgroundType,
    backgroundValue:
      typeof candidate.backgroundValue === "string" && candidate.backgroundValue.length > 0
        ? candidate.backgroundValue
        : DEFAULT_PREFERENCES.backgroundValue,
    backgroundImage,
    backgroundIntensity: isOneOf(candidate.backgroundIntensity, BACKGROUND_INTENSITY_KEYS)
      ? candidate.backgroundIntensity
      : DEFAULT_PREFERENCES.backgroundIntensity,
    density: isOneOf(candidate.density, DENSITY_KEYS) ? candidate.density : DEFAULT_PREFERENCES.density,
    cardStyle: isOneOf(candidate.cardStyle, CARD_STYLE_KEYS) ? candidate.cardStyle : DEFAULT_PREFERENCES.cardStyle,
    iconStyle: isOneOf(candidate.iconStyle, ICON_STYLE_KEYS) ? candidate.iconStyle : DEFAULT_PREFERENCES.iconStyle,
    typography: isOneOf(candidate.typography, TYPOGRAPHY_KEYS) ? candidate.typography : DEFAULT_PREFERENCES.typography,
    showDock: typeof candidate.showDock === "boolean" ? candidate.showDock : DEFAULT_PREFERENCES.showDock,
  };
}

/**
 * Lee las preferencias guardadas. En el servidor (SSR) o si no hay nada
 * guardado, o si lo guardado es de otra versión / está corrupto, devuelve
 * DEFAULT_PREFERENCES — nunca lanza y nunca devuelve un objeto parcial.
 */
export function loadPreferences(): DashboardPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };

    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    if (parsed.version !== PREFERENCES_VERSION) {
      return { ...DEFAULT_PREFERENCES };
    }

    return sanitizePreferences(parsed.preferences);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Persiste las preferencias junto con la versión actual del esquema. */
export function savePreferences(preferences: DashboardPreferences): void {
  if (typeof window === "undefined") return;

  const payload: StoredPreferences = {
    version: PREFERENCES_VERSION,
    preferences,
  };

  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena, etc.) — la
    // personalización simplemente no persiste entre recargas.
  }
}

/** Elimina las preferencias guardadas y devuelve los valores por defecto. */
export function resetPreferences(): DashboardPreferences {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch {
      // Ignorar — si no se puede limpiar, igual devolvemos los defaults.
    }
  }
  return { ...DEFAULT_PREFERENCES };
}
