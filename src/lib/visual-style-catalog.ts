// NELZZON — FASE DS-3: catálogo declarativo de estilos visuales globales.
//
// Define las 15 "personalidades visuales" universales que Personalizar
// podrá ofrecer en fases futuras (docs/nelzzon-design-system-v1.md,
// sección 5.1). Son estilos por sensación, NO por categoría de negocio.
//
// Esta capa es puramente declarativa: tipos, constantes y metadata sin
// estado, sin componente cliente y sin conexión a componentes ni a
// atributos visuales todavía. Los "tokens sugeridos" son referencias al
// vocabulario --ds-* de DS-1 — ningún estilo se aplica aún.

export type VisualStyleId =
  | "limpio"
  | "moderno"
  | "elegante"
  | "colorido"
  | "minimalista"
  | "suave-pastel"
  | "fuerte"
  | "oscuro"
  | "premium"
  | "glass"
  | "3d-suave"
  | "cute"
  | "peluche-fuzzy"
  | "clay-plastilina"
  | "profesional";

/** Qué tan presente es el color de acento en el estilo. */
export type ColorLevel = "neutro" | "suave" | "medio" | "vivo";

/** Qué tanta sombra/profundidad usan las superficies del estilo. */
export type ShadowLevel = "ninguna" | "suave" | "media" | "elevada";

/** Qué tan redondeadas son las esquinas en el estilo. */
export type RadiusLevel = "recto" | "suave" | "redondeado" | "muy-redondeado";

/** Densidad/espaciado por defecto del estilo. */
export type DensityLevel = "compacta" | "cozy" | "amplia";

/**
 * Tokens --ds-* (DS-1) que este estilo sugiere ajustar. Son solo
 * referencias declarativas — ninguna fase actual los aplica.
 */
export interface SuggestedStyleTokens {
  radius: string;
  shadow: string;
  density: string;
  accent: string;
}

export interface VisualStyleDefinition {
  id: VisualStyleId;
  label: string;
  description: string;
  colorLevel: ColorLevel;
  shadowLevel: ShadowLevel;
  radius: RadiusLevel;
  density: DensityLevel;
  /** Sensación visual en una frase corta, sin tecnicismos. */
  feeling: string;
  suggestedTokens: SuggestedStyleTokens;
}

export const VISUAL_STYLE_CATALOG: Record<VisualStyleId, VisualStyleDefinition> = {
  limpio: {
    id: "limpio",
    label: "Limpio",
    description: "Blanco, espacioso y fácil de leer.",
    colorLevel: "neutro",
    shadowLevel: "suave",
    radius: "suave",
    density: "amplia",
    feeling: "Orden y aire, sin distracciones.",
    suggestedTokens: {
      radius: "--ds-radius-lg",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-spacious",
      accent: "--ds-color-accent-soft",
    },
  },
  moderno: {
    id: "moderno",
    label: "Moderno",
    description: "Translúcido, suave, como una app actual.",
    colorLevel: "suave",
    shadowLevel: "media",
    radius: "redondeado",
    density: "cozy",
    feeling: "Fresco y actual, como una app nueva.",
    suggestedTokens: {
      radius: "--ds-radius-xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent",
    },
  },
  elegante: {
    id: "elegante",
    label: "Elegante",
    description: "Sobrio, líneas finas, mucho aire.",
    colorLevel: "neutro",
    shadowLevel: "suave",
    radius: "suave",
    density: "amplia",
    feeling: "Refinado, sin elementos de más.",
    suggestedTokens: {
      radius: "--ds-radius-md",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-spacious",
      accent: "--ds-color-accent-soft",
    },
  },
  colorido: {
    id: "colorido",
    label: "Colorido",
    description: "Vivo, expresivo, acentos fuertes.",
    colorLevel: "vivo",
    shadowLevel: "media",
    radius: "redondeado",
    density: "cozy",
    feeling: "Alegre y lleno de energía.",
    suggestedTokens: {
      radius: "--ds-radius-xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent",
    },
  },
  minimalista: {
    id: "minimalista",
    label: "Minimalista",
    description: "El mínimo posible: casi sin adornos.",
    colorLevel: "neutro",
    shadowLevel: "ninguna",
    radius: "recto",
    density: "amplia",
    feeling: "Solo lo esencial, nada más.",
    suggestedTokens: {
      radius: "--ds-radius-sm",
      shadow: "--ds-shadow-none",
      density: "--ds-space-spacious",
      accent: "--ds-color-muted",
    },
  },
  "suave-pastel": {
    id: "suave-pastel",
    label: "Suave / pastel",
    description: "Colores tenues, formas redondeadas.",
    colorLevel: "suave",
    shadowLevel: "suave",
    radius: "muy-redondeado",
    density: "cozy",
    feeling: "Tranquilo y amable a la vista.",
    suggestedTokens: {
      radius: "--ds-radius-2xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent-soft",
    },
  },
  fuerte: {
    id: "fuerte",
    label: "Fuerte",
    description: "Sólido, directo, alto contraste, operativo.",
    colorLevel: "vivo",
    shadowLevel: "ninguna",
    radius: "recto",
    density: "compacta",
    feeling: "Directo, sin vueltas, para trabajar rápido.",
    suggestedTokens: {
      radius: "--ds-radius-sm",
      shadow: "--ds-shadow-none",
      density: "--ds-space-compact",
      accent: "--ds-color-accent",
    },
  },
  oscuro: {
    id: "oscuro",
    label: "Oscuro",
    description: "Fondo oscuro tipo vidrio, acentos brillantes.",
    colorLevel: "medio",
    shadowLevel: "elevada",
    radius: "redondeado",
    density: "cozy",
    feeling: "Concentrado, ideal para ambientes con poca luz.",
    suggestedTokens: {
      radius: "--ds-radius-xl",
      shadow: "--ds-shadow-elevated",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent",
    },
  },
  premium: {
    id: "premium",
    label: "Premium",
    description: "Profundidad, sombra elevada, detalle fino.",
    colorLevel: "medio",
    shadowLevel: "elevada",
    radius: "redondeado",
    density: "amplia",
    feeling: "Cuidado, de alta gama.",
    suggestedTokens: {
      radius: "--ds-radius-xl",
      shadow: "--ds-shadow-elevated",
      density: "--ds-space-spacious",
      accent: "--ds-color-accent-soft",
    },
  },
  glass: {
    id: "glass",
    label: "Glass",
    description: "Vidrio translúcido, blur y bordes de luz.",
    colorLevel: "suave",
    shadowLevel: "media",
    radius: "redondeado",
    density: "cozy",
    feeling: "Ligero, translúcido, con profundidad.",
    suggestedTokens: {
      radius: "--ds-radius-2xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent-soft",
    },
  },
  "3d-suave": {
    id: "3d-suave",
    label: "3D suave",
    description: "Volumen sutil, sombras suaves tipo \"soft UI\".",
    colorLevel: "suave",
    shadowLevel: "media",
    radius: "muy-redondeado",
    density: "cozy",
    feeling: "Con volumen, suave al tacto visual.",
    suggestedTokens: {
      radius: "--ds-radius-2xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent-soft",
    },
  },
  cute: {
    id: "cute",
    label: "Cute",
    description: "Redondo, amigable, colores alegres.",
    colorLevel: "vivo",
    shadowLevel: "suave",
    radius: "muy-redondeado",
    density: "cozy",
    feeling: "Amigable y divertido.",
    suggestedTokens: {
      radius: "--ds-radius-3xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent",
    },
  },
  "peluche-fuzzy": {
    id: "peluche-fuzzy",
    label: "Peluche / fuzzy",
    description: "Texturas suaves, muy redondeado, \"abrazable\".",
    colorLevel: "suave",
    shadowLevel: "suave",
    radius: "muy-redondeado",
    density: "amplia",
    feeling: "Cálido y reconfortante.",
    suggestedTokens: {
      radius: "--ds-radius-4xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-spacious",
      accent: "--ds-color-accent-soft",
    },
  },
  "clay-plastilina": {
    id: "clay-plastilina",
    label: "Clay / plastilina",
    description: "Volumen tipo arcilla, sombras internas suaves.",
    colorLevel: "medio",
    shadowLevel: "media",
    radius: "muy-redondeado",
    density: "cozy",
    feeling: "Moldeable, con volumen y juego.",
    suggestedTokens: {
      radius: "--ds-radius-3xl",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-accent",
    },
  },
  profesional: {
    id: "profesional",
    label: "Profesional",
    description: "Serio, neutro, orientado a negocios.",
    colorLevel: "neutro",
    shadowLevel: "suave",
    radius: "suave",
    density: "cozy",
    feeling: "Confiable y formal.",
    suggestedTokens: {
      radius: "--ds-radius-md",
      shadow: "--ds-shadow-soft",
      density: "--ds-space-cozy",
      accent: "--ds-color-muted",
    },
  },
};

export const VISUAL_STYLE_CATALOG_KEYS = Object.keys(VISUAL_STYLE_CATALOG) as VisualStyleId[];

export function isVisualStyleId(value: unknown): value is VisualStyleId {
  return typeof value === "string" && value in VISUAL_STYLE_CATALOG;
}
