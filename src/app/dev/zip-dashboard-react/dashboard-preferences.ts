// Arquitectura de preferencias del dashboard React (ZIP) — Fase 1A.
//
// Centraliza el tipo de preferencias, sus valores por defecto y el
// almacenamiento versionado en localStorage. El objetivo es que
// ZipDashboardReactClient.tsx solo consuma estas funciones/tipos, sin lógica
// de validación o de storage propia — y que, al migrar a UserPreference
// (backend), solo haya que cambiar la implementación de
// loadPreferences/savePreferences/resetPreferences, no el panel.
//
// Mismos campos y mismos valores por defecto que la versión inline anterior
// (commit b628f09): accent, density, cardStyle, iconStyle, typography,
// showDock. Sin cambios visuales ni nuevos campos.

export type AccentKey = "morado" | "azul" | "verde" | "naranja" | "rosa";
export type Density = "comodo" | "compact" | "amplio";
export type CardStyle = "suave" | "marcado" | "minimal";
export type IconStyle = "normal" | "redondo" | "grande";
export type Typography = "normal" | "grande" | "compacta";

export interface DashboardPreferences {
  accent: AccentKey;
  density: Density;
  cardStyle: CardStyle;
  iconStyle: IconStyle;
  typography: Typography;
  showDock: boolean;
}

export const PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  accent: "morado",
  density: "comodo",
  cardStyle: "suave",
  iconStyle: "normal",
  typography: "normal",
  showDock: true,
};

// Una sola clave, versionada en el propio nombre y en el payload — si se
// necesita un cambio incompatible de esquema, se sube PREFERENCES_VERSION y
// se introduce una nueva clave (`...v2`) con su propia migración.
export const PREFERENCES_STORAGE_KEY = "nelzzon.dashboard.preferences.v1";

// Clave usada por la implementación inline anterior. Solo se lee (nunca se
// escribe) para migrar preferencias existentes a la nueva clave versionada.
const LEGACY_STORAGE_KEY = "nelzzon:zip-dashboard-react:prefs";

interface StoredPreferences {
  version: number;
  preferences: DashboardPreferences;
}

const ACCENT_KEYS: AccentKey[] = ["morado", "azul", "verde", "naranja", "rosa"];
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
 * resultado siempre es un DashboardPreferences completo y válido.
 */
export function sanitizePreferences(value: unknown): DashboardPreferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const candidate = value as Partial<Record<keyof DashboardPreferences, unknown>>;

  return {
    accent: isOneOf(candidate.accent, ACCENT_KEYS) ? candidate.accent : DEFAULT_PREFERENCES.accent,
    density: isOneOf(candidate.density, DENSITY_KEYS) ? candidate.density : DEFAULT_PREFERENCES.density,
    cardStyle: isOneOf(candidate.cardStyle, CARD_STYLE_KEYS) ? candidate.cardStyle : DEFAULT_PREFERENCES.cardStyle,
    iconStyle: isOneOf(candidate.iconStyle, ICON_STYLE_KEYS) ? candidate.iconStyle : DEFAULT_PREFERENCES.iconStyle,
    typography: isOneOf(candidate.typography, TYPOGRAPHY_KEYS) ? candidate.typography : DEFAULT_PREFERENCES.typography,
    showDock: typeof candidate.showDock === "boolean" ? candidate.showDock : DEFAULT_PREFERENCES.showDock,
  };
}

/** Intenta leer y sanear preferencias guardadas con la clave anterior (no versionada). */
function loadLegacyPreferences(): DashboardPreferences | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Lee las preferencias guardadas. En el servidor (SSR) o si no hay nada
 * guardado, o si lo guardado es de otra versión / está corrupto, devuelve
 * DEFAULT_PREFERENCES — nunca lanza y nunca devuelve un objeto parcial.
 *
 * Migración: si no existe la clave versionada actual pero sí existe la clave
 * antigua (preferencias guardadas por la implementación inline previa), se
 * leen y sanean esas preferencias en lugar de caer directo a los defaults.
 * La clave antigua no se borra ni se reescribe aquí; la próxima vez que el
 * usuario presione "Aplicar cambios" quedará guardado bajo la clave nueva.
 */
export function loadPreferences(): DashboardPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return loadLegacyPreferences() ?? { ...DEFAULT_PREFERENCES };
    }

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
