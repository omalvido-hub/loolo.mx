// NELZZON — FASE DS-5: catálogo declarativo de colores y fondos.
//
// Define las paletas de color, fondos (color, degradado, patrón,
// prediseñado), la configuración futura de imagen personal y los niveles
// de opacidad/blur que Personalizar podrá ofrecer en fases futuras
// (docs/nelzzon-design-system-v1.md, sección 5.2). Son opciones por
// sensación, NO por categoría de negocio.
//
// Esta capa es puramente declarativa: tipos, constantes y metadata sin
// estado, sin componente cliente y sin conexión a componentes ni a
// atributos visuales todavía. Los "tokens sugeridos" son referencias al
// vocabulario --ds-* de DS-1 — nada de esto se aplica aún.

/** ---- Paletas listas ---- */

export type ColorPaletteId =
  | "cielo"
  | "bosque"
  | "atardecer"
  | "lavanda"
  | "coral"
  | "grafito"
  | "turquesa"
  | "arena"
  | "vino"
  | "menta";

export interface PaletteSwatches {
  principal: string;
  secundario: string;
  acento: string;
  boton: string;
}

/**
 * Tokens --ds-* (DS-1) que esta paleta sugiere ajustar. Son solo
 * referencias declarativas — ninguna paleta actual los aplica.
 */
export interface SuggestedPaletteTokens {
  primary: string;
  secondary: string;
  accent: string;
  button: string;
}

export interface ColorPaletteDefinition {
  id: ColorPaletteId;
  label: string;
  description: string;
  swatches: PaletteSwatches;
  suggestedTokens: SuggestedPaletteTokens;
}

export const COLOR_PALETTE_CATALOG: Record<ColorPaletteId, ColorPaletteDefinition> = {
  cielo: {
    id: "cielo",
    label: "Cielo",
    description: "Azul claro y fresco, ideal para un look limpio.",
    swatches: { principal: "#3b82f6", secundario: "#dbeafe", acento: "#2563eb", boton: "#3b82f6" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  bosque: {
    id: "bosque",
    label: "Bosque",
    description: "Verde tranquilo, transmite calma y confianza.",
    swatches: { principal: "#22c55e", secundario: "#dcfce7", acento: "#16a34a", boton: "#22c55e" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  atardecer: {
    id: "atardecer",
    label: "Atardecer",
    description: "Naranja cálido, energético y amigable.",
    swatches: { principal: "#f97316", secundario: "#ffedd5", acento: "#ea580c", boton: "#f97316" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  lavanda: {
    id: "lavanda",
    label: "Lavanda",
    description: "Violeta suave, elegante y moderno.",
    swatches: { principal: "#8b5cf6", secundario: "#ede9fe", acento: "#7c3aed", boton: "#8b5cf6" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  coral: {
    id: "coral",
    label: "Coral",
    description: "Rosa cálido, cercano y amigable.",
    swatches: { principal: "#f43f5e", secundario: "#ffe4e6", acento: "#e11d48", boton: "#f43f5e" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  grafito: {
    id: "grafito",
    label: "Grafito",
    description: "Gris neutro, serio y profesional.",
    swatches: { principal: "#475569", secundario: "#f1f5f9", acento: "#334155", boton: "#475569" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  turquesa: {
    id: "turquesa",
    label: "Turquesa",
    description: "Verde azulado, fresco y actual.",
    swatches: { principal: "#14b8a6", secundario: "#ccfbf1", acento: "#0d9488", boton: "#14b8a6" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  arena: {
    id: "arena",
    label: "Arena",
    description: "Tonos cálidos neutros, suave y natural.",
    swatches: { principal: "#a8a29e", secundario: "#f5f5f4", acento: "#78716c", boton: "#a8a29e" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  vino: {
    id: "vino",
    label: "Vino",
    description: "Rojo profundo, presencia y carácter.",
    swatches: { principal: "#be123c", secundario: "#fee2e2", acento: "#9f1239", boton: "#be123c" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
  menta: {
    id: "menta",
    label: "Menta",
    description: "Verde claro, ligero y limpio.",
    swatches: { principal: "#34d399", secundario: "#d1fae5", acento: "#10b981", boton: "#34d399" },
    suggestedTokens: {
      primary: "--ds-color-primary",
      secondary: "--ds-color-secondary",
      accent: "--ds-color-accent",
      button: "--ds-color-accent",
    },
  },
};

export const COLOR_PALETTE_CATALOG_KEYS = Object.keys(COLOR_PALETTE_CATALOG) as ColorPaletteId[];

export function isColorPaletteId(value: unknown): value is ColorPaletteId {
  return typeof value === "string" && value in COLOR_PALETTE_CATALOG;
}

/** ---- Selector avanzado (rueda de color) ---- */

/** Roles de color que el selector avanzado podrá ajustar por separado. */
export type ColorRole = "principal" | "secundario" | "acento" | "boton" | "estado";

export const COLOR_ROLES: { key: ColorRole; label: string }[] = [
  { key: "principal", label: "Color principal" },
  { key: "secundario", label: "Color secundario" },
  { key: "acento", label: "Acentos" },
  { key: "boton", label: "Botones" },
  { key: "estado", label: "Estados" },
];

/** Ajustes finos del selector avanzado, sobre el color elegido. */
export interface AdvancedColorAdjustments {
  brightness: number;
  intensity: number;
  opacity: number;
}

export const DEFAULT_ADVANCED_COLOR_ADJUSTMENTS: AdvancedColorAdjustments = {
  brightness: 0,
  intensity: 0,
  opacity: 1,
};

/** ---- Fondos: tipo de fondo ---- */

export type BackgroundKind = "color" | "gradient" | "pattern" | "preset" | "image";

export const BACKGROUND_KINDS: { key: BackgroundKind; label: string; description: string }[] = [
  { key: "color", label: "Color liso", description: "Un solo color de fondo." },
  { key: "gradient", label: "Degradado", description: "Transición suave entre dos o más colores." },
  { key: "pattern", label: "Patrón suave", description: "Textura sutil que no distrae." },
  { key: "preset", label: "Fondo prediseñado", description: "Fondo terminado de la galería." },
  { key: "image", label: "Imagen personal", description: "Imagen propia subida por el usuario." },
];

/** ---- Fondos de color liso ---- */

export type BackgroundColorId = "blanco" | "niebla" | "arena-claro" | "grafito-claro";

export const BACKGROUND_COLOR_CATALOG: { key: BackgroundColorId; label: string; value: string }[] = [
  { key: "blanco", label: "Blanco", value: "#ffffff" },
  { key: "niebla", label: "Niebla", value: "#f8fafc" },
  { key: "arena-claro", label: "Arena claro", value: "#fafaf9" },
  { key: "grafito-claro", label: "Grafito claro", value: "#f4f4f5" },
];

/** ---- Degradados ---- */

export type BackgroundGradientId = "amanecer" | "oceano" | "aurora" | "bosque-suave";

export interface BackgroundGradientDefinition {
  key: BackgroundGradientId;
  label: string;
  description: string;
  stops: string[];
}

export const BACKGROUND_GRADIENT_CATALOG: BackgroundGradientDefinition[] = [
  { key: "amanecer", label: "Amanecer", description: "Cálido, de amarillo a rosa.", stops: ["#fef3c7", "#fecaca", "#fbcfe8"] },
  { key: "oceano", label: "Océano", description: "Azules frescos.", stops: ["#e0f2fe", "#bae6fd", "#c7d2fe"] },
  { key: "aurora", label: "Aurora", description: "Pastel multicolor suave.", stops: ["#ede9fe", "#fce7f3", "#e0f2fe"] },
  { key: "bosque-suave", label: "Bosque suave", description: "Verdes tranquilos.", stops: ["#dcfce7", "#bbf7d0", "#d1fae5"] },
];

/** ---- Patrones suaves ---- */

export type BackgroundPatternId = "puntos" | "rejilla" | "diagonal";

export const BACKGROUND_PATTERN_CATALOG: { key: BackgroundPatternId; label: string; description: string }[] = [
  { key: "puntos", label: "Puntos", description: "Pequeños puntos repetidos, muy sutiles." },
  { key: "rejilla", label: "Rejilla", description: "Líneas finas tipo cuadrícula." },
  { key: "diagonal", label: "Diagonal", description: "Franjas diagonales muy suaves." },
];

/** ---- Fondos prediseñados (galería) ---- */

export type BackgroundPresetId =
  | "claro-suave"
  | "claro-calido"
  | "frio-profesional"
  | "vibrante-suave"
  | "oscuro-suave";

export const BACKGROUND_PRESET_CATALOG: { key: BackgroundPresetId; label: string; description: string }[] = [
  { key: "claro-suave", label: "Claro suave", description: "Fondo casi blanco, muy limpio." },
  { key: "claro-calido", label: "Claro cálido", description: "Tonos cálidos muy claros." },
  { key: "frio-profesional", label: "Frío profesional", description: "Tonos fríos, formales." },
  { key: "vibrante-suave", label: "Vibrante suave", description: "Color con energía pero suave." },
  { key: "oscuro-suave", label: "Oscuro suave", description: "Fondo oscuro de bajo contraste." },
];

/** ---- Opacidad y blur ---- */

export type BackgroundOpacityLevel = "baja" | "media" | "alta";
export type BackgroundBlurLevel = "ninguno" | "suave" | "medio" | "alto";

export const BACKGROUND_OPACITY_LEVELS: { key: BackgroundOpacityLevel; label: string; suggestedToken: string }[] = [
  { key: "baja", label: "Baja", suggestedToken: "--ds-bg-overlay-opacity" },
  { key: "media", label: "Media", suggestedToken: "--ds-bg-overlay-opacity" },
  { key: "alta", label: "Alta", suggestedToken: "--ds-bg-overlay-opacity" },
];

export const BACKGROUND_BLUR_LEVELS: { key: BackgroundBlurLevel; label: string; suggestedToken: string }[] = [
  { key: "ninguno", label: "Ninguno", suggestedToken: "--ds-bg-blur" },
  { key: "suave", label: "Suave", suggestedToken: "--ds-bg-blur" },
  { key: "medio", label: "Medio", suggestedToken: "--ds-bg-blur" },
  { key: "alto", label: "Alto", suggestedToken: "--ds-bg-blur" },
];

/** ---- Imagen personal (configuración futura) ---- */

/**
 * Configuración de referencia para la futura opción "imagen personal" de
 * Personalizar. No se conecta a ningún input/almacenamiento todavía — solo
 * documenta los límites y opciones que la fase futura deberá respetar.
 */
export interface PersonalImageConfig {
  maxBytes: number;
  allowedFormats: string[];
  opacity: BackgroundOpacityLevel;
  blur: BackgroundBlurLevel;
}

export const DEFAULT_PERSONAL_IMAGE_CONFIG: PersonalImageConfig = {
  maxBytes: 700 * 1024,
  allowedFormats: ["image/png", "image/jpeg", "image/webp"],
  opacity: "media",
  blur: "ninguno",
};
