// NELZZON — FASE DS-7: catálogo declarativo de tarjetas/widgets y acomodo
// del Dashboard.
//
// Define las opciones de apariencia de tarjetas (tamaño, forma, redondez,
// sombra, borde, superficie) y las reglas de acomodo del Dashboard (mover,
// cambiar tamaño, ocultar/mostrar, ordenar, restaurar) que Personalizar
// podrá ofrecer en fases futuras (docs/nelzzon-design-system-v1.md,
// secciones 5.4 y 5.8). Son opciones por sensación, NO por categoría de
// negocio.
//
// Esta capa es puramente declarativa: tipos, constantes y metadata sin
// estado, sin componente cliente y sin conexión a componentes ni a
// globals.css todavía. Los "tokens sugeridos" son referencias al
// vocabulario --ds-* de DS-1 — nada de esto se aplica aún.
//
// La sección "Reglas del Dashboard base" documenta — sin tocarla — la
// estructura aprobada (1ª fila: 4 KPIs principales; 2ª zona: 4 tarjetas
// secundarias en 2x2 horizontales; accesos rápidos en su propia zona,
// separada de las anteriores), para que fases futuras de acomodo nunca la
// rompan.

/** ---- Tamaño de tarjeta ---- */

export type CardSizeId = "compacto" | "normal" | "grande";

export const CARD_SIZE_CATALOG: { key: CardSizeId; label: string; description: string; suggestedToken: string }[] = [
  { key: "compacto", label: "Compacto", description: "Tarjeta más pequeña, para mostrar más en menos espacio.", suggestedToken: "--ds-space-compact" },
  { key: "normal", label: "Normal", description: "Tamaño equilibrado, el de siempre.", suggestedToken: "--ds-space-cozy" },
  { key: "grande", label: "Grande", description: "Tarjeta más grande, con más aire.", suggestedToken: "--ds-space-spacious" },
];

/** ---- Forma de tarjeta ---- */

export type CardShapeId = "cuadrado" | "redondo";

export const CARD_SHAPE_CATALOG: { key: CardShapeId; label: string; description: string; suggestedToken: string }[] = [
  { key: "cuadrado", label: "Cuadrado", description: "Esquinas casi rectas.", suggestedToken: "--ds-radius-sm" },
  { key: "redondo", label: "Redondo", description: "Esquinas muy redondeadas.", suggestedToken: "--ds-radius-2xl" },
];

/** ---- Redondez (escala fina, independiente de "forma") ---- */

export type CardRadiusLevel = "recto" | "suave" | "redondeado" | "muy-redondeado";

export const CARD_RADIUS_CATALOG: { key: CardRadiusLevel; label: string; suggestedToken: string }[] = [
  { key: "recto", label: "Recto", suggestedToken: "--ds-radius-sm" },
  { key: "suave", label: "Suave", suggestedToken: "--ds-radius-md" },
  { key: "redondeado", label: "Redondeado", suggestedToken: "--ds-radius-xl" },
  { key: "muy-redondeado", label: "Muy redondeado", suggestedToken: "--ds-radius-3xl" },
];

/** ---- Sombra ---- */

export type CardShadowLevel = "ninguna" | "suave" | "media" | "elevada";

export const CARD_SHADOW_CATALOG: { key: CardShadowLevel; label: string; suggestedToken: string }[] = [
  { key: "ninguna", label: "Ninguna", suggestedToken: "--ds-shadow-none" },
  { key: "suave", label: "Suave", suggestedToken: "--ds-shadow-soft" },
  { key: "media", label: "Media", suggestedToken: "--ds-shadow-soft" },
  { key: "elevada", label: "Elevada", suggestedToken: "--ds-shadow-elevated" },
];

/** ---- Borde ---- */

export type CardBorderStyle = "ninguno" | "suave" | "acento";

export const CARD_BORDER_CATALOG: { key: CardBorderStyle; label: string; suggestedToken: string }[] = [
  { key: "ninguno", label: "Ninguno", suggestedToken: "--ds-border-color" },
  { key: "suave", label: "Suave", suggestedToken: "--ds-border-color" },
  { key: "acento", label: "De acento", suggestedToken: "--ds-color-accent" },
];

/** ---- Superficie: glass / pastel / sólido ---- */

export type CardSurfaceStyle = "glass" | "pastel" | "solido";

export const CARD_SURFACE_CATALOG: { key: CardSurfaceStyle; label: string; description: string; suggestedToken: string }[] = [
  { key: "glass", label: "Glass", description: "Translúcida, con efecto de vidrio.", suggestedToken: "--ds-color-surface-elevated" },
  { key: "pastel", label: "Pastel", description: "Fondo de color suave.", suggestedToken: "--ds-color-accent-soft" },
  { key: "solido", label: "Sólido", description: "Fondo de color sólido.", suggestedToken: "--ds-color-accent" },
];

export function isCardSizeId(value: unknown): value is CardSizeId {
  return CARD_SIZE_CATALOG.some((c) => c.key === value);
}
export function isCardShapeId(value: unknown): value is CardShapeId {
  return CARD_SHAPE_CATALOG.some((c) => c.key === value);
}
export function isCardSurfaceStyle(value: unknown): value is CardSurfaceStyle {
  return CARD_SURFACE_CATALOG.some((c) => c.key === value);
}

/** ============================================================
 * Acomodo del Dashboard
 * ============================================================ */

export type DashboardArrangeActionId =
  | "mover"
  | "cambiar-tamano"
  | "ocultar-mostrar"
  | "ordenar-widgets"
  | "restaurar";

export const DASHBOARD_ARRANGE_ACTIONS: { key: DashboardArrangeActionId; label: string; description: string }[] = [
  { key: "mover", label: "Mover tarjetas", description: "Cambiar el orden de las tarjetas dentro de su zona." },
  { key: "cambiar-tamano", label: "Cambiar tamaños", description: "Elegir el tamaño de cada tarjeta (compacto/normal/grande)." },
  { key: "ocultar-mostrar", label: "Ocultar/mostrar", description: "Ocultar una tarjeta sin eliminarla, o volver a mostrarla." },
  { key: "ordenar-widgets", label: "Ordenar widgets", description: "Definir el orden de aparición de los widgets dentro de una zona." },
  { key: "restaurar", label: "Restaurar acomodo", description: "Volver al acomodo original de fábrica." },
];

export function isDashboardArrangeActionId(value: unknown): value is DashboardArrangeActionId {
  return DASHBOARD_ARRANGE_ACTIONS.some((a) => a.key === value);
}

/**
 * Zonas fijas del Dashboard base aprobado (docs/nelzzon-design-system-v1.md,
 * sección 2). El acomodo opera DENTRO de cada zona — nunca agrega, quita
 * ni fusiona zonas, y respeta su cardCount cuando fixedCardCount es true.
 */
export type DashboardZoneId = "kpis-principales" | "tarjetas-secundarias" | "accesos-rapidos";

export interface DashboardZoneDefinition {
  id: DashboardZoneId;
  label: string;
  /** Número de tarjetas que define la estructura aprobada para esta zona. */
  cardCount: number;
  /** Si es true, el acomodo no puede cambiar cuántas tarjetas tiene la zona. */
  fixedCardCount: boolean;
  columns: number;
  rows: number;
  orientation: "vertical" | "horizontal";
  allowedActions: DashboardArrangeActionId[];
}

export const DASHBOARD_ZONES: DashboardZoneDefinition[] = [
  {
    id: "kpis-principales",
    label: "KPIs principales (1ª fila)",
    cardCount: 4,
    fixedCardCount: true,
    columns: 4,
    rows: 1,
    orientation: "vertical",
    allowedActions: ["mover", "cambiar-tamano", "ocultar-mostrar", "ordenar-widgets", "restaurar"],
  },
  {
    id: "tarjetas-secundarias",
    label: "Tarjetas secundarias (2 columnas x 2 filas)",
    cardCount: 4,
    fixedCardCount: true,
    columns: 2,
    rows: 2,
    orientation: "horizontal",
    allowedActions: ["mover", "cambiar-tamano", "ocultar-mostrar", "ordenar-widgets", "restaurar"],
  },
  {
    id: "accesos-rapidos",
    label: "Accesos rápidos (cápsula \"Mostrar accesos\")",
    cardCount: 0,
    fixedCardCount: false,
    columns: 0,
    rows: 1,
    orientation: "horizontal",
    allowedActions: ["mover", "ordenar-widgets", "ocultar-mostrar", "restaurar"],
  },
];

export function isDashboardZoneId(value: unknown): value is DashboardZoneId {
  return DASHBOARD_ZONES.some((z) => z.id === value);
}

export function getDashboardZone(id: DashboardZoneId): DashboardZoneDefinition {
  const zone = DASHBOARD_ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Zona de Dashboard desconocida: ${id}`);
  return zone;
}

/**
 * Reglas del Dashboard base aprobado, en forma de constantes de referencia
 * (docs/nelzzon-design-system-v1.md, sección 2). No se aplican ni se
 * verifican contra la UI todavía — son la fuente de verdad para que
 * fases futuras de acomodo no rompan la estructura.
 */
export const DASHBOARD_BASE_STRUCTURE = {
  kpiRowCardCount: 4,
  secondaryGridColumns: 2,
  secondaryGridRows: 2,
  secondaryCardCount: 4,
  quickAccessIsSeparateZone: true,
} as const;
