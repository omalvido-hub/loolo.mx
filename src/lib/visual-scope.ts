// NELZZON — FASE DS-2: fundación de "alcance visual" (visual scope).
//
// Define el vocabulario que las fases futuras de Personalizar usarán para
// decidir si un cambio de estilo aplica "solo al Dashboard" o "a todo el
// sistema" (ver docs/nelzzon-design-system-v1.md, sección 6).
//
// Esta capa es puramente declarativa: tipos, constantes y helpers sin
// estado, sin persistencia y sin conexión a componentes visuales todavía.
// Ningún data-visual-* ni componente la consume aún — eso queda para DS-3+.

/** Alcance de un cambio visual: solo el Dashboard, o todo el sistema. */
export type VisualScope = "dashboard" | "system";

export const VISUAL_SCOPES: { key: VisualScope; label: string; description: string }[] = [
  {
    key: "dashboard",
    label: "Solo Dashboard",
    description: "El cambio aplica únicamente a la pantalla de inicio.",
  },
  {
    key: "system",
    label: "Todo el sistema",
    description: "El cambio aplica a todas las pantallas de Nelzzon.",
  },
];

/**
 * Alcance por defecto: "system" — coherente con la idea de que el estilo
 * elegido por el usuario es, por defecto, el estilo de todo Nelzzon.
 */
export const DEFAULT_VISUAL_SCOPE: VisualScope = "system";

export function isVisualScope(value: unknown): value is VisualScope {
  return value === "dashboard" || value === "system";
}

/**
 * Identificadores de las pantallas/áreas que cubre el alcance "system"
 * (docs/nelzzon-design-system-v1.md, sección 6). Lista de referencia para
 * fases futuras — no se usa todavía para renderizar ni aplicar estilos.
 */
export type SystemSurfaceId =
  | "dashboard"
  | "pacientes"
  | "ficha-paciente"
  | "agenda"
  | "consultas"
  | "cobros"
  | "presupuestos"
  | "documentos"
  | "portal-paciente"
  | "fiscal"
  | "configuracion"
  | "personalizar";

export const SYSTEM_SURFACES: { key: SystemSurfaceId; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pacientes", label: "Pacientes" },
  { key: "ficha-paciente", label: "Perfil del paciente" },
  { key: "agenda", label: "Agenda" },
  { key: "consultas", label: "Consultas" },
  { key: "cobros", label: "Cobros" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "documentos", label: "Documentos" },
  { key: "portal-paciente", label: "Portal del paciente" },
  { key: "fiscal", label: "Fiscal / administrativo" },
  { key: "configuracion", label: "Configuración" },
  { key: "personalizar", label: "Personalizar" },
];
