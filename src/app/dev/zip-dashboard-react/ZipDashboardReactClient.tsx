"use client";

// Conversión 1:1 a componentes React del HTML aprobado en
// docs/visual-references/nelzzon-dashboard.html. Datos demo estáticos.
// No reutiliza AppShell/sidebar/topbar/dock/KpiWidget actuales — es una vista
// aislada para validar la migración visual.
//
// Panel "Personalizar tu sistema": estado en memoria + localStorage
// (clave PREFS_STORAGE_KEY). Sin backend, sin queries.

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./zip-dashboard-react.module.css";
import {
  DEFAULT_PREFERENCES,
  GRADIENT_BACKGROUNDS,
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
// El tipo, los valores por defecto y el storage versionado viven en
// ./dashboard-preferences.ts. Aquí solo queda el mapa de presentación (qué
// valores CSS corresponde a cada opción).

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
  if (p.backgroundType === "degradado") {
    if (p.gradientMode === "manual") {
      return { background: `linear-gradient(${p.gradientDirection}, ${p.gradientFrom}, ${p.gradientTo})` };
    }
    const opt = GRADIENT_BACKGROUNDS.find((o) => o.key === p.backgroundValue) ?? GRADIENT_BACKGROUNDS[0];
    return { background: opt.value };
  }
  if (p.backgroundType === "patron") {
    const key = (PATTERN_KEYS as readonly string[]).includes(p.backgroundValue)
      ? (p.backgroundValue as PatternKey)
      : PATTERN_KEYS[0];
    return getPatternBackground(key);
  }
  if (p.backgroundValue === "default") return {};
  const opt = SOLID_BACKGROUNDS.find((o) => o.key === p.backgroundValue);
  return opt ? { background: opt.value } : {};
}

const DENSITY_VARS: Record<DashboardPreferences["density"], { padCard: string; gap: string }> = {
  comodo: { padCard: "20px", gap: "18px" },
  compact: { padCard: "12px", gap: "12px" },
  amplio: { padCard: "28px", gap: "24px" },
};

export function ZipDashboardReactClient() {
  const [sidebarGone, setSidebarGone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [openSections, setOpenSections] = useState(SECTIONS.map((s) => s.defaultOpen));
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hexDraft, setHexDraft] = useState(DEFAULT_PREFERENCES.customAccentColor);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    setHexDraft(loaded.customAccentColor);
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
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const accentColors = getAccentColors(prefs);
  const density = DENSITY_VARS[prefs.density];

  const pageStyle: CSSProperties = {
    "--accent": accentColors.accent,
    "--accent-soft": accentColors.soft,
    "--pad-card": density.padCard,
    "--grid-gap": density.gap,
  } as CSSProperties;

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
                    {/* 1. Colores y fondos */}
                    {index === 0 && (
                      <>
                        {/* — Acento — */}
                        <div className={styles.ctlLabel}>Color de acento</div>
                        <div className={styles.swatchesWrap}>
                          {(Object.entries(ACCENT_MAP) as [CuratedAccentKey, typeof ACCENT_MAP[CuratedAccentKey]][]).map(
                            ([key, val]) => (
                              <span
                                key={key}
                                title={val.label}
                                className={cn(styles.sw, prefs.accent === key && styles.swOn)}
                                style={{ background: val.accent }}
                                onClick={() => setPrefs((p) => ({ ...p, accent: key }))}
                              />
                            )
                          )}
                          <span
                            title="Personalizado"
                            className={cn(styles.sw, styles.colorPickerSwatch, prefs.accent === "personalizado" && styles.swOn)}
                            style={{ background: prefs.customAccentColor }}
                          >
                            <input
                              type="color"
                              className={styles.colorPickerInput}
                              value={prefs.customAccentColor}
                              onChange={(e) => {
                                setPrefs((p) => ({ ...p, accent: "personalizado", customAccentColor: e.target.value }));
                                setHexDraft(e.target.value);
                              }}
                              title="Color personalizado"
                            />
                          </span>
                        </div>
                        <div className={styles.hexInputRow}>
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

                        {/* — Tipo de fondo — */}
                        <div className={styles.ctlLabel} style={{ marginTop: 16 }}>Tipo de fondo</div>
                        <div className={styles.seg}>
                          {(["solido", "degradado", "patron", "imagen"] as BackgroundType[]).map((type, i) => {
                            const labels = ["Sólido", "Degradado", "Patrón", "Imagen"];
                            const bgDefaults: Record<BackgroundType, string> = {
                              solido:    "default",
                              degradado: GRADIENT_BACKGROUNDS[0].key,
                              patron:    PATTERN_KEYS[0],
                              imagen:    "",
                            };
                            return (
                              <button
                                key={type}
                                type="button"
                                className={cn(prefs.backgroundType === type && styles.segOn)}
                                onClick={() =>
                                  setPrefs((p) => ({ ...p, backgroundType: type, backgroundValue: bgDefaults[type] }))
                                }
                              >
                                {labels[i]}
                              </button>
                            );
                          })}
                        </div>

                        {/* Sólido */}
                        {prefs.backgroundType === "solido" && (
                          <div className={styles.swatchesWrap} style={{ marginTop: 10 }}>
                            {SOLID_BACKGROUNDS.map((opt) => (
                              <span
                                key={opt.key}
                                title={opt.label}
                                className={cn(styles.bgsw, prefs.backgroundValue === opt.key && styles.bgswOn)}
                                style={{ background: opt.value === "transparent" ? "#f5f6f8" : opt.value }}
                                onClick={() => setPrefs((p) => ({ ...p, backgroundValue: opt.key }))}
                              />
                            ))}
                          </div>
                        )}

                        {/* Degradado */}
                        {prefs.backgroundType === "degradado" && (
                          <>
                            <div className={styles.seg} style={{ marginTop: 10 }}>
                              <button
                                type="button"
                                className={cn(prefs.gradientMode === "predefinido" && styles.segOn)}
                                onClick={() => setPrefs((p) => ({ ...p, gradientMode: "predefinido" }))}
                              >
                                Predefinido
                              </button>
                              <button
                                type="button"
                                className={cn(prefs.gradientMode === "manual" && styles.segOn)}
                                onClick={() => setPrefs((p) => ({ ...p, gradientMode: "manual" }))}
                              >
                                Manual
                              </button>
                            </div>
                            {prefs.gradientMode === "predefinido" && (
                              <div className={styles.wallpapers} style={{ marginTop: 10 }}>
                                {GRADIENT_BACKGROUNDS.map((opt) => (
                                  <span
                                    key={opt.key}
                                    title={opt.label}
                                    className={cn(styles.wp, prefs.backgroundValue === opt.key && styles.wpOn)}
                                    style={{ background: opt.value }}
                                    onClick={() => setPrefs((p) => ({ ...p, backgroundValue: opt.key }))}
                                  />
                                ))}
                              </div>
                            )}
                            {prefs.gradientMode === "manual" && (
                              <>
                              <div className={styles.ctlLabel} style={{ marginTop: 10 }}>Dirección</div>
                              <div className={styles.seg}>
                                {(["135deg", "90deg", "180deg", "45deg"] as GradientDirection[]).map((dir) => {
                                  const labels: Record<GradientDirection, string> = {
                                    "135deg": "↘ 135°",
                                    "90deg":  "→ 90°",
                                    "180deg": "↓ 180°",
                                    "45deg":  "↗ 45°",
                                  };
                                  return (
                                    <button
                                      key={dir}
                                      type="button"
                                      className={cn(prefs.gradientDirection === dir && styles.segOn)}
                                      onClick={() => setPrefs((p) => ({ ...p, gradientDirection: dir }))}
                                    >
                                      {labels[dir]}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className={styles.gradientPair}>
                                <div className={styles.gradientColorItem}>
                                  <div className={styles.ctlLabel}>Desde</div>
                                  <span
                                    className={styles.gradientColorSwatch}
                                    style={{ background: prefs.gradientFrom }}
                                  >
                                    <input
                                      type="color"
                                      className={styles.colorPickerInput}
                                      value={prefs.gradientFrom}
                                      onChange={(e) => setPrefs((p) => ({ ...p, gradientFrom: e.target.value }))}
                                    />
                                  </span>
                                </div>
                                <span className={styles.gradientArrow}>→</span>
                                <div className={styles.gradientColorItem}>
                                  <div className={styles.ctlLabel}>Hasta</div>
                                  <span
                                    className={styles.gradientColorSwatch}
                                    style={{ background: prefs.gradientTo }}
                                  >
                                    <input
                                      type="color"
                                      className={styles.colorPickerInput}
                                      value={prefs.gradientTo}
                                      onChange={(e) => setPrefs((p) => ({ ...p, gradientTo: e.target.value }))}
                                    />
                                  </span>
                                </div>
                                <div
                                  className={styles.gradientPreviewRect}
                                  style={{
                                    background: `linear-gradient(${prefs.gradientDirection}, ${prefs.gradientFrom}, ${prefs.gradientTo})`,
                                  }}
                                />
                              </div>
                              </>
                            )}
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

                        {/* Imagen */}
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
                          onClick={() => {
                            setPrefs((p) => resetBackgroundPreferences(p));
                            setUploadError(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <i className="ti ti-rotate" style={{ verticalAlign: -2 }} />
                          Quitar fondo / Volver al original
                        </button>
                      </>
                    )}

                    {/* 2. Tarjetas y widgets */}
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

                    {/* 3. Estilo general */}
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

                    {/* 4. Iconos */}
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

                    {/* 5. Accesos y menú */}
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

                    {/* 6. Tipografía */}
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
