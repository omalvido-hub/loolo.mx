"use client";

// NELZZON — Identidad visual de módulos/KPIs/widgets (FASE 1M-C). Estado
// 100% cliente: sin DB, sin server actions. Persiste en localStorage
// (nelzzon.moduleIdentity.v1) como overrides parciales sobre
// MODULE_IDENTITY_REGISTRY — un catálogo pensado para crecer (hoy cubre los 8
// widgets del Dashboard + 13 módulos futuros del sistema). Cada entrada del
// registro puede personalizarse en tipo (emoji/icono/iniciales/badge),
// estilo, color, forma y visibilidad, con reset individual o global.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Clock,
  Wallet,
  CircleDollarSign,
  Landmark,
  Receipt,
  CreditCard,
  PiggyBank,
  FileText,
  FolderOpen,
  FileSpreadsheet,
  ClipboardList,
  PenLine,
  Target,
  Scale,
  TrendingUp,
  Trophy,
  Flag,
  ChartColumn,
  ChartPie,
  ChartLine,
  Gauge,
  Boxes,
  Settings,
  Wrench,
  Bell,
  Compass,
  Globe,
  Users,
  UserCheck,
  UserCog,
  Contact,
  Stethoscope,
  Smile,
  Activity,
  HeartPulse,
  Syringe,
  Pill,
  type LucideIcon,
} from "lucide-react";

export type ModuleIdentityType = "emoji" | "icon" | "initials" | "badge";
export type ModuleIconStyle =
  | "outline"
  | "solid-soft"
  | "duotone"
  | "glass"
  | "badge"
  | "emoji"
  | "executive"
  | "clinical"
  | "minimal";
export type ModuleAccentColor = "teal" | "violet" | "emerald" | "amber" | "rose" | "slate" | "blue" | "cyan" | "neutral";
export type ModuleShape = "circle" | "square" | "pill";

// FASE 1M-E — Personalización avanzada por KPI/widget.
export type ModuleIconPosition = "auto" | "top-right" | "top-left" | "top-center" | "center-large" | "watermark" | "none";
export type ModuleIconSize = "auto" | "small" | "normal" | "large" | "hero";
export type ModuleContentAlign = "auto" | "left" | "center" | "right";
export type ModuleCardAppearance =
  | "auto"
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
export type ModuleCardBackground = "auto" | "blanco" | "suave-color" | "degradado" | "glass" | "solido";
export type ModuleCardBorder = "auto" | "ninguno" | "suave" | "acento" | "superior" | "lateral";
export type ModuleCardShadow = "auto" | "ninguna" | "suave" | "media" | "elevada";

export interface ModuleIdentity {
  type: ModuleIdentityType;
  emoji: string;
  iconKey: string;
  initials: string;
  style: ModuleIconStyle;
  color: ModuleAccentColor;
  shape: ModuleShape;
  hidden: boolean;

  // FASE 1M-E
  iconPosition: ModuleIconPosition;
  iconSize: ModuleIconSize;
  contentAlign: ModuleContentAlign;
  cardAppearance: ModuleCardAppearance;
  cardBackground: ModuleCardBackground;
  cardBorder: ModuleCardBorder;
  cardShadow: ModuleCardShadow;
}

export type ModuleIconCategory = "clinico" | "dinero" | "agenda" | "documentos" | "metas" | "reportes" | "operacion" | "usuarios";

export const MODULE_ICON_CATEGORIES: { key: ModuleIconCategory; label: string }[] = [
  { key: "clinico", label: "Clínico" },
  { key: "dinero", label: "Dinero" },
  { key: "agenda", label: "Agenda" },
  { key: "documentos", label: "Documentos" },
  { key: "metas", label: "Metas" },
  { key: "reportes", label: "Reportes" },
  { key: "operacion", label: "Operación" },
  { key: "usuarios", label: "Usuarios" },
];

export interface ModuleIconLibraryEntry {
  key: string;
  label: string;
  category: ModuleIconCategory;
  Icon: LucideIcon;
}

// Biblioteca curada de iconos profesionales (lucide-react), agrupada por
// categoría. ~40 iconos — pensada para crecer junto con el catálogo de
// módulos, no como una lista cerrada.
export const MODULE_ICON_LIBRARY: ModuleIconLibraryEntry[] = [
  // Clínico
  { key: "Stethoscope", label: "Estetoscopio", category: "clinico", Icon: Stethoscope },
  { key: "Smile", label: "Sonrisa / odontograma", category: "clinico", Icon: Smile },
  { key: "Activity", label: "Actividad clínica", category: "clinico", Icon: Activity },
  { key: "HeartPulse", label: "Signos vitales", category: "clinico", Icon: HeartPulse },
  { key: "Syringe", label: "Jeringa", category: "clinico", Icon: Syringe },
  { key: "Pill", label: "Medicamento", category: "clinico", Icon: Pill },
  // Dinero
  { key: "Wallet", label: "Cartera", category: "dinero", Icon: Wallet },
  { key: "CircleDollarSign", label: "Monto", category: "dinero", Icon: CircleDollarSign },
  { key: "Landmark", label: "Banco", category: "dinero", Icon: Landmark },
  { key: "Receipt", label: "Recibo", category: "dinero", Icon: Receipt },
  { key: "CreditCard", label: "Tarjeta", category: "dinero", Icon: CreditCard },
  { key: "PiggyBank", label: "Ahorro", category: "dinero", Icon: PiggyBank },
  // Agenda
  { key: "CalendarCheck", label: "Cita confirmada", category: "agenda", Icon: CalendarCheck },
  { key: "CalendarDays", label: "Calendario", category: "agenda", Icon: CalendarDays },
  { key: "Clock", label: "Reloj", category: "agenda", Icon: Clock },
  { key: "CalendarClock", label: "Horario", category: "agenda", Icon: CalendarClock },
  { key: "CalendarRange", label: "Rango de fechas", category: "agenda", Icon: CalendarRange },
  // Documentos
  { key: "FileText", label: "Documento", category: "documentos", Icon: FileText },
  { key: "FolderOpen", label: "Carpeta", category: "documentos", Icon: FolderOpen },
  { key: "FileSpreadsheet", label: "Hoja de cálculo", category: "documentos", Icon: FileSpreadsheet },
  { key: "ClipboardList", label: "Lista / plan", category: "documentos", Icon: ClipboardList },
  { key: "PenLine", label: "Firma", category: "documentos", Icon: PenLine },
  // Metas
  { key: "Target", label: "Meta", category: "metas", Icon: Target },
  { key: "Scale", label: "Balance", category: "metas", Icon: Scale },
  { key: "TrendingUp", label: "Tendencia", category: "metas", Icon: TrendingUp },
  { key: "Trophy", label: "Logro", category: "metas", Icon: Trophy },
  { key: "Flag", label: "Hito", category: "metas", Icon: Flag },
  // Reportes
  { key: "ChartColumn", label: "Barras", category: "reportes", Icon: ChartColumn },
  { key: "ChartPie", label: "Pastel", category: "reportes", Icon: ChartPie },
  { key: "ChartLine", label: "Línea", category: "reportes", Icon: ChartLine },
  { key: "Gauge", label: "Indicador", category: "reportes", Icon: Gauge },
  // Operación
  { key: "Boxes", label: "Inventario", category: "operacion", Icon: Boxes },
  { key: "Settings", label: "Configuración", category: "operacion", Icon: Settings },
  { key: "Wrench", label: "Mantenimiento", category: "operacion", Icon: Wrench },
  { key: "Bell", label: "Alertas", category: "operacion", Icon: Bell },
  { key: "Compass", label: "Navegación", category: "operacion", Icon: Compass },
  { key: "Globe", label: "Portal", category: "operacion", Icon: Globe },
  // Usuarios
  { key: "Users", label: "Pacientes", category: "usuarios", Icon: Users },
  { key: "UserCheck", label: "Verificado", category: "usuarios", Icon: UserCheck },
  { key: "UserCog", label: "Rol / permisos", category: "usuarios", Icon: UserCog },
  { key: "Contact", label: "Contacto", category: "usuarios", Icon: Contact },
];

export interface ModuleEmojiLibraryEntry {
  value: string;
  label: string;
  category: ModuleIconCategory;
}

// Biblioteca curada de emoji, agrupada por la misma categoría que los
// iconos. El usuario también puede escribir un emoji manualmente.
export const MODULE_EMOJI_LIBRARY: ModuleEmojiLibraryEntry[] = [
  { value: "🦷", label: "Diente", category: "clinico" },
  { value: "🩺", label: "Estetoscopio", category: "clinico" },
  { value: "💉", label: "Jeringa", category: "clinico" },
  { value: "🩹", label: "Curita", category: "clinico" },
  { value: "🧬", label: "ADN", category: "clinico" },
  { value: "❤️", label: "Salud", category: "clinico" },
  { value: "💰", label: "Dinero", category: "dinero" },
  { value: "💵", label: "Billete", category: "dinero" },
  { value: "💳", label: "Tarjeta", category: "dinero" },
  { value: "🏦", label: "Banco", category: "dinero" },
  { value: "🪙", label: "Moneda", category: "dinero" },
  { value: "📈", label: "Ingresos", category: "dinero" },
  { value: "📅", label: "Calendario", category: "agenda" },
  { value: "🗓️", label: "Agenda", category: "agenda" },
  { value: "⏰", label: "Alarma", category: "agenda" },
  { value: "🕒", label: "Hora", category: "agenda" },
  { value: "📆", label: "Día", category: "agenda" },
  { value: "✅", label: "Hecho", category: "agenda" },
  { value: "📄", label: "Documento", category: "documentos" },
  { value: "📁", label: "Carpeta", category: "documentos" },
  { value: "🗂️", label: "Archivo", category: "documentos" },
  { value: "📋", label: "Lista", category: "documentos" },
  { value: "🧾", label: "Recibo", category: "documentos" },
  { value: "✍️", label: "Firma", category: "documentos" },
  { value: "🎯", label: "Meta", category: "metas" },
  { value: "🏆", label: "Logro", category: "metas" },
  { value: "🚩", label: "Hito", category: "metas" },
  { value: "📊", label: "Indicador", category: "metas" },
  { value: "⭐", label: "Destacado", category: "metas" },
  { value: "🔝", label: "Top", category: "metas" },
  { value: "📉", label: "Caída", category: "reportes" },
  { value: "🧮", label: "Cálculo", category: "reportes" },
  { value: "📑", label: "Reporte", category: "reportes" },
  { value: "🔍", label: "Análisis", category: "reportes" },
  { value: "⚙️", label: "Ajustes", category: "operacion" },
  { value: "🛠️", label: "Herramientas", category: "operacion" },
  { value: "📦", label: "Inventario", category: "operacion" },
  { value: "🔔", label: "Notificación", category: "operacion" },
  { value: "🧭", label: "Navegación", category: "operacion" },
  { value: "🔧", label: "Configurar", category: "operacion" },
  { value: "👤", label: "Persona", category: "usuarios" },
  { value: "👥", label: "Equipo", category: "usuarios" },
  { value: "🧑‍⚕️", label: "Clínico", category: "usuarios" },
  { value: "🧑‍💼", label: "Administración", category: "usuarios" },
  { value: "🙋", label: "Atención", category: "usuarios" },
  { value: "📇", label: "Directorio", category: "usuarios" },
];

export const MODULE_ICON_STYLES: { key: ModuleIconStyle; label: string }[] = [
  { key: "outline", label: "Outline" },
  { key: "solid-soft", label: "Solid soft" },
  { key: "duotone", label: "Duotone" },
  { key: "glass", label: "Glass" },
  { key: "badge", label: "Badge" },
  { key: "emoji", label: "Emoji" },
  { key: "executive", label: "Ejecutivo" },
  { key: "clinical", label: "Clínico" },
  { key: "minimal", label: "Minimal" },
];

export const MODULE_ACCENT_COLORS: { key: ModuleAccentColor; label: string }[] = [
  { key: "teal", label: "Teal" },
  { key: "violet", label: "Violeta" },
  { key: "emerald", label: "Esmeralda" },
  { key: "amber", label: "Ámbar" },
  { key: "rose", label: "Rosa" },
  { key: "slate", label: "Slate" },
  { key: "blue", label: "Azul" },
  { key: "cyan", label: "Cian" },
  { key: "neutral", label: "Neutral" },
];

export const MODULE_SHAPES: { key: ModuleShape; label: string }[] = [
  { key: "circle", label: "Círculo" },
  { key: "square", label: "Cuadrado" },
  { key: "pill", label: "Píldora" },
];

// FASE 1M-E — opciones de personalización avanzada por KPI/widget.
export const MODULE_ICON_POSITIONS: { key: ModuleIconPosition; label: string }[] = [
  { key: "auto", label: "Automática" },
  { key: "top-right", label: "Arriba derecha" },
  { key: "top-left", label: "Arriba izquierda" },
  { key: "top-center", label: "Arriba centro" },
  { key: "center-large", label: "Grande al centro" },
  { key: "watermark", label: "Marca de agua" },
  { key: "none", label: "Sin icono" },
];

export const MODULE_ICON_SIZES: { key: ModuleIconSize; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "small", label: "Pequeño" },
  { key: "normal", label: "Normal" },
  { key: "large", label: "Grande" },
  { key: "hero", label: "Protagonista" },
];

export const MODULE_CONTENT_ALIGNS: { key: ModuleContentAlign; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "left", label: "Izquierda" },
  { key: "center", label: "Centro" },
  { key: "right", label: "Derecha" },
];

export const MODULE_CARD_APPEARANCES: { key: ModuleCardAppearance; label: string }[] = [
  { key: "auto", label: "Automática" },
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

export const MODULE_CARD_BACKGROUNDS: { key: ModuleCardBackground; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "blanco", label: "Blanco" },
  { key: "suave-color", label: "Suave con color" },
  { key: "degradado", label: "Degradado sutil" },
  { key: "glass", label: "Glass" },
  { key: "solido", label: "Sólido" },
];

export const MODULE_CARD_BORDERS: { key: ModuleCardBorder; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "ninguno", label: "Ninguno" },
  { key: "suave", label: "Suave" },
  { key: "acento", label: "Acento" },
  { key: "superior", label: "Superior" },
  { key: "lateral", label: "Lateral" },
];

export const MODULE_CARD_SHADOWS: { key: ModuleCardShadow; label: string }[] = [
  { key: "auto", label: "Automática" },
  { key: "ninguna", label: "Ninguna" },
  { key: "suave", label: "Suave" },
  { key: "media", label: "Media" },
  { key: "elevada", label: "Elevada" },
];

export type ModuleSection = "dashboard-widget" | "module";

export interface ModuleIdentityDefinition {
  id: string;
  label: string;
  section: ModuleSection;
  defaultIdentity: ModuleIdentity;
}

function identity(partial: Partial<ModuleIdentity> & Pick<ModuleIdentity, "iconKey" | "color" | "initials" | "emoji">): ModuleIdentity {
  return {
    type: "icon",
    style: "solid-soft",
    shape: "square",
    hidden: false,
    iconPosition: "auto",
    iconSize: "auto",
    contentAlign: "auto",
    cardAppearance: "auto",
    cardBackground: "auto",
    cardBorder: "auto",
    cardShadow: "auto",
    ...partial,
  };
}

// Catálogo de identidad visual — hoy cubre los 8 widgets del Dashboard
// (section: "dashboard-widget", aplicados de verdad ahí) y 13 módulos del
// sistema (section: "module", listos para cuando esas pantallas tengan su
// propia identidad). Se espera que este catálogo siga creciendo: no se
// asume un número fijo de entradas.
export const MODULE_IDENTITY_REGISTRY: ModuleIdentityDefinition[] = [
  // Widgets del Dashboard
  { id: "kpi-citas", label: "Citas de hoy", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "CalendarCheck", color: "teal", emoji: "📅", initials: "CH" }) },
  { id: "kpi-cobrado", label: "Cobrado este mes", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "Wallet", color: "emerald", emoji: "💰", initials: "CM" }) },
  { id: "kpi-porcobrar", label: "Por cobrar", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "CircleDollarSign", color: "amber", emoji: "🧾", initials: "PC" }) },
  { id: "kpi-presupuestos", label: "Presupuestos pendientes", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "FileText", color: "violet", emoji: "📄", initials: "PP" }) },
  { id: "kpi-tratamientos", label: "Tratamientos activos", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "ClipboardList", color: "cyan", emoji: "📋", initials: "TA" }) },
  { id: "kpi-ingresos", label: "Ingresos del mes", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "TrendingUp", color: "emerald", emoji: "📈", initials: "IM" }) },
  { id: "kpi-punto-equilibrio", label: "Punto de equilibrio", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "Scale", color: "slate", emoji: "📊", initials: "PE" }) },
  { id: "kpi-meta-mensual", label: "Meta mensual", section: "dashboard-widget", defaultIdentity: identity({ iconKey: "Target", color: "rose", emoji: "🎯", initials: "MM" }) },

  // Módulos del sistema (identidad lista para cuando tengan su propio encabezado)
  { id: "module-pacientes", label: "Pacientes", section: "module", defaultIdentity: identity({ iconKey: "Users", color: "blue", emoji: "👥", initials: "PA" }) },
  { id: "module-agenda", label: "Agenda", section: "module", defaultIdentity: identity({ iconKey: "CalendarDays", color: "teal", emoji: "🗓️", initials: "AG" }) },
  { id: "module-consultas", label: "Consultas", section: "module", defaultIdentity: identity({ iconKey: "Stethoscope", color: "violet", emoji: "🩺", initials: "CO" }) },
  { id: "module-odontograma", label: "Odontograma", section: "module", defaultIdentity: identity({ iconKey: "Smile", color: "rose", emoji: "🦷", initials: "OD" }) },
  { id: "module-presupuestos", label: "Presupuestos", section: "module", defaultIdentity: identity({ iconKey: "Receipt", color: "amber", emoji: "🧾", initials: "PR" }) },
  { id: "module-cobros", label: "Cobros", section: "module", defaultIdentity: identity({ iconKey: "Landmark", color: "emerald", emoji: "🏦", initials: "CB" }) },
  { id: "module-documentos", label: "Documentos", section: "module", defaultIdentity: identity({ iconKey: "FolderOpen", color: "slate", emoji: "📁", initials: "DO" }) },
  { id: "module-portal", label: "Portal del paciente", section: "module", defaultIdentity: identity({ iconKey: "Globe", color: "cyan", emoji: "🧭", initials: "PT" }) },
  { id: "module-reportes", label: "Reportes", section: "module", defaultIdentity: identity({ iconKey: "ChartColumn", color: "violet", emoji: "📊", initials: "RX" }) },
  { id: "module-fiscal", label: "Fiscal", section: "module", defaultIdentity: identity({ iconKey: "FileSpreadsheet", color: "neutral", emoji: "🧮", initials: "FI" }) },
  { id: "module-inventario", label: "Inventario", section: "module", defaultIdentity: identity({ iconKey: "Boxes", color: "amber", emoji: "📦", initials: "IN" }) },
  { id: "module-seguimiento", label: "Seguimiento", section: "module", defaultIdentity: identity({ iconKey: "Bell", color: "rose", emoji: "🔔", initials: "SG" }) },
  { id: "module-configuracion", label: "Configuración", section: "module", defaultIdentity: identity({ iconKey: "Settings", color: "neutral", emoji: "⚙️", initials: "CF" }) },
];

// ============================================================
// FASE 1M-F — Paquetes de iconos completos (sencillo: "aplicar
// paquete" en vez de editar uno por uno). Cada paquete cambia tipo,
// estilo, posición, tamaño y color de los 8 widgets del Dashboard.
// ============================================================

export type ModuleIconPackageId =
  | "clinico"
  | "dental"
  | "belleza"
  | "taller"
  | "legal"
  | "educacion"
  | "comercio"
  | "wellness"
  | "creativo"
  | "minimal";

export interface ModuleIconPackage {
  key: ModuleIconPackageId;
  label: string;
  description: string;
  type: ModuleIdentityType;
  style: ModuleIconStyle;
  iconPosition: ModuleIconPosition;
  iconSize: ModuleIconSize;
  color: ModuleAccentColor;
}

export const MODULE_ICON_PACKAGES: ModuleIconPackage[] = [
  { key: "clinico", label: "Clínico", description: "Iconos lineales, claros y profesionales.", type: "icon", style: "outline", iconPosition: "top-right", iconSize: "normal", color: "teal" },
  { key: "dental", label: "Dental", description: "Emojis cuidados, look dental cercano.", type: "emoji", style: "emoji", iconPosition: "top-right", iconSize: "normal", color: "teal" },
  { key: "belleza", label: "Belleza", description: "Vidrio suave, icono grande al centro.", type: "icon", style: "glass", iconPosition: "center-large", iconSize: "large", color: "rose" },
  { key: "taller", label: "Taller", description: "Iconos sólidos tipo insignia.", type: "icon", style: "badge", iconPosition: "top-left", iconSize: "large", color: "amber" },
  { key: "legal", label: "Legal", description: "Sobrio, pequeño y ejecutivo.", type: "icon", style: "executive", iconPosition: "top-right", iconSize: "small", color: "slate" },
  { key: "educacion", label: "Educación", description: "Iconos grandes y amables.", type: "icon", style: "solid-soft", iconPosition: "center-large", iconSize: "hero", color: "violet" },
  { key: "comercio", label: "Comercio", description: "Iconos tipo insignia, listos para catálogo.", type: "icon", style: "badge", iconPosition: "top-right", iconSize: "normal", color: "amber" },
  { key: "wellness", label: "Wellness", description: "Suaves y frescos, icono protagonista.", type: "icon", style: "solid-soft", iconPosition: "center-large", iconSize: "large", color: "emerald" },
  { key: "creativo", label: "Creativo", description: "Duotono expresivo y grande.", type: "icon", style: "duotone", iconPosition: "center-large", iconSize: "hero", color: "rose" },
  { key: "minimal", label: "Minimal", description: "Pequeño, sobrio, casi invisible.", type: "icon", style: "minimal", iconPosition: "top-right", iconSize: "small", color: "slate" },
];

export const MODULE_IDENTITY_STORAGE_KEY = "nelzzon.moduleIdentity.v1";

type ModuleIdentityOverrides = Record<string, Partial<ModuleIdentity>>;

interface ModuleIdentityContextValue {
  registry: ModuleIdentityDefinition[];
  getIdentity: (id: string) => ModuleIdentity;
  setIdentity: (id: string, partial: Partial<ModuleIdentity>) => void;
  resetIdentity: (id: string) => void;
  /** Reinicia tipo/icono/emoji/iniciales/estilo/color/forma de todos los módulos, conservando visibilidad. */
  resetAllIcons: () => void;
  /** Reinicia por completo la identidad de todos los módulos, incluida la visibilidad. */
  resetAllIdentities: () => void;
  /** Aplica un paquete completo de iconos a los 8 widgets del Dashboard. */
  applyIconPackage: (key: ModuleIconPackageId) => void;
}

const ModuleIdentityContext = createContext<ModuleIdentityContextValue | null>(null);

const REGISTRY_BY_ID = new Map(MODULE_IDENTITY_REGISTRY.map((def) => [def.id, def]));

function readStoredOverrides(): ModuleIdentityOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MODULE_IDENTITY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ModuleIdentityOverrides;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function ModuleIdentityProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ModuleIdentityOverrides>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOverrides(readStoredOverrides());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MODULE_IDENTITY_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // localStorage no disponible — la personalización sigue activa en esta sesión.
    }
  }, [overrides, hydrated]);

  function getIdentity(id: string): ModuleIdentity {
    const def = REGISTRY_BY_ID.get(id);
    const base = def?.defaultIdentity ?? identity({ iconKey: "Settings", color: "neutral", emoji: "⭐", initials: "—" });
    return { ...base, ...(overrides[id] ?? {}) };
  }

  function setIdentity(id: string, partial: Partial<ModuleIdentity>) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  }

  function resetIdentity(id: string) {
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function resetAllIcons() {
    setOverrides((prev) => {
      const next: ModuleIdentityOverrides = {};
      for (const [id, override] of Object.entries(prev)) {
        const preserved: Partial<ModuleIdentity> = {};
        if (typeof override.hidden === "boolean") preserved.hidden = override.hidden;
        if (override.iconPosition !== undefined) preserved.iconPosition = override.iconPosition;
        if (override.iconSize !== undefined) preserved.iconSize = override.iconSize;
        if (override.contentAlign !== undefined) preserved.contentAlign = override.contentAlign;
        if (override.cardAppearance !== undefined) preserved.cardAppearance = override.cardAppearance;
        if (override.cardBackground !== undefined) preserved.cardBackground = override.cardBackground;
        if (override.cardBorder !== undefined) preserved.cardBorder = override.cardBorder;
        if (override.cardShadow !== undefined) preserved.cardShadow = override.cardShadow;
        if (Object.keys(preserved).length > 0) next[id] = preserved;
      }
      return next;
    });
  }

  function resetAllIdentities() {
    setOverrides({});
  }

  function applyIconPackage(key: ModuleIconPackageId) {
    const pkg = MODULE_ICON_PACKAGES.find((p) => p.key === key);
    if (!pkg) return;
    setOverrides((prev) => {
      const next = { ...prev };
      for (const def of MODULE_IDENTITY_REGISTRY) {
        if (def.section !== "dashboard-widget") continue;
        next[def.id] = {
          ...next[def.id],
          type: pkg.type,
          style: pkg.style,
          iconPosition: pkg.iconPosition,
          iconSize: pkg.iconSize,
          color: pkg.color,
        };
      }
      return next;
    });
  }

  const value: ModuleIdentityContextValue = {
    registry: MODULE_IDENTITY_REGISTRY,
    getIdentity,
    setIdentity,
    resetIdentity,
    resetAllIcons,
    resetAllIdentities,
    applyIconPackage,
  };

  return <ModuleIdentityContext.Provider value={value}>{children}</ModuleIdentityContext.Provider>;
}

export function useModuleIdentities(): ModuleIdentityContextValue {
  const ctx = useContext(ModuleIdentityContext);
  if (!ctx) throw new Error("useModuleIdentities debe usarse dentro de ModuleIdentityProvider");
  return ctx;
}
