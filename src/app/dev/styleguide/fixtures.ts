// Datos 100% estáticos/de ejemplo para /dev/styleguide.
// Basado únicamente en docs/NELZZON_STYLE_GUIDE.md (secciones 3 a 12) y
// docs/visual-references/nelzzon-dashboard.html. Sin conexión a backend.

export type IconName =
  | "layout-dashboard"
  | "users"
  | "calendar"
  | "stethoscope"
  | "clipboard-list"
  | "wallet"
  | "file-text"
  | "bar-chart"
  | "settings"
  | "menu"
  | "sun"
  | "search"
  | "sparkles"
  | "x"
  | "chevron-down"
  | "palette"
  | "layout-grid"
  | "info"
  | "trending-up"
  | "receipt"
  | "target"
  | "scale"
  | "heart"
  | "clock"
  | "check-circle"
  | "smile";

export type TileColor = "sky" | "green" | "violet" | "amber" | "rose" | "accent";
export type BadgeVariant = "green" | "amber" | "sky" | "gray";

export const PALETTE_TOKENS: Array<{ token: string; value: string; use: string }> = [
  { token: "--accent", value: "#4f46e5", use: "Color de marca / acción principal" },
  { token: "--accent-2", value: "#6366f1", use: "Variante de acento" },
  { token: "--accent-soft", value: "#eef2ff", use: "Fondo suave de acento" },
  { token: "--bg", value: "#f5f6f8", use: "Fondo general de la app" },
  { token: "--surface", value: "#ffffff", use: "Sidebar, topbar, tarjetas" },
  { token: "--ink", value: "#161a23", use: "Texto principal" },
  { token: "--muted", value: "#6b7280", use: "Texto secundario" },
  { token: "--faint", value: "#9aa1ad", use: "Texto terciario / iconos discretos" },
  { token: "--line", value: "#ecedf1", use: "Bordes suaves" },
  { token: "--line-2", value: "#e3e5ea", use: "Bordes de inputs/botones" },
  { token: "--green", value: "#059669", use: "Estado positivo" },
  { token: "--green-soft", value: "#ecfdf5", use: "Fondo estado positivo" },
  { token: "--amber", value: "#d97706", use: "Estado de advertencia" },
  { token: "--amber-soft", value: "#fff7ed", use: "Fondo estado advertencia" },
  { token: "--rose", value: "#e11d48", use: "Estado crítico/negativo" },
  { token: "--rose-soft", value: "#fff1f3", use: "Fondo estado crítico" },
  { token: "--violet", value: "#7c3aed", use: "Categoría secundaria (tratamientos)" },
  { token: "--violet-soft", value: "#f5f3ff", use: "Fondo categoría tratamientos" },
  { token: "--sky", value: "#0284c7", use: "Categoría secundaria (agenda/metas)" },
  { token: "--sky-soft", value: "#eff8ff", use: "Fondo categoría agenda/metas" },
];

export const TYPOGRAPHY_SAMPLES: Array<{
  label: string;
  spec: string;
  className: string;
  sample: string;
}> = [
  {
    label: "Valor KPI principal (.kval)",
    spec: "30px / peso 700 / letter-spacing -.02em",
    className: "text-[30px] font-bold tracking-[-0.02em]",
    sample: "$112,300",
  },
  {
    label: "Valor KPI compacto (.kval compact)",
    spec: "26px / peso 700",
    className: "text-[26px] font-bold tracking-[-0.02em]",
    sample: "$112,300",
  },
  {
    label: "Etiqueta de KPI (.klabel)",
    spec: "12.5px / peso 600 / mayúsculas / letter-spacing .02em",
    className: "text-[12.5px] font-semibold uppercase tracking-[0.02em]",
    sample: "Ingresos del mes",
  },
  {
    label: "Subtexto (.ksub)",
    spec: "13px / color muted",
    className: "text-[13px]",
    sample: "+22% vs. mes anterior (ejemplo)",
  },
  {
    label: "Marca sidebar (.brand b)",
    spec: "18px / peso 700",
    className: "text-[18px] font-bold tracking-[-0.02em]",
    sample: "nelzzon",
  },
  {
    label: "Enlace de navegación (.nav a)",
    spec: "14.5px / peso 500 (600 si activo)",
    className: "text-[14.5px] font-medium",
    sample: "Pacientes",
  },
  {
    label: "Saludo de topbar (.greet b)",
    spec: "16px / peso 600",
    className: "text-[16px] font-semibold",
    sample: "Buenos días, Oscar",
  },
  {
    label: "Texto de buscador/input",
    spec: "14.5px",
    className: "text-[14.5px]",
    sample: "Buscar pacientes, citas, tratamientos…",
  },
  {
    label: "Badge",
    spec: "12px / peso 600",
    className: "text-[12px] font-semibold",
    sample: "Activo",
  },
];

export const SPACING_TOKENS: Array<{ token: string; value: string; use: string }> = [
  { token: "--radius", value: "16px", use: "Radio estándar de tarjeta" },
  { token: "--pad-card", value: "20px", use: "Padding interno de tarjeta" },
  { token: "--side-w", value: "248px", use: "Ancho de sidebar" },
  { token: "Radio de botones/inputs", value: "11px–13px", use: ".btn-accent, .icon-btn, input, .sect" },
  { token: "Radio de badge", value: "8px", use: ".badge" },
  { token: "Radio de pill flotante", value: "999px", use: ".fab-pill" },
  { token: "Gap entre tarjetas", value: "18px", use: ".grid" },
  { token: "Padding de drawer", value: "18px 20px", use: ".drawer-body, .drawer-top" },
  { token: "Ancho de drawer abierto", value: "336px", use: ".drawer.open" },
];

export const ICON_SAMPLES: Array<{ name: IconName; label: string; size: number }> = [
  { name: "layout-dashboard", label: "Navegación (.nav a i) — 20px", size: 20 },
  { name: "trending-up", label: "Tile de tarjeta (.tile i) — 23px", size: 23 },
  { name: "menu", label: "Topbar (.icon-btn) — 19–21px", size: 20 },
  { name: "check-circle", label: "Icono de badge — 14px", size: 14 },
  { name: "palette", label: "Sección de drawer (.sect-h .si) — 17px", size: 17 },
];

type CardBadge = { variant: BadgeVariant; icon?: IconName; text: string };

export type KpiCard = {
  icon: IconName;
  tile: TileColor;
  label: string;
  value: string;
  suffix?: string;
  sub: string;
  delta?: string;
  progress?: number;
  badge?: CardBadge;
};

export const KPI_CARDS: KpiCard[] = [
  {
    icon: "calendar",
    tile: "sky",
    label: "Citas de hoy (ejemplo)",
    value: "8",
    sub: "4 confirmadas · 2 por confirmar",
    badge: { variant: "green", icon: "check-circle", text: "Activo" },
  },
  {
    icon: "wallet",
    tile: "green",
    label: "Cobrado este mes (ejemplo)",
    value: "$86,450",
    suffix: "MXN",
    sub: "vs. mes anterior (dato de ejemplo)",
    delta: "+18%",
    badge: { variant: "gray", text: "Objetivo $120,000 (ejemplo)" },
  },
  {
    icon: "smile",
    tile: "violet",
    label: "Tratamientos activos (ejemplo)",
    value: "23",
    sub: "12 en curso · 11 por iniciar",
    badge: { variant: "sky", text: "En progreso" },
  },
  {
    icon: "trending-up",
    tile: "accent",
    label: "Ingresos del mes (ejemplo)",
    value: "$112,300",
    suffix: "MXN",
    sub: "vs. mes anterior (dato de ejemplo)",
    delta: "+22%",
    badge: { variant: "gray", text: "Objetivo $150,000 (ejemplo)" },
  },
];

export const SECONDARY_CARDS_ROW1: KpiCard[] = [
  {
    icon: "receipt",
    tile: "amber",
    label: "Por cobrar (ejemplo)",
    value: "$34,800",
    suffix: "MXN",
    sub: "7 pacientes · 12 documentos pendientes (ejemplo)",
    badge: { variant: "amber", icon: "clock", text: "Pendiente" },
  },
  {
    icon: "target",
    tile: "sky",
    label: "Meta mensual (ejemplo)",
    value: "75%",
    sub: "$112,300 / $150,000 (ejemplo)",
    progress: 75,
  },
];

export const SECONDARY_CARDS_ROW2: KpiCard[] = [
  {
    icon: "scale",
    tile: "green",
    label: "Punto de equilibrio (ejemplo)",
    value: "$94,500",
    suffix: "MXN",
    sub: "78% alcanzado (ejemplo)",
    badge: { variant: "green", icon: "heart", text: "Saludable" },
  },
  {
    icon: "clipboard-list",
    tile: "violet",
    label: "Presupuestos pendientes (ejemplo)",
    value: "15",
    sub: "$56,200 MXN en total (ejemplo)",
    badge: { variant: "amber", icon: "clock", text: "Pendiente" },
  },
];

export const BADGE_SAMPLES: CardBadge[] = [
  { variant: "green", icon: "check-circle", text: "Activo" },
  { variant: "amber", icon: "clock", text: "Pendiente" },
  { variant: "sky", text: "En progreso" },
  { variant: "gray", text: "Objetivo $X (ejemplo)" },
];

export const SIDEBAR_NAV: Array<{ icon?: IconName; label?: string; active?: boolean; sep?: boolean }> = [
  { icon: "layout-dashboard", label: "Inicio", active: true },
  { icon: "users", label: "Pacientes" },
  { icon: "calendar", label: "Agenda" },
  { icon: "stethoscope", label: "Consultas" },
  { icon: "clipboard-list", label: "Tratamientos" },
  { icon: "wallet", label: "Cobros" },
  { sep: true },
  { icon: "file-text", label: "Documentos" },
  { icon: "bar-chart", label: "Reportes" },
  { icon: "settings", label: "Configuración" },
];

export const DRAWER_SECTIONS: Array<{
  icon: IconName;
  title: string;
  subtitle: string;
  defaultOpen: boolean;
}> = [
  { icon: "palette", title: "Colores y fondos", subtitle: "Acento y fondo (ejemplo)", defaultOpen: true },
  { icon: "layout-grid", title: "Tarjetas y widgets", subtitle: "Densidad y estilo (ejemplo)", defaultOpen: false },
];
