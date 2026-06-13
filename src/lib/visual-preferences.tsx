"use client";

// NELZZON — Personalizar visual (FASE 1M-A). Estado de preferencias visuales
// del Dashboard, 100% cliente: sin DB, sin server actions. Persiste en
// localStorage (nelzzon.visualPrefs.v1) y se aplica como atributos
// data-visual-* en <html>, que globals.css traduce en variables/clases CSS
// aditivas (no reemplaza los tokens base de 1L-B). El motor con persistencia
// por usuario/organización (user_preferences) queda para una fase futura.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type VisualPreset = "minimal-clinico" | "premium-cards" | "kpi-dashboard" | "glass-soft" | "ejecutivo" | "showcase";
export type VisualAccent = "teal" | "violet" | "emerald" | "amber" | "rose" | "slate";
export type VisualDensity = "compact" | "comfortable" | "spacious";
export type VisualShadow = "soft" | "elevated" | "glass";
export type VisualRadius = "soft" | "rounded" | "square";
export type VisualCardStyle = "flat" | "bordered" | "floating" | "glass";

export interface VisualPreferences {
  preset: VisualPreset;
  accent: VisualAccent;
  density: VisualDensity;
  shadow: VisualShadow;
  radius: VisualRadius;
  cardStyle: VisualCardStyle;
}

type PresetDefaults = Omit<VisualPreferences, "preset">;

export const VISUAL_PRESETS: Record<VisualPreset, { label: string; description: string; prefs: PresetDefaults }> = {
  "minimal-clinico": {
    label: "Minimal clínico",
    description: "El estilo actual: limpio, sobrio, pensado para foco clínico.",
    prefs: { accent: "teal", density: "comfortable", shadow: "soft", radius: "soft", cardStyle: "flat" },
  },
  "premium-cards": {
    label: "Premium cards",
    description: "Tarjetas flotantes con más profundidad y sombra al interactuar.",
    prefs: { accent: "teal", density: "comfortable", shadow: "elevated", radius: "rounded", cardStyle: "floating" },
  },
  "kpi-dashboard": {
    label: "KPI dashboard",
    description: "Más denso, pensado para ver varios indicadores de un vistazo.",
    prefs: { accent: "violet", density: "compact", shadow: "soft", radius: "rounded", cardStyle: "bordered" },
  },
  "glass-soft": {
    label: "Glass soft",
    description: "Superficies translúcidas y suaves, look moderno.",
    prefs: { accent: "teal", density: "comfortable", shadow: "glass", radius: "rounded", cardStyle: "glass" },
  },
  ejecutivo: {
    label: "Ejecutivo",
    description: "Sobrio, esquinas cuadradas y espacioso — perfil administrativo.",
    prefs: { accent: "slate", density: "spacious", shadow: "soft", radius: "square", cardStyle: "bordered" },
  },
  showcase: {
    label: "Visual intenso / Showcase",
    description: "Tarjetas flotantes, acento vivo y máxima profundidad — la versión más expresiva.",
    prefs: { accent: "rose", density: "comfortable", shadow: "elevated", radius: "rounded", cardStyle: "floating" },
  },
};

export const VISUAL_PRESET_KEYS = Object.keys(VISUAL_PRESETS) as VisualPreset[];

export const VISUAL_ACCENTS: { key: VisualAccent; label: string }[] = [
  { key: "teal", label: "Teal" },
  { key: "violet", label: "Violeta" },
  { key: "emerald", label: "Esmeralda" },
  { key: "amber", label: "Ámbar" },
  { key: "rose", label: "Rosa" },
  { key: "slate", label: "Slate" },
];

export const STORAGE_KEY = "nelzzon.visualPrefs.v1";

export const DEFAULT_VISUAL_PREFERENCES: VisualPreferences = {
  preset: "minimal-clinico",
  ...VISUAL_PRESETS["minimal-clinico"].prefs,
};

interface VisualPreferencesContextValue {
  preferences: VisualPreferences;
  setPreset: (preset: VisualPreset) => void;
  setAccent: (accent: VisualAccent) => void;
  setDensity: (density: VisualDensity) => void;
  setShadow: (shadow: VisualShadow) => void;
  setRadius: (radius: VisualRadius) => void;
  setCardStyle: (cardStyle: VisualCardStyle) => void;
  /** Aplica un preset completo (acento, densidad, sombra, radio, estilo de tarjeta). */
  applyPreset: (preset: VisualPreset) => void;
  /** Vuelve a los valores por defecto (minimal-clinico) y los persiste. */
  resetVisualPreferences: () => void;
}

const VisualPreferencesContext = createContext<VisualPreferencesContextValue | null>(null);

function readStoredPreferences(): VisualPreferences {
  if (typeof window === "undefined") return DEFAULT_VISUAL_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISUAL_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<VisualPreferences>;
    return { ...DEFAULT_VISUAL_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_VISUAL_PREFERENCES;
  }
}

function applyPreferencesToDocument(prefs: VisualPreferences) {
  const root = document.documentElement;
  root.dataset.visualPreset = prefs.preset;
  root.dataset.visualAccent = prefs.accent;
  root.dataset.visualDensity = prefs.density;
  root.dataset.visualShadow = prefs.shadow;
  root.dataset.visualRadius = prefs.radius;
  root.dataset.visualCardStyle = prefs.cardStyle;
}

export function VisualPreferencesProvider({ children }: { children: ReactNode }) {
  // Estado inicial = defaults (idéntico al estilo actual) para que el primer
  // render en servidor y cliente coincida; la preferencia guardada se aplica
  // tras montar, en un efecto — sin tocar el documento durante SSR.
  const [preferences, setPreferences] = useState<VisualPreferences>(DEFAULT_VISUAL_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferences(readStoredPreferences());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyPreferencesToDocument(preferences);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // localStorage no disponible (modo privado, cuotas, etc.) — la
      // preferencia sigue aplicándose en esta sesión, solo no persiste.
    }
  }, [preferences, hydrated]);

  function update(partial: Partial<VisualPreferences>) {
    setPreferences((prev) => ({ ...prev, ...partial }));
  }

  function applyPreset(preset: VisualPreset) {
    update({ preset, ...VISUAL_PRESETS[preset].prefs });
  }

  const value: VisualPreferencesContextValue = {
    preferences,
    setPreset: applyPreset,
    setAccent: (accent) => update({ accent }),
    setDensity: (density) => update({ density }),
    setShadow: (shadow) => update({ shadow }),
    setRadius: (radius) => update({ radius }),
    setCardStyle: (cardStyle) => update({ cardStyle }),
    applyPreset,
    resetVisualPreferences: () => setPreferences(DEFAULT_VISUAL_PREFERENCES),
  };

  return <VisualPreferencesContext.Provider value={value}>{children}</VisualPreferencesContext.Provider>;
}

export function useVisualPreferences(): VisualPreferencesContextValue {
  const ctx = useContext(VisualPreferencesContext);
  if (!ctx) throw new Error("useVisualPreferences debe usarse dentro de VisualPreferencesProvider");
  return ctx;
}
