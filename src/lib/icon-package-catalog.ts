// NELZZON — FASE DS-4: catálogo declarativo de paquetes de iconos.
//
// Define los 12 paquetes de iconos universales que Personalizar podrá
// ofrecer en fases futuras (docs/nelzzon-design-system-v1.md, sección 5.5),
// más la lista base de módulos del sistema que en fases futuras podrán
// recibir un icono. Son paquetes por sensación, NO por categoría de negocio.
//
// Esta capa es puramente declarativa: tipos, constantes y metadata sin
// estado, sin componente cliente y sin conexión a componentes ni a
// atributos visuales todavía. Los "tokens sugeridos" son referencias al
// vocabulario --ds-* de DS-1 — ningún paquete se aplica aún.

export type IconPackageId =
  | "lineal-limpio"
  | "solido-minimal"
  | "pastel-app"
  | "3d-suave"
  | "peluche-fuzzy"
  | "clay-plastilina"
  | "glass"
  | "premium-elegante"
  | "cute"
  | "tech"
  | "bold"
  | "ilustrado";

/** Grosor de trazo/relleno del paquete. */
export type IconWeight = "fino" | "medio" | "grueso";

/** Qué tan redondeadas son las formas del paquete. */
export type IconRoundness = "recto" | "suave" | "redondeado" | "muy-redondeado";

/** Sensación de profundidad/volumen del paquete. */
export type IconDepth = "plano" | "sutil" | "volumen";

/** Tamaño sugerido por defecto para este paquete. */
export type IconSizeSuggestion = "pequeño" | "normal" | "grande";

/**
 * Tokens --ds-* (DS-1) que este paquete sugiere ajustar. Son solo
 * referencias declarativas — ningún paquete actual los aplica.
 */
export interface SuggestedIconTokens {
  size: string;
  strokeWidth: string;
  radius: string;
  accent: string;
}

export interface IconPackageDefinition {
  id: IconPackageId;
  label: string;
  description: string;
  style: string;
  weight: IconWeight;
  roundness: IconRoundness;
  depth: IconDepth;
  suggestedSize: IconSizeSuggestion;
  supportsIconOnly: boolean;
  supportsIconWithText: boolean;
  suggestedTokens: SuggestedIconTokens;
}

export const ICON_PACKAGE_CATALOG: Record<IconPackageId, IconPackageDefinition> = {
  "lineal-limpio": {
    id: "lineal-limpio",
    label: "Lineal limpio",
    description: "Trazo fino, minimalista.",
    style: "lineal",
    weight: "fino",
    roundness: "suave",
    depth: "plano",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-md",
      accent: "--ds-color-muted-fg",
    },
  },
  "solido-minimal": {
    id: "solido-minimal",
    label: "Sólido minimal",
    description: "Formas simples y rellenas.",
    style: "solido",
    weight: "medio",
    roundness: "suave",
    depth: "plano",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-md",
      accent: "--ds-color-fg",
    },
  },
  "pastel-app": {
    id: "pastel-app",
    label: "Pastel app",
    description: "Colores suaves, estilo app móvil.",
    style: "solido-suave",
    weight: "medio",
    roundness: "redondeado",
    depth: "sutil",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-xl",
      accent: "--ds-color-accent-soft",
    },
  },
  "3d-suave": {
    id: "3d-suave",
    label: "3D suave",
    description: "Volumen sutil, sombra suave.",
    style: "volumetrico",
    weight: "medio",
    roundness: "muy-redondeado",
    depth: "volumen",
    suggestedSize: "grande",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-lg",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-2xl",
      accent: "--ds-color-accent-soft",
    },
  },
  "peluche-fuzzy": {
    id: "peluche-fuzzy",
    label: "Peluche / fuzzy",
    description: "Muy redondeado, textura suave.",
    style: "volumetrico-suave",
    weight: "grueso",
    roundness: "muy-redondeado",
    depth: "volumen",
    suggestedSize: "grande",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-lg",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-4xl",
      accent: "--ds-color-accent-soft",
    },
  },
  "clay-plastilina": {
    id: "clay-plastilina",
    label: "Clay / plastilina",
    description: "Volumen tipo arcilla.",
    style: "volumetrico",
    weight: "grueso",
    roundness: "muy-redondeado",
    depth: "volumen",
    suggestedSize: "grande",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-lg",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-3xl",
      accent: "--ds-color-accent",
    },
  },
  glass: {
    id: "glass",
    label: "Glass",
    description: "Translúcido, con brillo.",
    style: "translucido",
    weight: "fino",
    roundness: "redondeado",
    depth: "sutil",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-2xl",
      accent: "--ds-color-accent-soft",
    },
  },
  "premium-elegante": {
    id: "premium-elegante",
    label: "Premium elegante",
    description: "Fino, detallado, sobrio.",
    style: "lineal",
    weight: "fino",
    roundness: "suave",
    depth: "sutil",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-lg",
      accent: "--ds-color-accent-soft",
    },
  },
  cute: {
    id: "cute",
    label: "Cute",
    description: "Redondo, expresivo, alegre.",
    style: "solido-suave",
    weight: "medio",
    roundness: "muy-redondeado",
    depth: "sutil",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-3xl",
      accent: "--ds-color-accent",
    },
  },
  tech: {
    id: "tech",
    label: "Tech",
    description: "Anguloso, técnico, moderno.",
    style: "lineal",
    weight: "medio",
    roundness: "recto",
    depth: "plano",
    suggestedSize: "normal",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-md",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-sm",
      accent: "--ds-color-accent",
    },
  },
  bold: {
    id: "bold",
    label: "Bold",
    description: "Grueso, alto contraste.",
    style: "solido",
    weight: "grueso",
    roundness: "suave",
    depth: "plano",
    suggestedSize: "grande",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-lg",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-md",
      accent: "--ds-color-fg",
    },
  },
  ilustrado: {
    id: "ilustrado",
    label: "Ilustrado",
    description: "Estilo dibujo/ilustración.",
    style: "ilustrativo",
    weight: "medio",
    roundness: "redondeado",
    depth: "sutil",
    suggestedSize: "grande",
    supportsIconOnly: true,
    supportsIconWithText: true,
    suggestedTokens: {
      size: "--ds-icon-size-lg",
      strokeWidth: "--ds-icon-stroke-width",
      radius: "--ds-radius-xl",
      accent: "--ds-color-accent",
    },
  },
};

export const ICON_PACKAGE_CATALOG_KEYS = Object.keys(ICON_PACKAGE_CATALOG) as IconPackageId[];

export function isIconPackageId(value: unknown): value is IconPackageId {
  return typeof value === "string" && value in ICON_PACKAGE_CATALOG;
}

/**
 * Módulos base del sistema que en fases futuras podrán recibir un icono de
 * alguno de los paquetes anteriores (docs/nelzzon-design-system-v1.md,
 * sección 8). Lista de referencia — no se usa todavía para renderizar.
 */
export type IconModuleId =
  | "pacientes"
  | "agenda"
  | "consultas"
  | "presupuestos"
  | "cobros"
  | "documentos"
  | "reportes"
  | "portal"
  | "mensajes"
  | "tareas"
  | "configuracion"
  | "archivos"
  | "notificaciones"
  | "metas"
  | "indicadores";

export const ICON_MODULES: { key: IconModuleId; label: string }[] = [
  { key: "pacientes", label: "Pacientes" },
  { key: "agenda", label: "Agenda" },
  { key: "consultas", label: "Consultas" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "cobros", label: "Cobros" },
  { key: "documentos", label: "Documentos" },
  { key: "reportes", label: "Reportes" },
  { key: "portal", label: "Portal" },
  { key: "mensajes", label: "Mensajes" },
  { key: "tareas", label: "Tareas" },
  { key: "configuracion", label: "Configuración" },
  { key: "archivos", label: "Archivos" },
  { key: "notificaciones", label: "Notificaciones" },
  { key: "metas", label: "Metas" },
  { key: "indicadores", label: "Indicadores" },
];

export function isIconModuleId(value: unknown): value is IconModuleId {
  return typeof value === "string" && ICON_MODULES.some((m) => m.key === value);
}
