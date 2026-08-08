"use client";

// NELZZON — Personalizar visual (FASE 1M-A, ampliado en 1M-D). Estado de
// preferencias visuales de toda la app, 100% cliente: sin DB, sin server
// actions. Persiste en localStorage (nelzzon.visualPrefs.v1) y se aplica como
// atributos data-visual-* en <html> (más una variable CSS para la imagen de
// fondo propia), que globals.css traduce en variables/clases CSS aditivas (no
// reemplaza los tokens base de 1L-B). El motor con persistencia por
// usuario/organización (user_preferences) queda para una fase futura.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type VisualPreset = "minimal-clinico" | "premium-cards" | "kpi-dashboard" | "glass-soft" | "ejecutivo" | "showcase" | "instrumento-precision" | "atlas-clinico";
export type VisualAccent = "teal" | "violet" | "emerald" | "amber" | "rose" | "slate" | "copper" | "oxblood";
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

// FASE 1M-E — Plantillas de negocio, fondos en galería, módulos y dock.
export type BusinessTemplateId =
  | "clinico-limpio"
  | "dental-premium"
  | "estetica-belleza"
  | "taller-tecnico"
  | "ejecutivo-legal"
  | "educacion"
  | "creativo-moderno"
  | "minimal-premium"
  | "wellness-fitness"
  | "retail-comercio";

export type ModuleTileStyle =
  | "app-pastel"
  | "app-solido"
  | "clase"
  | "glass-premium"
  | "clinico"
  | "ejecutivo"
  | "estetica"
  | "taller"
  | "minimal";

export type DashboardCardStyle =
  | "limpia"
  | "pastel"
  | "solida"
  | "glass"
  | "elevada"
  | "premium"
  | "ejecutiva"
  | "clinica"
  | "taller"
  | "intensa";

export type DockStyle =
  | "limpio"
  | "glass"
  | "flotante-premium"
  | "ejecutivo"
  | "compacto"
  | "app-moderna"
  | "color-solido"
  | "minimal";

export type DockSize = "compacto" | "normal" | "grande";
export type DockActiveStyle = "pill" | "subrayado" | "bloque" | "glow";
export type DockLabelVisibility = "visible" | "oculto";

/** Posición/tamaño de icono de plantilla — referencia para identidad de módulos (1M-E). */
export type TemplateIconPosition = "top-right" | "top-left" | "top-center" | "center-large" | "watermark" | "none";
export type TemplateIconSize = "small" | "normal" | "large" | "hero";

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

  // FASE 1M-E — Plantillas por categoría de negocio, galería de fondos,
  // estilo de módulos/tarjetas KPI y dock inferior.
  /** Última plantilla de negocio aplicada, o null si no se ha aplicado ninguna. */
  businessTemplateId: BusinessTemplateId | null;
  /** Fondo elegido de BACKGROUND_GALLERY. */
  backgroundPresetId: string;
  moduleTileStyle: ModuleTileStyle;
  dashboardCardStyle: DashboardCardStyle;
  dockStyle: DockStyle;
  dockSize: DockSize;
  dockActiveStyle: DockActiveStyle;
  dockLabelVisibility: DockLabelVisibility;
  dockShadow: VisualShadow;
  dockRadius: VisualRadius;
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
  "instrumento-precision": {
    label: "Instrumento de Precisión",
    description: "Oscuro por default, un solo acento cobre, cifras en mono — panel de instrumento, no app.",
    prefs: { accent: "copper", density: "comfortable", shadow: "elevated", radius: "square", cardStyle: "bordered" },
  },
  "atlas-clinico": {
    label: "Atlas Clínico",
    description: "Papel cálido y cifras en serif editorial — casa editorial seria, no plantilla de SaaS.",
    prefs: { accent: "oxblood", density: "comfortable", shadow: "soft", radius: "square", cardStyle: "bordered" },
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
  { key: "copper", label: "Cobre" },
  { key: "oxblood", label: "Oxblood" },
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

export const DEFAULT_BRAND_NAME = "Nelzzon";
export const DEFAULT_BRAND_TAGLINE = "El sistema operativo de tu clínica dental";

// ============================================================
// FASE 1M-E — Galería de fondos (≥30 presets, sin imágenes externas)
// ============================================================

export interface BackgroundGalleryEntry {
  id: string;
  label: string;
  category: string;
  /** Valor CSS para background-image — usado en miniaturas y en globals.css. */
  preview: string;
}

export const BACKGROUND_GALLERY_CATEGORIES = [
  "Limpios",
  "Clínicos",
  "Ejecutivos",
  "Belleza y estética",
  "Taller y técnico",
  "Educación y pastel",
  "Degradados premium",
  "Glass",
  "Intensos legibles",
  "Patrones sutiles",
] as const;

export const BACKGROUND_GALLERY: BackgroundGalleryEntry[] = [
  // Limpios
  { id: "clean-blanco", label: "Blanco puro", category: "Limpios", preview: "linear-gradient(180deg, #ffffff 0%, #ffffff 100%)" },
  { id: "clean-niebla", label: "Niebla suave", category: "Limpios", preview: "linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%)" },
  { id: "clean-arena", label: "Arena clara", category: "Limpios", preview: "linear-gradient(180deg, #fafaf9 0%, #f1efec 100%)" },
  // Clínicos
  { id: "clinico-azul", label: "Azul clínico", category: "Clínicos", preview: "linear-gradient(180deg, #eef6ff 0%, #ffffff 70%)" },
  { id: "clinico-menta", label: "Menta clínica", category: "Clínicos", preview: "linear-gradient(180deg, #eafff5 0%, #ffffff 70%)" },
  { id: "clinico-porcelana", label: "Porcelana", category: "Clínicos", preview: "linear-gradient(180deg, #ffffff 0%, #f4f8fb 100%)" },
  // Ejecutivos
  { id: "ejecutivo-slate", label: "Slate ejecutivo", category: "Ejecutivos", preview: "linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%)" },
  { id: "ejecutivo-navy", label: "Navy sutil", category: "Ejecutivos", preview: "linear-gradient(160deg, #eef2f7 0%, #dbe4f0 100%)" },
  { id: "ejecutivo-grafito", label: "Grafito suave", category: "Ejecutivos", preview: "linear-gradient(160deg, #f4f4f5 0%, #e4e4e7 100%)" },
  // Belleza y estética
  { id: "estetica-rosa", label: "Rosa suave", category: "Belleza y estética", preview: "linear-gradient(135deg, #fff1f5 0%, #ffe4ec 100%)" },
  { id: "estetica-champan", label: "Champagne", category: "Belleza y estética", preview: "linear-gradient(135deg, #fdf6ec 0%, #f5e8d3 100%)" },
  { id: "estetica-lavanda", label: "Lavanda", category: "Belleza y estética", preview: "linear-gradient(135deg, #f5f0ff 0%, #ece3fb 100%)" },
  // Taller y técnico
  { id: "taller-grafito", label: "Grafito taller", category: "Taller y técnico", preview: "linear-gradient(160deg, #f1f1f2 0%, #d8dadd 100%)" },
  { id: "taller-naranja", label: "Acento naranja", category: "Taller y técnico", preview: "linear-gradient(160deg, #fff4ec 0%, #ffe2cc 100%)" },
  { id: "taller-acero", label: "Azul acero", category: "Taller y técnico", preview: "linear-gradient(160deg, #eef3f7 0%, #d7e3ec 100%)" },
  // Educación y pastel
  { id: "edu-amarillo", label: "Pastel amarillo", category: "Educación y pastel", preview: "linear-gradient(135deg, #fffbea 0%, #fef3c7 100%)" },
  { id: "edu-azul", label: "Pastel azul", category: "Educación y pastel", preview: "linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)" },
  { id: "edu-verde", label: "Pastel verde", category: "Educación y pastel", preview: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" },
  // Degradados premium
  { id: "degradado-amanecer", label: "Amanecer", category: "Degradados premium", preview: "linear-gradient(135deg, #fef3c7 0%, #fecaca 50%, #fbcfe8 100%)" },
  { id: "degradado-oceano", label: "Océano", category: "Degradados premium", preview: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #c7d2fe 100%)" },
  { id: "degradado-aurora", label: "Aurora", category: "Degradados premium", preview: "linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #e0f2fe 100%)" },
  // Glass
  { id: "glass-claro", label: "Glass claro", category: "Glass", preview: "linear-gradient(160deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 100%)" },
  { id: "glass-oscuro", label: "Glass oscuro", category: "Glass", preview: "linear-gradient(160deg, rgba(30,41,59,0.55) 0%, rgba(30,41,59,0.15) 100%)" },
  { id: "glass-azul", label: "Glass azul", category: "Glass", preview: "linear-gradient(160deg, rgba(186,230,253,0.5) 0%, rgba(224,242,254,0.18) 100%)" },
  // Intensos legibles
  { id: "intenso-teal", label: "Teal intenso", category: "Intensos legibles", preview: "linear-gradient(160deg, #99f6e4 0%, #5eead4 100%)" },
  { id: "intenso-violeta", label: "Violeta intenso", category: "Intensos legibles", preview: "linear-gradient(160deg, #ddd6fe 0%, #a78bfa 100%)" },
  { id: "intenso-esmeralda", label: "Esmeralda intenso", category: "Intensos legibles", preview: "linear-gradient(160deg, #bbf7d0 0%, #4ade80 100%)" },
  // Patrones sutiles
  { id: "patron-puntos", label: "Puntos sutiles", category: "Patrones sutiles", preview: "radial-gradient(circle, #d4d4d8 1px, transparent 1.4px)" },
  { id: "patron-rejilla", label: "Rejilla sutil", category: "Patrones sutiles", preview: "repeating-linear-gradient(0deg, #e4e4e7 0px, #e4e4e7 1px, transparent 1px, transparent 16px), repeating-linear-gradient(90deg, #e4e4e7 0px, #e4e4e7 1px, transparent 1px, transparent 16px)" },
  { id: "patron-diagonal", label: "Diagonal sutil", category: "Patrones sutiles", preview: "repeating-linear-gradient(45deg, #f4f4f5 0px, #f4f4f5 10px, #ffffff 10px, #ffffff 20px)" },
];

export const DEFAULT_BACKGROUND_PRESET_ID = "clean-blanco";

export const MODULE_TILE_STYLES: { key: ModuleTileStyle; label: string; description: string }[] = [
  { key: "app-pastel", label: "App pastel", description: "Tarjetas pastel con icono grande, estilo app educativa." },
  { key: "app-solido", label: "App color sólido", description: "Tarjetas de color sólido con icono blanco, alto contraste." },
  { key: "clase", label: "Clase / educación", description: "Tarjetas tipo clase, amables y con icono protagonista." },
  { key: "glass-premium", label: "Glass premium", description: "Vidrio translúcido con icono flotante." },
  { key: "clinico", label: "Clínico limpio", description: "Blanco, líneas limpias, alta legibilidad." },
  { key: "ejecutivo", label: "Ejecutivo sobrio", description: "Bordes finos, tipografía seria, look corporativo." },
  { key: "estetica", label: "Estética suave", description: "Bordes redondos, sombra suave, tono femenino/elegante." },
  { key: "taller", label: "Taller operativo", description: "Tarjetas fuertes, iconos sólidos, estilo operativo." },
  { key: "minimal", label: "Minimal", description: "Mucho espacio, casi sin sombra, look sobrio." },
];

export const DASHBOARD_CARD_STYLES: { key: DashboardCardStyle; label: string }[] = [
  { key: "limpia", label: "Limpia" },
  { key: "pastel", label: "Pastel" },
  { key: "solida", label: "Color sólido" },
  { key: "glass", label: "Glass" },
  { key: "elevada", label: "Elevada" },
  { key: "premium", label: "Premium" },
  { key: "ejecutiva", label: "Ejecutiva" },
  { key: "clinica", label: "Clínica" },
  { key: "taller", label: "Taller" },
  { key: "intensa", label: "Intensa" },
];

export const DOCK_STYLES: { key: DockStyle; label: string }[] = [
  { key: "limpio", label: "Limpio" },
  { key: "glass", label: "Glass" },
  { key: "flotante-premium", label: "Flotante premium" },
  { key: "ejecutivo", label: "Ejecutivo" },
  { key: "compacto", label: "Compacto" },
  { key: "app-moderna", label: "App moderna" },
  { key: "color-solido", label: "Color sólido" },
  { key: "minimal", label: "Minimal" },
];

export const DOCK_SIZES: { key: DockSize; label: string }[] = [
  { key: "compacto", label: "Compacto" },
  { key: "normal", label: "Normal" },
  { key: "grande", label: "Grande" },
];

export const DOCK_ACTIVE_STYLES: { key: DockActiveStyle; label: string }[] = [
  { key: "pill", label: "Píldora" },
  { key: "subrayado", label: "Subrayado" },
  { key: "bloque", label: "Bloque" },
  { key: "glow", label: "Glow" },
];

export const DOCK_LABEL_VISIBILITIES: { key: DockLabelVisibility; label: string }[] = [
  { key: "visible", label: "Visibles" },
  { key: "oculto", label: "Ocultas" },
];

// ============================================================
// FASE 1M-E — Plantillas visuales por categoría de negocio (≥10)
// ============================================================

export interface BusinessVisualTemplate {
  label: string;
  description: string;
  usage: string;
  visualPreset: VisualPreset;
  backgroundPreset: string;
  cardStyle: VisualCardStyle;
  moduleTileStyle: ModuleTileStyle;
  iconStyle: ModuleIconStyleLike;
  iconPosition: TemplateIconPosition;
  iconSize: TemplateIconSize;
  dockStyle: DockStyle;
  accentColor: VisualAccent;
  radius: VisualRadius;
  shadow: VisualShadow;
  density: VisualDensity;
  dashboardCardStyle: DashboardCardStyle;
  dockSize: DockSize;
  dockActiveStyle: DockActiveStyle;
  dockShadow: VisualShadow;
  dockRadius: VisualRadius;
  dockLabelVisibility: DockLabelVisibility;
  backgroundStyle: VisualBackgroundStyle;
}

/** Espejo local de ModuleIconStyle (src/lib/module-identity.tsx) — evita import cruzado. */
export type ModuleIconStyleLike =
  | "outline"
  | "solid-soft"
  | "duotone"
  | "glass"
  | "badge"
  | "emoji"
  | "executive"
  | "clinical"
  | "minimal";

export const BUSINESS_VISUAL_TEMPLATES: Record<BusinessTemplateId, BusinessVisualTemplate> = {
  "clinico-limpio": {
    label: "Clínico limpio",
    description: "Blanco, azul suave y teal — tarjetas limpias e iconos lineales para máxima legibilidad.",
    usage: "Médico, clínica, salud",
    visualPreset: "minimal-clinico",
    backgroundPreset: "clinico-azul",
    cardStyle: "flat",
    moduleTileStyle: "clinico",
    iconStyle: "outline",
    iconPosition: "top-right",
    iconSize: "normal",
    dockStyle: "limpio",
    accentColor: "teal",
    radius: "soft",
    shadow: "soft",
    density: "comfortable",
    dashboardCardStyle: "clinica",
    dockSize: "normal",
    dockActiveStyle: "pill",
    dockShadow: "soft",
    dockRadius: "soft",
    dockLabelVisibility: "visible",
    backgroundStyle: "clinical",
  },
  "dental-premium": {
    label: "Dental premium",
    description: "Blanco porcelana, azul dental y menta — tarjetas suaves e iconos clínicos muy cuidados.",
    usage: "Odontología",
    visualPreset: "premium-cards",
    backgroundPreset: "clinico-menta",
    cardStyle: "floating",
    moduleTileStyle: "clinico",
    iconStyle: "clinical",
    iconPosition: "top-right",
    iconSize: "normal",
    dockStyle: "glass",
    accentColor: "teal",
    radius: "rounded",
    shadow: "elevated",
    density: "comfortable",
    dashboardCardStyle: "premium",
    dockSize: "normal",
    dockActiveStyle: "pill",
    dockShadow: "glass",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "clinical",
  },
  "estetica-belleza": {
    label: "Estética y belleza",
    description: "Rosa suave, champagne y lavanda — glass, bordes redondos y sombras suaves, premium femenino.",
    usage: "Spa, belleza, dermatología estética",
    visualPreset: "glass-soft",
    backgroundPreset: "estetica-rosa",
    cardStyle: "glass",
    moduleTileStyle: "estetica",
    iconStyle: "glass",
    iconPosition: "center-large",
    iconSize: "large",
    dockStyle: "flotante-premium",
    accentColor: "rose",
    radius: "rounded",
    shadow: "glass",
    density: "comfortable",
    dashboardCardStyle: "glass",
    dockSize: "grande",
    dockActiveStyle: "glow",
    dockShadow: "glass",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "glass",
  },
  "taller-tecnico": {
    label: "Taller / servicio técnico",
    description: "Grafito, naranja y azul acero — tarjetas fuertes, iconos sólidos, estilo operativo.",
    usage: "Taller mecánico, reparación, mantenimiento",
    visualPreset: "kpi-dashboard",
    backgroundPreset: "taller-grafito",
    cardStyle: "bordered",
    moduleTileStyle: "taller",
    iconStyle: "badge",
    iconPosition: "top-left",
    iconSize: "large",
    dockStyle: "compacto",
    accentColor: "amber",
    radius: "square",
    shadow: "soft",
    density: "compact",
    dashboardCardStyle: "taller",
    dockSize: "compacto",
    dockActiveStyle: "bloque",
    dockShadow: "soft",
    dockRadius: "square",
    dockLabelVisibility: "visible",
    backgroundStyle: "executive",
  },
  "ejecutivo-legal": {
    label: "Ejecutivo / legal",
    description: "Slate, navy, gris y blanco — tarjetas sobrias, bordes finos, tipografía seria.",
    usage: "Abogados, consultores, family office",
    visualPreset: "ejecutivo",
    backgroundPreset: "ejecutivo-slate",
    cardStyle: "bordered",
    moduleTileStyle: "ejecutivo",
    iconStyle: "executive",
    iconPosition: "top-right",
    iconSize: "small",
    dockStyle: "ejecutivo",
    accentColor: "slate",
    radius: "square",
    shadow: "soft",
    density: "spacious",
    dashboardCardStyle: "ejecutiva",
    dockSize: "normal",
    dockActiveStyle: "subrayado",
    dockShadow: "soft",
    dockRadius: "square",
    dockLabelVisibility: "visible",
    backgroundStyle: "executive",
  },
  educacion: {
    label: "Educación",
    description: "Tarjetas pastel tipo clase, iconos protagonistas y colores suaves — layout amable.",
    usage: "Escuelas, cursos, academias",
    visualPreset: "premium-cards",
    backgroundPreset: "edu-azul",
    cardStyle: "floating",
    moduleTileStyle: "clase",
    iconStyle: "solid-soft",
    iconPosition: "center-large",
    iconSize: "hero",
    dockStyle: "app-moderna",
    accentColor: "violet",
    radius: "rounded",
    shadow: "soft",
    density: "comfortable",
    dashboardCardStyle: "pastel",
    dockSize: "grande",
    dockActiveStyle: "pill",
    dockShadow: "soft",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "gradient",
  },
  "creativo-moderno": {
    label: "Creativo / moderno",
    description: "Gradientes vivos, tarjetas coloridas, iconos grandes — diseño expresivo.",
    usage: "Agencias, diseño, marketing",
    visualPreset: "showcase",
    backgroundPreset: "degradado-aurora",
    cardStyle: "floating",
    moduleTileStyle: "app-solido",
    iconStyle: "duotone",
    iconPosition: "center-large",
    iconSize: "hero",
    dockStyle: "app-moderna",
    accentColor: "rose",
    radius: "rounded",
    shadow: "elevated",
    density: "comfortable",
    dashboardCardStyle: "intensa",
    dockSize: "grande",
    dockActiveStyle: "glow",
    dockShadow: "elevated",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "intense",
  },
  "minimal-premium": {
    label: "Minimal premium",
    description: "Blanco, gris suave, mucho espacio y casi sin sombra — minimal para cualquier negocio sobrio.",
    usage: "Cualquier negocio sobrio",
    visualPreset: "minimal-clinico",
    backgroundPreset: "clean-niebla",
    cardStyle: "flat",
    moduleTileStyle: "minimal",
    iconStyle: "minimal",
    iconPosition: "top-right",
    iconSize: "small",
    dockStyle: "minimal",
    accentColor: "slate",
    radius: "soft",
    shadow: "soft",
    density: "spacious",
    dashboardCardStyle: "limpia",
    dockSize: "compacto",
    dockActiveStyle: "subrayado",
    dockShadow: "soft",
    dockRadius: "soft",
    dockLabelVisibility: "oculto",
    backgroundStyle: "clean",
  },
  "wellness-fitness": {
    label: "Wellness / fitness",
    description: "Verde, menta y azul — tarjetas frescas con iconos grandes.",
    usage: "Wellness, nutrición, fitness",
    visualPreset: "premium-cards",
    backgroundPreset: "intenso-esmeralda",
    cardStyle: "floating",
    moduleTileStyle: "app-pastel",
    iconStyle: "solid-soft",
    iconPosition: "center-large",
    iconSize: "large",
    dockStyle: "app-moderna",
    accentColor: "emerald",
    radius: "rounded",
    shadow: "soft",
    density: "comfortable",
    dashboardCardStyle: "pastel",
    dockSize: "normal",
    dockActiveStyle: "pill",
    dockShadow: "soft",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "gradient",
  },
  "retail-comercio": {
    label: "Retail / comercio",
    description: "Colores claros, módulos tipo catálogo, tarjetas compactas y acentos comerciales.",
    usage: "Tiendas, ventas, servicio local",
    visualPreset: "kpi-dashboard",
    backgroundPreset: "edu-amarillo",
    cardStyle: "bordered",
    moduleTileStyle: "app-pastel",
    iconStyle: "badge",
    iconPosition: "top-right",
    iconSize: "normal",
    dockStyle: "color-solido",
    accentColor: "amber",
    radius: "rounded",
    shadow: "soft",
    density: "compact",
    dashboardCardStyle: "pastel",
    dockSize: "normal",
    dockActiveStyle: "bloque",
    dockShadow: "soft",
    dockRadius: "rounded",
    dockLabelVisibility: "visible",
    backgroundStyle: "gradient",
  },
};

export const BUSINESS_TEMPLATE_KEYS = Object.keys(BUSINESS_VISUAL_TEMPLATES) as BusinessTemplateId[];

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

  businessTemplateId: null,
  backgroundPresetId: DEFAULT_BACKGROUND_PRESET_ID,
  moduleTileStyle: "clinico",
  dashboardCardStyle: "limpia",
  dockStyle: "limpio",
  dockSize: "normal",
  dockActiveStyle: "pill",
  dockLabelVisibility: "visible",
  dockShadow: "soft",
  dockRadius: "soft",
};

interface VisualPreferencesContextValue {
  preferences: VisualPreferences;
  /** Preferencias para controles del panel: borrador si hay uno activo, reales si no. */
  editorPreferences: VisualPreferences;
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

  // FASE 1M-E — Plantillas de negocio, galería de fondos, módulos y dock.
  setBackgroundPresetId: (id: string) => void;
  setModuleTileStyle: (style: ModuleTileStyle) => void;
  setDashboardCardStyle: (style: DashboardCardStyle) => void;
  setDockStyle: (style: DockStyle) => void;
  setDockSize: (size: DockSize) => void;
  setDockActiveStyle: (style: DockActiveStyle) => void;
  setDockLabelVisibility: (visibility: DockLabelVisibility) => void;
  setDockShadow: (shadow: VisualShadow) => void;
  setDockRadius: (radius: VisualRadius) => void;
  /** Aplica una plantilla visual de negocio completa (fondo, apariencia, módulos, dock, acentos). */
  applyBusinessTemplate: (id: BusinessTemplateId) => void;
  /** Quita la plantilla de negocio activa y vuelve a los valores de fábrica. */
  resetBusinessTemplate: () => void;
  /** Persiste el estado actual en localStorage de forma inmediata. */
  saveNow: () => void;
  /** Abre el panel de personalización en modo borrador: los cambios NO se aplican al sistema hasta applyDraft(). */
  enterDraftMode: () => void;
  /** Aplica el borrador al sistema (guarda + aplica al documento) y sale del modo borrador. */
  applyDraft: () => void;
  /** Descarta el borrador sin aplicar ningún cambio. Las preferencias reales quedan intactas. */
  discardDraft: () => void;
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

  // FASE 1M-E
  root.dataset.visualBackgroundPreset = prefs.backgroundPresetId;
  root.dataset.visualModuleTile = prefs.moduleTileStyle;
  root.dataset.visualDashboardCard = prefs.dashboardCardStyle;
  root.dataset.visualDockStyle = prefs.dockStyle;
  root.dataset.visualDockSize = prefs.dockSize;
  root.dataset.visualDockActive = prefs.dockActiveStyle;
  root.dataset.visualDockLabels = prefs.dockLabelVisibility;
  root.dataset.visualDockShadow = prefs.dockShadow;
  root.dataset.visualDockRadius = prefs.dockRadius;
  if (prefs.businessTemplateId) {
    root.dataset.visualBusinessTemplate = prefs.businessTemplateId;
  } else {
    delete root.dataset.visualBusinessTemplate;
  }

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
  // Borrador: cuando no es null, el panel está abierto y los cambios van aquí, no al sistema.
  const [draftPreferences, setDraftPreferences] = useState<VisualPreferences | null>(null);
  const isDraftMode = draftPreferences !== null;

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
    if (isDraftMode) {
      setDraftPreferences((prev) => ({ ...(prev ?? preferences), ...partial }));
    } else {
      setPreferences((prev) => ({ ...prev, ...partial }));
    }
  }

  // Reemplaza el estado completo respetando el modo borrador.
  function setAll(all: VisualPreferences) {
    if (isDraftMode) {
      setDraftPreferences(all);
    } else {
      setPreferences(all);
    }
  }

  function applyPreset(preset: VisualPreset) {
    update({ preset, ...VISUAL_PRESETS[preset].prefs });
  }

  const value: VisualPreferencesContextValue = {
    preferences,
    editorPreferences: draftPreferences ?? preferences,
    setPreset: applyPreset,
    setAccent: (accent) => update({ accent }),
    setDensity: (density) => update({ density }),
    setShadow: (shadow) => update({ shadow }),
    setRadius: (radius) => update({ radius }),
    setCardStyle: (cardStyle) => update({ cardStyle }),
    applyPreset,
    resetVisualPreferences: () => setAll(DEFAULT_VISUAL_PREFERENCES),

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

    resetAllPersonalization: () => setAll(DEFAULT_VISUAL_PREFERENCES),

    setBackgroundPresetId: (backgroundPresetId) => update({ backgroundPresetId }),
    setModuleTileStyle: (moduleTileStyle) => update({ moduleTileStyle }),
    setDashboardCardStyle: (dashboardCardStyle) => update({ dashboardCardStyle }),
    setDockStyle: (dockStyle) => update({ dockStyle }),
    setDockSize: (dockSize) => update({ dockSize }),
    setDockActiveStyle: (dockActiveStyle) => update({ dockActiveStyle }),
    setDockLabelVisibility: (dockLabelVisibility) => update({ dockLabelVisibility }),
    setDockShadow: (dockShadow) => update({ dockShadow }),
    setDockRadius: (dockRadius) => update({ dockRadius }),

    applyBusinessTemplate: (id) => {
      const tpl = BUSINESS_VISUAL_TEMPLATES[id];
      update({
        businessTemplateId: id,
        preset: tpl.visualPreset,
        accent: tpl.accentColor,
        density: tpl.density,
        shadow: tpl.shadow,
        radius: tpl.radius,
        cardStyle: tpl.cardStyle,
        backgroundStyle: tpl.backgroundStyle,
        backgroundPresetId: tpl.backgroundPreset,
        moduleTileStyle: tpl.moduleTileStyle,
        dashboardCardStyle: tpl.dashboardCardStyle,
        dockStyle: tpl.dockStyle,
        dockSize: tpl.dockSize,
        dockActiveStyle: tpl.dockActiveStyle,
        dockShadow: tpl.dockShadow,
        dockRadius: tpl.dockRadius,
        dockLabelVisibility: tpl.dockLabelVisibility,
      });
    },
    resetBusinessTemplate: () => setAll(DEFAULT_VISUAL_PREFERENCES),
    saveNow: () => {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* ignorar */ }
    },
    enterDraftMode: () => { setDraftPreferences(preferences); },
    applyDraft: () => {
      if (draftPreferences) setPreferences(draftPreferences);
      setDraftPreferences(null);
    },
    discardDraft: () => { setDraftPreferences(null); },
  };

  return <VisualPreferencesContext.Provider value={value}>{children}</VisualPreferencesContext.Provider>;
}

export function useVisualPreferences(): VisualPreferencesContextValue {
  const ctx = useContext(VisualPreferencesContext);
  if (!ctx) throw new Error("useVisualPreferences debe usarse dentro de VisualPreferencesProvider");
  return ctx;
}
