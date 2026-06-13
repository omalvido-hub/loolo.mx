// NELZZON — FASE DS-6: catálogo declarativo de tipografía.
//
// Define las familias por sensación, tamaños, escala de títulos, pesos,
// espaciado entre letras, altura de línea y densidad textual que
// Personalizar podrá ofrecer en fases futuras
// (docs/nelzzon-design-system-v1.md, sección 5.3). Son opciones por
// sensación, NO por categoría de negocio, y usan únicamente pilas de
// fuentes del sistema (sin cargar ninguna fuente externa).
//
// Esta capa es puramente declarativa: tipos, constantes y metadata sin
// estado, sin componente cliente y sin conexión a componentes ni a
// globals.css todavía. Los "tokens sugeridos" son referencias al
// vocabulario --ds-* de DS-1 — nada de esto se aplica aún.

/** ---- Familias por sensación ---- */

export type TypographyFamilyId = "clasica" | "redondeada" | "tecnica" | "elegante" | "amigable";

export interface TypographyFamilyDefinition {
  id: TypographyFamilyId;
  label: string;
  description: string;
  feeling: string;
  /** Pila de fuentes del sistema, sin cargar ninguna fuente externa. */
  fontFamily: string;
  suggestedToken: string;
}

export const TYPOGRAPHY_FAMILY_CATALOG: Record<TypographyFamilyId, TypographyFamilyDefinition> = {
  clasica: {
    id: "clasica",
    label: "Clásica",
    description: "Letra con serifa, de toda la vida.",
    feeling: "Tradicional y confiable.",
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    suggestedToken: "--ds-font-family",
  },
  redondeada: {
    id: "redondeada",
    label: "Redondeada",
    description: "Formas suaves y amigables.",
    feeling: "Cercana y amable.",
    fontFamily:
      "-apple-system, ui-rounded, 'Segoe UI', system-ui, sans-serif",
    suggestedToken: "--ds-font-family",
  },
  tecnica: {
    id: "tecnica",
    label: "Técnica",
    description: "Letra de ancho fijo, tipo consola.",
    feeling: "Precisa y técnica.",
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    suggestedToken: "--ds-font-family",
  },
  elegante: {
    id: "elegante",
    label: "Elegante",
    description: "Serifa fina, sobria.",
    feeling: "Refinada y sobria.",
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    suggestedToken: "--ds-font-family",
  },
  amigable: {
    id: "amigable",
    label: "Amigable",
    description: "Letra sin serifa, sencilla y clara.",
    feeling: "Simple y cercana — el estilo por defecto.",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    suggestedToken: "--ds-font-family",
  },
};

export const TYPOGRAPHY_FAMILY_CATALOG_KEYS = Object.keys(TYPOGRAPHY_FAMILY_CATALOG) as TypographyFamilyId[];

export function isTypographyFamilyId(value: unknown): value is TypographyFamilyId {
  return typeof value === "string" && value in TYPOGRAPHY_FAMILY_CATALOG;
}

/** ---- Tamaño base de texto ---- */

export type TypographySizeId = "compacto" | "normal" | "amplio";

export const TYPOGRAPHY_SIZE_CATALOG: { key: TypographySizeId; label: string; baseSizeRem: number; suggestedToken: string }[] = [
  { key: "compacto", label: "Compacto", baseSizeRem: 0.875, suggestedToken: "--ds-font-size-base" },
  { key: "normal", label: "Normal", baseSizeRem: 1, suggestedToken: "--ds-font-size-base" },
  { key: "amplio", label: "Amplio", baseSizeRem: 1.125, suggestedToken: "--ds-font-size-base" },
];

/** ---- Escala de títulos (h1/h2/h3 relativos al tamaño base) ---- */

export type TitleScaleId = "compacta" | "estandar" | "amplia";

export interface TitleScaleDefinition {
  key: TitleScaleId;
  label: string;
  h1: number;
  h2: number;
  h3: number;
}

export const TITLE_SCALE_CATALOG: TitleScaleDefinition[] = [
  { key: "compacta", label: "Compacta", h1: 1.5, h2: 1.25, h3: 1.125 },
  { key: "estandar", label: "Estándar", h1: 1.875, h2: 1.5, h3: 1.25 },
  { key: "amplia", label: "Amplia", h1: 2.25, h2: 1.75, h3: 1.375 },
];

/** ---- Peso de la letra ---- */

export type TypographyWeightId = "ligero" | "normal" | "marcado";

export const TYPOGRAPHY_WEIGHT_CATALOG: { key: TypographyWeightId; label: string; value: number; suggestedToken: string }[] = [
  { key: "ligero", label: "Ligero", value: 400, suggestedToken: "--ds-font-weight-normal" },
  { key: "normal", label: "Normal", value: 500, suggestedToken: "--ds-font-weight-medium" },
  { key: "marcado", label: "Marcado", value: 600, suggestedToken: "--ds-font-weight-semibold" },
];

/** ---- Espaciado entre letras (títulos) ---- */

export type LetterSpacingId = "ajustado" | "normal" | "amplio";

export const LETTER_SPACING_CATALOG: { key: LetterSpacingId; label: string; valueEm: number; suggestedToken: string }[] = [
  { key: "ajustado", label: "Ajustado", valueEm: -0.025, suggestedToken: "--ds-letter-spacing-heading" },
  { key: "normal", label: "Normal", valueEm: 0, suggestedToken: "--ds-letter-spacing-heading" },
  { key: "amplio", label: "Amplio", valueEm: 0.025, suggestedToken: "--ds-letter-spacing-heading" },
];

/** ---- Altura de línea ---- */

export type LineHeightId = "compacta" | "normal" | "amplia";

export const LINE_HEIGHT_CATALOG: { key: LineHeightId; label: string; value: number; suggestedToken: string }[] = [
  { key: "compacta", label: "Compacta", value: 1.25, suggestedToken: "--ds-line-height-base" },
  { key: "normal", label: "Normal", value: 1.5, suggestedToken: "--ds-line-height-base" },
  { key: "amplia", label: "Amplia", value: 1.75, suggestedToken: "--ds-line-height-base" },
];

/** ---- Densidad textual (espaciado general del texto) ---- */

export type TextDensityId = "compacta" | "cozy" | "amplia";

export const TEXT_DENSITY_CATALOG: { key: TextDensityId; label: string; description: string; suggestedToken: string }[] = [
  { key: "compacta", label: "Compacta", description: "Más texto visible, menos espacio entre líneas y bloques.", suggestedToken: "--ds-space-compact" },
  { key: "cozy", label: "Cómoda", description: "Equilibrio entre espacio y cantidad de texto visible.", suggestedToken: "--ds-space-cozy" },
  { key: "amplia", label: "Amplia", description: "Más aire entre líneas y bloques de texto.", suggestedToken: "--ds-space-spacious" },
];
