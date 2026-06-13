"use client";

// NELZZON — Personalizar visual (FASE 1M-A, ampliado en 1M-D). Estado de
// preferencias visuales de toda la app, 100% cliente: sin DB, sin server
// actions. Persiste en localStorage (nelzzon.visualPrefs.v1) y se aplica como
// atributos data-visual-* en <html> (más una variable CSS para la imagen de
// fondo propia), que globals.css traduce en variables/clases CSS aditivas (no
// reemplaza los tokens base de 1L-B). El motor con persistencia por
// usuario/organización (user_preferences) queda para una fase futura.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type VisualPreset = "minimal-clinico" | "premium-cards" | "kpi-dashboard" | "glass-soft" | "ejecutivo" | "showcase";
export type VisualAccent = "teal" | "violet" | "emerald" | "amber" | "rose" | "slate";
export type VisualDensity = "compact" | "comfortable" | "spacious";
export type VisualShadow = "soft" | "elevated" | "glass";
export type VisualRadius = "soft" | "rounded" | "square";
export type VisualCardStyle = "flat" | "bordered" | "floating" | "glass";

// FASE 1M-D — Fondos e imágenes.
export type VisualBackgroundStyle = "clean" | "gradient" | "glass" | "executive" | "intense" | "clinical";
export type VisualBackgroundIntensity = "low" | "medium" | "high";
export type VisualBackgroundBlur = "none" | "soft" | "medium" | "high";

// FASE 1M-D — Marca.
export type VisualBrandSize = "compact" | "normal" | "large";
export type VisualBrandTextStyle = "lowercase" | "title" | "hide";
export type VisualBrandSymbolStyle = "normal" | "soft" | "intense" | "monochrome";

export interface VisualPreferences {
  preset: VisualPreset;
  accent: VisualAccent;
  density: VisualDensity;
  shadow: VisualShadow;
  radius: VisualRadius;
  cardStyle: VisualCardStyle;
  backgroundStyle: VisualBackgroundStyle;
  backgroundIntensity: VisualBackgroundIntensity;
  backgroundBlur: VisualBackgroundBlur;
  /** Imagen propia como data URL (<700 KB) o null si no hay. Solo local. */
  backgroundImageDataUrl: string | null;
  brandName: string;
  brandTagline: string;
  brandSize: VisualBrandSize;
  brandTextStyle: VisualBrandTextStyle;
  brandSymbolStyle: VisualBrandSymbolStyle;
}

type PresetDefaults = Pick<VisualPreferences, "accent" | "density" | "shadow" | "radius" | "cardStyle">;

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

// FASE 1M-D — opciones curadas de fondo y marca.
export const VISUAL_BACKGROUND_STYLES: { key: VisualBackgroundStyle; label: string }[] = [
  { key: "clean", label: "Limpio" },
  { key: "gradient", label: "Degradado suave" },
  { key: "glass", label: "Glass" },
  { key: "executive", label: "Ejecutivo" },
  { key: "intense", label: "Intenso" },
  { key: "clinical", label: "Clínico" },
];

export const VISUAL_BACKGROUND_INTENSITIES: { key: VisualBackgroundIntensity; label: string }[] = [
  { key: "low", label: "Baja" },
  { key: "medium", label: "Media" },
  { key: "high", label: "Alta" },
];

export const VISUAL_BACKGROUND_BLURS: { key: VisualBackgroundBlur; label: string }[] = [
  { key: "none", label: "Sin blur" },
  { key: "soft", label: "Suave" },
  { key: "medium", label: "Medio" },
  { key: "high", label: "Alto" },
];

export const VISUAL_BRAND_SIZES: { key: VisualBrandSize; label: string }[] = [
  { key: "compact", label: "Compacto" },
  { key: "normal", label: "Normal" },
  { key: "large", label: "Grande" },
];

export const VISUAL_BRAND_TEXT_STYLES: { key: VisualBrandTextStyle; label: string }[] = [
  { key: "lowercase", label: "minúsculas" },
  { key: "title", label: "título" },
  { key: "hide", label: "ocultar texto" },
];

export const VISUAL_BRAND_SYMBOL_STYLES: { key: VisualBrandSymbolStyle; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "soft", label: "Suave" },
  { key: "intense", label: "Intenso" },
  { key: "monochrome", label: "Monocromático" },
];

/** Máximo permitido para guardar una imagen de fondo propia en localStorage. */
export const MAX_BACKGROUND_IMAGE_BYTES = 700 * 1024;

export const STORAGE_KEY = "nelzzon.visualPrefs.v1";

export const DEFAULT_BRAND_NAME = "nelzzon";
export const DEFAULT_BRAND_TAGLINE = "Sistema operativo para servicios";

export const DEFAULT_VISUAL_PREFERENCES: VisualPreferences = {
  preset: "minimal-clinico",
  ...VISUAL_PRESETS["minimal-clinico"].prefs,
  backgroundStyle: "clean",
  backgroundIntensity: "medium",
  backgroundBlur: "none",
  backgroundImageDataUrl: null,
  brandName: DEFAULT_BRAND_NAME,
  brandTagline: DEFAULT_BRAND_TAGLINE,
  brandSize: "normal",
  brandTextStyle: "title",
  brandSymbolStyle: "normal",
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

  // FASE 1M-D — Fondos e imágenes.
  setBackgroundStyle: (style: VisualBackgroundStyle) => void;
  setBackgroundIntensity: (intensity: VisualBackgroundIntensity) => void;
  setBackgroundBlur: (blur: VisualBackgroundBlur) => void;
  setBackgroundImageDataUrl: (dataUrl: string | null) => void;
  clearBackgroundImage: () => void;
  resetBackground: () => void;

  // FASE 1M-D — Marca.
  setBrandName: (name: string) => void;
  setBrandTagline: (tagline: string) => void;
  setBrandSize: (size: VisualBrandSize) => void;
  setBrandTextStyle: (style: VisualBrandTextStyle) => void;
  setBrandSymbolStyle: (style: VisualBrandSymbolStyle) => void;
  resetBrand: () => void;

  /** Reinicia toda la personalización (visual + fondos + marca) a sus valores de fábrica. */
  resetAllPersonalization: () => void;
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
  root.dataset.visualBackground = prefs.backgroundStyle;
  root.dataset.visualBackgroundIntensity = prefs.backgroundIntensity;
  root.dataset.visualBackgroundBlur = prefs.backgroundBlur;
  root.dataset.visualBrandSize = prefs.brandSize;
  root.dataset.visualBrandSymbol = prefs.brandSymbolStyle;

  if (prefs.backgroundImageDataUrl) {
    root.style.setProperty("--visual-bg-image", `url(${prefs.backgroundImageDataUrl})`);
  } else {
    root.style.removeProperty("--visual-bg-image");
  }
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

    setBackgroundStyle: (backgroundStyle) => update({ backgroundStyle }),
    setBackgroundIntensity: (backgroundIntensity) => update({ backgroundIntensity }),
    setBackgroundBlur: (backgroundBlur) => update({ backgroundBlur }),
    setBackgroundImageDataUrl: (backgroundImageDataUrl) => update({ backgroundImageDataUrl }),
    clearBackgroundImage: () => update({ backgroundImageDataUrl: null }),
    resetBackground: () =>
      update({
        backgroundStyle: DEFAULT_VISUAL_PREFERENCES.backgroundStyle,
        backgroundIntensity: DEFAULT_VISUAL_PREFERENCES.backgroundIntensity,
        backgroundBlur: DEFAULT_VISUAL_PREFERENCES.backgroundBlur,
        backgroundImageDataUrl: DEFAULT_VISUAL_PREFERENCES.backgroundImageDataUrl,
      }),

    setBrandName: (brandName) => update({ brandName }),
    setBrandTagline: (brandTagline) => update({ brandTagline }),
    setBrandSize: (brandSize) => update({ brandSize }),
    setBrandTextStyle: (brandTextStyle) => update({ brandTextStyle }),
    setBrandSymbolStyle: (brandSymbolStyle) => update({ brandSymbolStyle }),
    resetBrand: () =>
      update({
        brandName: DEFAULT_VISUAL_PREFERENCES.brandName,
        brandTagline: DEFAULT_VISUAL_PREFERENCES.brandTagline,
        brandSize: DEFAULT_VISUAL_PREFERENCES.brandSize,
        brandTextStyle: DEFAULT_VISUAL_PREFERENCES.brandTextStyle,
        brandSymbolStyle: DEFAULT_VISUAL_PREFERENCES.brandSymbolStyle,
      }),

    resetAllPersonalization: () => setPreferences(DEFAULT_VISUAL_PREFERENCES),
  };

  return <VisualPreferencesContext.Provider value={value}>{children}</VisualPreferencesContext.Provider>;
}

export function useVisualPreferences(): VisualPreferencesContextValue {
  const ctx = useContext(VisualPreferencesContext);
  if (!ctx) throw new Error("useVisualPreferences debe usarse dentro de VisualPreferencesProvider");
  return ctx;
}
