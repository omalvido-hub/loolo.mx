"use client";

// Conversión 1:1 a componentes React del HTML aprobado en
// docs/visual-references/nelzzon-dashboard.html. Datos demo estáticos.
// No reutiliza AppShell/sidebar/topbar/dock/KpiWidget actuales — es una vista
// aislada para validar la migración visual.
//
// Panel "Personalizar tu sistema": estado en memoria + localStorage
// (clave PREFERENCES_STORAGE_KEY). Sin backend, sin queries.

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./zip-dashboard-react.module.css";
import {
  DEFAULT_PREFERENCES,
  GALLERY_BACKGROUNDS,
  MAX_BACKGROUND_IMAGE_BYTES,
  PATTERN_KEYS,
  PATTERN_LABELS,
  SOLID_BACKGROUNDS,
  deriveAccentSoft,
  getPatternBackground,
  isValidHex,
  loadPreferences,
  resetBackgroundPreferences,
  resetPreferences,
  savePreferences,
  type AccentKey,
  type BackgroundType,
  type DashboardPreferences,
  type GalleryBg,
  type GradientDirection,
  type PatternKey,
} from "./dashboard-preferences";

const NAV_ITEMS = [
  { icon: "ti-layout-dashboard", label: "Inicio", active: true },
  { icon: "ti-users", label: "Pacientes" },
  { icon: "ti-calendar", label: "Agenda" },
  { icon: "ti-stethoscope", label: "Consultas" },
  { icon: "ti-clipboard-list", label: "Tratamientos" },
  { icon: "ti-cash", label: "Cobros" },
];

const NAV_ITEMS_BOTTOM = [
  { icon: "ti-file-text", label: "Documentos" },
  { icon: "ti-chart-bar", label: "Reportes" },
  { icon: "ti-settings", label: "Configuración" },
];

const CARD_BG_SWATCHES = ["#ffffff", "#fafafa", "#f4f7ff", "#f3f9f5", "#1f2430"];

const SHORTCUTS = [
  { icon: "ti-users", color: "var(--sky)", label: "Pacientes" },
  { icon: "ti-calendar", color: "var(--violet)", label: "Agenda" },
  { icon: "ti-stethoscope", color: "var(--green)", label: "Consultas" },
  { icon: "ti-file-text", color: "var(--amber)", label: "Presupuestos" },
  { icon: "ti-cash", color: "var(--green)", label: "Cobros" },
  { icon: "ti-folder", color: "var(--rose)", label: "Documentos" },
  { icon: "ti-chart-bar", color: "var(--sky)", label: "Reportes" },
  { icon: "ti-world", color: "var(--violet)", label: "Portal" },
  { icon: "ti-plus", color: "var(--faint)", label: "Agregar" },
];

const SECTIONS = [
  { icon: "ti-palette", title: "Colores y fondos", subtitle: "Acento, fondo e imágenes", defaultOpen: true },
  { icon: "ti-layout-grid", title: "Tarjetas y widgets", subtitle: "Fondo, densidad y estilo", defaultOpen: true },
  { icon: "ti-brush", title: "Estilo general", subtitle: "Tema, bordes y ambiente", defaultOpen: false },
  { icon: "ti-icons", title: "Iconos", subtitle: "Estilo, tamaño y forma", defaultOpen: false },
  { icon: "ti-menu-2", title: "Accesos y menú", subtitle: "Módulos rápidos y barras", defaultOpen: false },
  { icon: "ti-typography", title: "Tipografía", subtitle: "Fuente, tamaño y legibilidad", defaultOpen: false },
];

// ---------- Preferencias "Personalizar" ----------

type CuratedAccentKey = Exclude<AccentKey, "personalizado">;

const ACCENT_MAP: Record<CuratedAccentKey, { accent: string; soft: string; label: string }> = {
  morado:  { accent: "#4f46e5", soft: "#eef2ff", label: "Morado" },
  azul:    { accent: "#0284c7", soft: "#eff8ff", label: "Azul" },
  verde:   { accent: "#059669", soft: "#ecfdf5", label: "Verde" },
  naranja: { accent: "#d97706", soft: "#fff7ed", label: "Naranja" },
  rosa:    { accent: "#e11d48", soft: "#fff1f3", label: "Rosa" },
  violeta: { accent: "#7c3aed", soft: "#f5f3ff", label: "Violeta" },
  aqua:    { accent: "#0891b2", soft: "#ecfeff", label: "Aqua" },
  grafito: { accent: "#475569", soft: "#f1f5f9", label: "Grafito" },
};

// Paleta curada por categoría — UI only, no se almacena
interface PaletteSwatch { value: string; soft: string; label: string; }
interface PaletteCategory { label: string; swatches: PaletteSwatch[]; }

const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    label: "Nelzzon",
    swatches: [
      { value: "#4f46e5", soft: "#eef2ff", label: "Índigo" },
      { value: "#0284c7", soft: "#eff8ff", label: "Azul" },
      { value: "#059669", soft: "#ecfdf5", label: "Verde" },
      { value: "#7c3aed", soft: "#f5f3ff", label: "Violeta" },
      { value: "#0891b2", soft: "#ecfeff", label: "Aqua" },
    ],
  },
  {
    label: "Pasteles",
    swatches: [
      { value: "#8b5cf6", soft: "#f5f3ff", label: "Lavanda" },
      { value: "#ec4899", soft: "#fdf2f8", label: "Rosa" },
      { value: "#14b8a6", soft: "#f0fdfa", label: "Teal" },
      { value: "#f59e0b", soft: "#fffbeb", label: "Ámbar" },
      { value: "#84cc16", soft: "#f7fee7", label: "Lima" },
    ],
  },
  {
    label: "Vibrantes",
    swatches: [
      { value: "#ef4444", soft: "#fef2f2", label: "Rojo" },
      { value: "#f97316", soft: "#fff7ed", label: "Naranja" },
      { value: "#eab308", soft: "#fefce8", label: "Amarillo" },
      { value: "#22c55e", soft: "#f0fdf4", label: "Verde vivo" },
      { value: "#3b82f6", soft: "#eff6ff", label: "Azul vivo" },
    ],
  },
  {
    label: "Neutros",
    swatches: [
      { value: "#475569", soft: "#f1f5f9", label: "Pizarra" },
      { value: "#64748b", soft: "#f8fafc", label: "Gris azulado" },
      { value: "#6b7280", soft: "#f9fafb", label: "Gris" },
      { value: "#57534e", soft: "#fafaf9", label: "Piedra" },
      { value: "#374151", soft: "#f9fafb", label: "Carbón" },
    ],
  },
  {
    label: "Profesionales",
    swatches: [
      { value: "#1e40af", soft: "#eff6ff", label: "Azul marino" },
      { value: "#15803d", soft: "#f0fdf4", label: "Verde botella" },
      { value: "#7e22ce", soft: "#faf5ff", label: "Ciruela" },
      { value: "#9f1239", soft: "#fff1f2", label: "Granate" },
      { value: "#0f766e", soft: "#f0fdfa", label: "Esmeralda" },
    ],
  },
];

// Categorías de galería agrupadas desde GALLERY_BACKGROUNDS
interface GalleryCategory { label: string; items: GalleryBg[]; }

const GALLERY_CAT_DEFS = [
  { label: "Minimal / limpio",    cat: "minimal" },
  { label: "Pastel / suave",      cat: "pastel" },
  { label: "Abstracto / premium", cat: "abstracto" },
  { label: "Ondas / fluidos",     cat: "ondas" },
  { label: "Glass / moderno",     cat: "glass" },
  { label: "Oscuro elegante",     cat: "oscuro" },
  { label: "Creativo / colorido", cat: "creativo" },
];

const GALLERY_CATEGORIES: GalleryCategory[] = GALLERY_CAT_DEFS.map(({ label, cat }) => ({
  label,
  items: GALLERY_BACKGROUNDS.filter((b) => b.category === cat),
}));

// Categorías de fondos sólidos para el drawer
const SOLID_CATEGORIES = [
  { label: "Claros",    keys: ["default", "blanco", "nieve", "perla"] },
  { label: "Pasteles",  keys: ["azulado", "menta-sol", "lavanda-sol", "durazno-sol"] },
  { label: "Neutros",   keys: ["calido", "arena", "pizarra", "piedra"] },
  { label: "Oscuros",   keys: ["azul-noche", "carbon", "bosque-n"] },
];

// ---------- Helpers de presentación ----------

function getAccentColors(p: DashboardPreferences): { accent: string; soft: string } {
  if (p.accent === "personalizado") {
    return { accent: p.customAccentColor, soft: deriveAccentSoft(p.customAccentColor) };
  }
  return ACCENT_MAP[p.accent as CuratedAccentKey];
}

function getMainBackgroundStyle(p: DashboardPreferences): CSSProperties {
  if (p.backgroundType === "imagen" && p.backgroundImage) {
    return {
      backgroundImage: `url(${p.backgroundImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (p.backgroundType === "manual") {
    return { background: `linear-gradient(${p.gradientDirection}, ${p.gradientFrom}, ${p.gradientTo})` };
  }
  if (p.backgroundType === "galeria") {
    const bg = GALLERY_BACKGROUNDS.find((b) => b.key === p.backgroundValue);
    return bg ? { background: bg.css } : {};
  }
  if (p.backgroundType === "patron") {
    const key = (PATTERN_KEYS as readonly string[]).includes(p.backgroundValue)
      ? (p.backgroundValue as PatternKey)
      : PATTERN_KEYS[0];
    return getPatternBackground(key);
  }
  // solido
  if (p.backgroundValue === "default") return {};
  const opt = SOLID_BACKGROUNDS.find((o) => o.key === p.backgroundValue);
  return opt ? { background: opt.value } : {};
}

const DENSITY_VARS: Record<DashboardPreferences["density"], { padCard: string; gap: string }> = {
  comodo:  { padCard: "20px", gap: "18px" },
  compact: { padCard: "12px", gap: "12px" },
  amplio:  { padCard: "28px", gap: "24px" },
};

const GRADIENT_DIR_LABELS: Record<GradientDirection, string> = {
  "135deg": "↘ 135°",
  "90deg":  "→ 90°",
  "180deg": "↓ 180°",
  "45deg":  "↗ 45°",
};

export function ZipDashboardReactClient() {
  const [sidebarGone, setSidebarGone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [openSections, setOpenSections] = useState(SECTIONS.map((s) => s.defaultOpen));
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hexDraft, setHexDraft] = useState(DEFAULT_PREFERENCES.customAccentColor);
  const [gradFromDraft, setGradFromDraft] = useState(DEFAULT_PREFERENCES.gradientFrom);
  const [gradToDraft, setGradToDraft] = useState(DEFAULT_PREFERENCES.gradientTo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    setHexDraft(loaded.customAccentColor);
    setGradFromDraft(loaded.gradientFrom);
    setGradToDraft(loaded.gradientTo);
  }, []);

  function toggleSection(index: number) {
    setOpenSections((prev) => prev.map((open, i) => (i === index ? !open : open)));
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      setUploadError("La imagen debe pesar menos de 200 KB.");
      e.target.value = "";
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setPrefs((p) => ({ ...p, backgroundImage: result }));
      }
    };
    reader.readAsDataURL(file);
  }

  function applyChanges() {
    savePreferences(prefs);
  }

  function resetAll() {
    const defaults = resetPreferences();
    setPrefs(defaults);
    setHexDraft(defaults.customAccentColor);
    setGradFromDraft(defaults.gradientFrom);
    setGradToDraft(defaults.gradientTo);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleResetBackground() {
    const reset = resetBackgroundPreferences(prefs);
    setPrefs(reset);
    setGradFromDraft(reset.gradientFrom);
    setGradToDraft(reset.gradientTo);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const accentColors = getAccentColors(prefs);
  const activeAccentHex = accentColors.accent;
  const density = DENSITY_VARS[prefs.density];

  const pageStyle: CSSProperties = {
    "--accent": accentColors.accent,
    "--accent-soft": accentColors.soft,
    "--pad-card": density.padCard,
    "--grid-gap": density.gap,
  } as CSSProperties;

  const bgTypeDefaults: Record<BackgroundType, string> = {
    solido:  "default",
    galeria: GALLERY_BACKGROUNDS[0]?.key ?? "min-1",
    patron:  PATTERN_KEYS[0],
    manual:  "",
    imagen:  "",
  };

  return (
    <div
      className={styles.page}
      style={pageStyle}
      data-card-style={prefs.cardStyle}
      data-icon-style={prefs.iconStyle}
      data-typography={prefs.typography}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.31.0/tabler-icons.min.css"
      />

      <div className={styles.shell}>
        {/* Sidebar */}
        <aside className={cn(styles.sidebar, sidebarGone && styles.sidebarGone)}>
          <div className={styles.brand}>
            <div className={styles.logo}>N</div>
            <b>nelzzon</b>
          </div>
          <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href="#" className={cn(styles.navLink, item.active && styles.navLinkActive)}>
                <i className={`ti ${item.icon}`} />
                {item.label}
              </a>
            ))}
            <div className={styles.navSep} />
            {NAV_ITEMS_BOTTOM.map((item) => (
              <a key={item.label} href="#" className={styles.navLink}>
                <i className={`ti ${item.icon}`} />
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.sideFoot}>
            Clínica Norte · Plan Pro
            <br />
            3 sillones activos
          </div>
        </aside>

        {/* Content */}
        <div className={styles.content}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Menú"
              onClick={() => setSidebarGone((v) => !v)}
            >
              <i className="ti ti-menu-2" />
            </button>
            <div className={styles.greet}>
              <i className="ti ti-sun" />
              <b>Buenos días, Oscar</b>
            </div>
            <div className={styles.search}>
              <i className="ti ti-search" />
              <input className={styles.searchInput} placeholder="Buscar pacientes, citas, tratamientos…" />
            </div>
            <div className={styles.topRight}>
              <button
                type="button"
                className={styles.btnAccent}
                aria-pressed={drawerOpen}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                <i className="ti ti-adjustments" />
                Personalizar
              </button>
              <div className={styles.user}>
                <div className={styles.avatar}>OM</div>
                <div className={styles.userName}>
                  <b>Oscar Malvido</b>
                  <span>Propietario</span>
                </div>
              </div>
            </div>
          </header>

          <div className={styles.main} style={getMainBackgroundStyle(prefs)}>
            {/* KPIs */}
            <div className={cn(styles.grid, styles.kpis)}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tSky)}>
                    <i className="ti ti-calendar-event" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Citas de hoy</div>
                <div className={styles.kval}>8</div>
                <div className={styles.ksub}>4 confirmadas · 2 por confirmar</div>
                <span className={cn(styles.badge, styles.bGreen)}>
                  <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
                  Activo
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tGreen)}>
                    <i className="ti ti-cash" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Cobrado este mes</div>
                <div className={styles.kval}>
                  $86,450<small>MXN</small>
                </div>
                <div className={styles.ksub}>
                  <span className={styles.delta}>+18%</span> vs. mes anterior
                </div>
                <span className={cn(styles.badge, styles.bGray)}>Objetivo $120,000</span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tViolet)}>
                    <i className="ti ti-dental" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Tratamientos activos</div>
                <div className={styles.kval}>23</div>
                <div className={styles.ksub}>12 en curso · 11 por iniciar</div>
                <span className={cn(styles.badge, styles.bSky)}>En progreso</span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tAccent)}>
                    <i className="ti ti-trending-up" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Ingresos del mes</div>
                <div className={styles.kval}>
                  $112,300<small>MXN</small>
                </div>
                <div className={styles.ksub}>
                  <span className={styles.delta}>+22%</span> vs. mes anterior
                </div>
                <span className={cn(styles.badge, styles.bGray)}>Objetivo $150,000</span>
              </div>
            </div>

            {/* Secondary row 1 */}
            <div className={cn(styles.grid, styles.row2)}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tAmber)}>
                    <i className="ti ti-file-invoice" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Por cobrar</div>
                <div className={styles.kval}>
                  $34,800<small>MXN</small>
                </div>
                <div className={styles.ksub}>7 pacientes · 12 documentos pendientes de pago</div>
                <span className={cn(styles.badge, styles.bAmber)}>
                  <i className="ti ti-clock" style={{ fontSize: 14 }} />
                  Pendiente
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tSky)}>
                    <i className="ti ti-target-arrow" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Meta mensual</div>
                <div className={styles.kval}>75%</div>
                <div className={styles.progress}>
                  <i className={styles.progressBar} style={{ width: "75%" }} />
                </div>
                <div className={styles.ksub}>$112,300 / $150,000</div>
              </div>
            </div>

            {/* Secondary row 2 */}
            <div className={cn(styles.grid, styles.row2)}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tGreen)}>
                    <i className="ti ti-scale" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Punto de equilibrio</div>
                <div className={styles.kval}>
                  $94,500<small>MXN</small>
                </div>
                <div className={styles.ksub}>78% alcanzado · cubres tus costos fijos del mes</div>
                <span className={cn(styles.badge, styles.bGreen)}>
                  <i className="ti ti-heart" style={{ fontSize: 14 }} />
                  Saludable
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tViolet)}>
                    <i className="ti ti-clipboard-list" />
                  </div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Presupuestos pendientes</div>
                <div className={styles.kval}>15</div>
                <div className={styles.ksub}>$56,200 MXN en total</div>
                <span className={cn(styles.badge, styles.bAmber)}>
                  <i className="ti ti-clock" style={{ fontSize: 14 }} />
                  Pendiente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personalizar drawer */}
        <aside className={cn(styles.drawer, drawerOpen && styles.drawerOpen)}>
          <div className={styles.drawerInner}>
            <div className={styles.drawerTop}>
              <b>
                <i className="ti ti-sparkles" />
                Personalizar tu sistema
              </b>
              <button
                type="button"
                className={styles.iconBtn}
                style={{ width: 34, height: 34, fontSize: 17 }}
                aria-label="Cerrar"
                onClick={() => setDrawerOpen(false)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.drawerBody}>
              <span className={styles.liveTag}>
                <span className={styles.liveDot} />
                En vivo · el tablero sigue visible
              </span>

              {SECTIONS.map((section, index) => (
                <div key={section.title} className={cn(styles.sect, openSections[index] && styles.sectOpen)}>
                  <div className={styles.sectHeader} onClick={() => toggleSection(index)}>
                    <div className={styles.sectIcon}>
                      <i className={`ti ${section.icon}`} />
                    </div>
                    <div className={styles.sectText}>
                      <b>{section.title}</b>
                      <span>{section.subtitle}</span>
                    </div>
                    <i className={cn("ti ti-chevron-down", styles.chev)} />
                  </div>
                  <div className={styles.sectContent}>

                    {/* ── 1. Colores y fondos ── */}
                    {index === 0 && (
                      <>
                        {/* ─ Color de acento ─ */}
                        <div className={styles.ctlLabel} style={{ marginTop: 4 }}>Color de acento</div>
                        {PALETTE_CATEGORIES.map((cat, catIdx) => (
                          <div key={cat.label}>
                            <div
                              className={styles.galleryCatLabel}
                              style={{ marginTop: catIdx === 0 ? 4 : 10 }}
                            >
                              {cat.label}
                            </div>
                            <div className={styles.swatchesWrap}>
                              {cat.swatches.map((sw) => (
                                <span
                                  key={sw.value}
                                  title={sw.label}
                                  className={cn(styles.sw, activeAccentHex === sw.value && styles.swOn)}
                                  style={{ background: sw.value }}
                                  onClick={() => {
                                    setPrefs((p) => ({ ...p, accent: "personalizado", customAccentColor: sw.value }));
                                    setHexDraft(sw.value);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* HEX personalizado */}
                        <div className={styles.hexInputRow} style={{ marginTop: 10 }}>
                          <span
                            className={styles.hexPreview}
                            style={{ background: isValidHex(hexDraft) ? hexDraft : prefs.customAccentColor }}
                          />
                          <input
                            type="text"
                            className={cn(
                              styles.hexInput,
                              hexDraft.length >= 4 && !isValidHex(hexDraft) && styles.hexInputError,
                            )}
                            value={hexDraft}
                            placeholder="#4f46e5"
                            maxLength={7}
                            spellCheck={false}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHexDraft(val);
                              if (isValidHex(val)) {
                                setPrefs((p) => ({ ...p, accent: "personalizado", customAccentColor: val }));
                              }
                            }}
                          />
                          {hexDraft.length >= 4 && !isValidHex(hexDraft) && (
                            <span className={styles.hexInputErrorMsg}>HEX inválido</span>
                          )}
                        </div>

                        {/* ─ Fondo ─ */}
                        <div className={styles.ctlLabel} style={{ marginTop: 18 }}>Fondo</div>
                        <div className={styles.seg}>
                          {(["solido", "galeria", "patron", "manual", "imagen"] as BackgroundType[]).map(
                            (type, i) => {
                              const labels = ["Sólido", "Galería", "Patrón", "Manual", "Imagen"];
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  className={cn(prefs.backgroundType === type && styles.segOn)}
                                  onClick={() =>
                                    setPrefs((p) => ({
                                      ...p,
                                      backgroundType: type,
                                      backgroundValue: bgTypeDefaults[type],
                                    }))
                                  }
                                >
                                  {labels[i]}
                                </button>
                              );
                            }
                          )}
                        </div>

                        {/* Sólido */}
                        {prefs.backgroundType === "solido" && (
                          <>
                            {SOLID_CATEGORIES.map((cat) => (
                              <div key={cat.label}>
                                <div className={styles.galleryCatLabel}>{cat.label}</div>
                                <div className={styles.swatchesWrap}>
                                  {cat.keys.map((k) => {
                                    const opt = SOLID_BACKGROUNDS.find((s) => s.key === k);
                                    if (!opt) return null;
                                    return (
                                      <span
                                        key={k}
                                        title={opt.label}
                                        className={cn(
                                          styles.bgsw,
                                          prefs.backgroundValue === k && styles.bgswOn,
                                        )}
                                        style={{
                                          background: opt.value === "transparent" ? "#f5f6f8" : opt.value,
                                        }}
                                        onClick={() => setPrefs((p) => ({ ...p, backgroundValue: k }))}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Galería */}
                        {prefs.backgroundType === "galeria" && (
                          <>
                            {GALLERY_CATEGORIES.map((cat) => (
                              <div key={cat.label}>
                                <div className={styles.galleryCatLabel}>{cat.label}</div>
                                <div className={styles.galleryGrid}>
                                  {cat.items.map((bg) => (
                                    <span
                                      key={bg.key}
                                      title={bg.label}
                                      className={cn(
                                        styles.galleryItem,
                                        prefs.backgroundValue === bg.key && styles.galleryItemOn,
                                      )}
                                      style={{ background: bg.css }}
                                      onClick={() => setPrefs((p) => ({ ...p, backgroundValue: bg.key }))}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Patrón */}
                        {prefs.backgroundType === "patron" && (
                          <div className={styles.wallpapers} style={{ marginTop: 10 }}>
                            {PATTERN_KEYS.map((key) => {
                              const pat = getPatternBackground(key);
                              return (
                                <span
                                  key={key}
                                  title={PATTERN_LABELS[key]}
                                  className={cn(styles.wp, prefs.backgroundValue === key && styles.wpOn)}
                                  style={{
                                    backgroundColor: pat.backgroundColor,
                                    backgroundImage: pat.backgroundImage,
                                    backgroundSize:  pat.backgroundSize,
                                  }}
                                  onClick={() => setPrefs((p) => ({ ...p, backgroundValue: key }))}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Degradado manual */}
                        {prefs.backgroundType === "manual" && (
                          <>
                            <div className={styles.ctlLabel} style={{ marginTop: 10 }}>Dirección</div>
                            <div className={styles.seg}>
                              {(["135deg", "90deg", "180deg", "45deg"] as GradientDirection[]).map((dir) => (
                                <button
                                  key={dir}
                                  type="button"
                                  className={cn(prefs.gradientDirection === dir && styles.segOn)}
                                  onClick={() => setPrefs((p) => ({ ...p, gradientDirection: dir }))}
                                >
                                  {GRADIENT_DIR_LABELS[dir]}
                                </button>
                              ))}
                            </div>
                            <div className={styles.gradientPair}>
                              <div className={styles.gradientColorItem}>
                                <div className={styles.ctlLabel} style={{ margin: "8px 0 5px" }}>Desde</div>
                                <div className={styles.hexInputRow}>
                                  <span
                                    className={styles.hexPreview}
                                    style={{
                                      background: isValidHex(gradFromDraft)
                                        ? gradFromDraft
                                        : prefs.gradientFrom,
                                    }}
                                  />
                                  <input
                                    type="text"
                                    className={cn(
                                      styles.hexInput,
                                      gradFromDraft.length >= 4 && !isValidHex(gradFromDraft) && styles.hexInputError,
                                    )}
                                    value={gradFromDraft}
                                    placeholder="#eef2ff"
                                    maxLength={7}
                                    spellCheck={false}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGradFromDraft(val);
                                      if (isValidHex(val)) setPrefs((p) => ({ ...p, gradientFrom: val }));
                                    }}
                                  />
                                </div>
                              </div>
                              <div className={styles.gradientColorItem}>
                                <div className={styles.ctlLabel} style={{ margin: "8px 0 5px" }}>Hasta</div>
                                <div className={styles.hexInputRow}>
                                  <span
                                    className={styles.hexPreview}
                                    style={{
                                      background: isValidHex(gradToDraft)
                                        ? gradToDraft
                                        : prefs.gradientTo,
                                    }}
                                  />
                                  <input
                                    type="text"
                                    className={cn(
                                      styles.hexInput,
                                      gradToDraft.length >= 4 && !isValidHex(gradToDraft) && styles.hexInputError,
                                    )}
                                    value={gradToDraft}
                                    placeholder="#f5f3ff"
                                    maxLength={7}
                                    spellCheck={false}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGradToDraft(val);
                                      if (isValidHex(val)) setPrefs((p) => ({ ...p, gradientTo: val }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div
                              className={styles.gradientPreviewRect}
                              style={{
                                background: `linear-gradient(${prefs.gradientDirection}, ${prefs.gradientFrom}, ${prefs.gradientTo})`,
                              }}
                            />
                          </>
                        )}

                        {/* Imagen propia */}
                        {prefs.backgroundType === "imagen" && (
                          <>
                            {prefs.backgroundImage ? (
                              <div className={styles.uploadImgRow}>
                                <div
                                  className={styles.uploadImgThumb}
                                  style={{
                                    backgroundImage: `url(${prefs.backgroundImage})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                />
                                <button
                                  type="button"
                                  className={styles.removeImgBtn}
                                  onClick={() => {
                                    setPrefs((p) => ({ ...p, backgroundImage: null }));
                                    setUploadError(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                  }}
                                >
                                  <i className="ti ti-trash" />
                                  Quitar imagen
                                </button>
                              </div>
                            ) : (
                              <label className={styles.upload} style={{ marginTop: 10 }}>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={handleImageUpload}
                                />
                                <i className="ti ti-photo-up" />
                                Subir tu imagen
                              </label>
                            )}
                            {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
                          </>
                        )}

                        {/* Volver al original */}
                        <button
                          type="button"
                          className={styles.bgResetBtn}
                          onClick={handleResetBackground}
                        >
                          <i className="ti ti-rotate" style={{ verticalAlign: -2 }} />
                          Quitar fondo / Volver al original
                        </button>
                      </>
                    )}

                    {/* ── 2. Tarjetas y widgets ── */}
                    {index === 1 && (
                      <>
                        <div className={styles.ctlLabel}>Fondo de las tarjetas</div>
                        <div className={styles.swatches} style={{ marginBottom: 16 }}>
                          {CARD_BG_SWATCHES.map((color) => (
                            <span key={color} className={styles.bgsw} style={{ background: color }} />
                          ))}
                        </div>
                        <div className={styles.ctlLabel}>Densidad</div>
                        <div className={styles.seg}>
                          <button
                            type="button"
                            className={cn(prefs.density === "comodo" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, density: "comodo" }))}
                          >
                            Cómodo
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.density === "compact" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, density: "compact" }))}
                          >
                            Compacto
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.density === "amplio" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, density: "amplio" }))}
                          >
                            Amplio
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── 3. Estilo general ── */}
                    {index === 2 && (
                      <>
                        <div className={styles.ctlLabel} style={{ paddingTop: 10 }}>
                          Bordes y sombras de las tarjetas
                        </div>
                        <div className={styles.seg}>
                          <button
                            type="button"
                            className={cn(prefs.cardStyle === "suave" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, cardStyle: "suave" }))}
                          >
                            Suave
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.cardStyle === "marcado" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, cardStyle: "marcado" }))}
                          >
                            Marcado
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.cardStyle === "minimal" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, cardStyle: "minimal" }))}
                          >
                            Minimal
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── 4. Iconos ── */}
                    {index === 3 && (
                      <>
                        <div className={styles.ctlLabel} style={{ paddingTop: 10 }}>
                          Forma y tamaño de los iconos
                        </div>
                        <div className={styles.seg}>
                          <button
                            type="button"
                            className={cn(prefs.iconStyle === "normal" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, iconStyle: "normal" }))}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.iconStyle === "redondo" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, iconStyle: "redondo" }))}
                          >
                            Redondo
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.iconStyle === "grande" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, iconStyle: "grande" }))}
                          >
                            Grande
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── 5. Accesos y menú ── */}
                    {index === 4 && (
                      <>
                        <div className={styles.ctlLabel} style={{ paddingTop: 10 }}>
                          Accesos directos (barra inferior)
                        </div>
                        <div className={styles.seg}>
                          <button
                            type="button"
                            className={cn(prefs.showDock && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, showDock: true }))}
                          >
                            Mostrar
                          </button>
                          <button
                            type="button"
                            className={cn(!prefs.showDock && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, showDock: false }))}
                          >
                            Ocultar
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── 6. Tipografía ── */}
                    {index === 5 && (
                      <>
                        <div className={styles.ctlLabel} style={{ paddingTop: 10 }}>
                          Tamaño de texto
                        </div>
                        <div className={styles.seg}>
                          <button
                            type="button"
                            className={cn(prefs.typography === "compacta" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, typography: "compacta" }))}
                          >
                            Compacta
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.typography === "normal" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, typography: "normal" }))}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            className={cn(prefs.typography === "grande" && styles.segOn)}
                            onClick={() => setPrefs((p) => ({ ...p, typography: "grande" }))}
                          >
                            Grande
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.drawerFoot}>
              <button type="button" className={styles.ghost} onClick={resetAll}>
                <i className="ti ti-rotate" style={{ verticalAlign: -2 }} /> Restablecer
              </button>
              <button type="button" className={styles.solid} onClick={applyChanges}>
                Aplicar cambios
              </button>
            </div>
          </div>
        </aside>

        {/* Accesos directos: fixed center pill + pop-up */}
        {prefs.showDock && (
          <div className={cn(styles.fabWrap, dockOpen && styles.fabWrapOpen)}>
            <div className={styles.fabPanel}>
              <div className={styles.fabGrid}>
                {SHORTCUTS.map((shortcut) => (
                  <a key={shortcut.label} className={styles.shortcut}>
                    <i className={`ti ${shortcut.icon}`} style={{ color: shortcut.color }} />
                    <span>{shortcut.label}</span>
                  </a>
                ))}
              </div>
            </div>
            <button type="button" className={styles.fabPill} onClick={() => setDockOpen((v) => !v)}>
              <i className="ti ti-bolt" />
              <span>Accesos directos</span>
              <i className={cn("ti ti-chevron-up", styles.dockChev)} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
