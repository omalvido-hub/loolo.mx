"use client";

// Conversión 1:1 a componentes React del HTML aprobado en
// docs/visual-references/nelzzon-dashboard.html. Datos demo estáticos.
// No reutiliza AppShell/sidebar/topbar/dock/KpiWidget actuales — es una vista
// aislada para validar la migración visual.
//
// Panel "Personalizar tu sistema": estado en memoria + localStorage
// (clave PREFERENCES_STORAGE_KEY). Sin backend, sin queries.

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./zip-dashboard-react.module.css";
import {
  DEFAULT_PREFERENCES,
  GALLERY_BACKGROUNDS,
  PATTERN_KEYS,
  SOLID_BACKGROUNDS,
  deriveAccentSoft,
  getPatternBackground,
  isValidHex,
  loadPreferences,
  resetPreferences,
  savePreferences,
  type AccentKey,
  type DashboardPreferences,
  type PatternKey,
} from "./dashboard-preferences";
import { ColorFondsSection } from "./ColorFondsSection";

const NAV_ITEMS = [
  { icon: "ti-layout-dashboard", label: "Inicio", active: true },
  { icon: "ti-users",            label: "Pacientes" },
  { icon: "ti-calendar",         label: "Agenda" },
  { icon: "ti-stethoscope",      label: "Consultas" },
  { icon: "ti-clipboard-list",   label: "Tratamientos" },
  { icon: "ti-cash",             label: "Cobros" },
];

const NAV_ITEMS_BOTTOM = [
  { icon: "ti-file-text",  label: "Documentos" },
  { icon: "ti-chart-bar",  label: "Reportes" },
  { icon: "ti-settings",   label: "Configuración" },
];

const CARD_BG_SWATCHES = ["#ffffff", "#fafafa", "#f4f7ff", "#f3f9f5", "#1f2430"];

const SHORTCUTS = [
  { icon: "ti-users",      color: "var(--sky)",    label: "Pacientes" },
  { icon: "ti-calendar",   color: "var(--violet)", label: "Agenda" },
  { icon: "ti-stethoscope",color: "var(--green)",  label: "Consultas" },
  { icon: "ti-file-text",  color: "var(--amber)",  label: "Presupuestos" },
  { icon: "ti-cash",       color: "var(--green)",  label: "Cobros" },
  { icon: "ti-folder",     color: "var(--rose)",   label: "Documentos" },
  { icon: "ti-chart-bar",  color: "var(--sky)",    label: "Reportes" },
  { icon: "ti-world",      color: "var(--violet)", label: "Portal" },
  { icon: "ti-plus",       color: "var(--faint)",  label: "Agregar" },
];

const SECTIONS = [
  { icon: "ti-palette",    title: "Colores y fondos",  subtitle: "Acento, fondo e imágenes",   defaultOpen: true },
  { icon: "ti-layout-grid",title: "Tarjetas y widgets",subtitle: "Fondo, densidad y estilo",   defaultOpen: true },
  { icon: "ti-brush",      title: "Estilo general",    subtitle: "Tema, bordes y ambiente",     defaultOpen: false },
  { icon: "ti-icons",      title: "Iconos",            subtitle: "Estilo, tamaño y forma",      defaultOpen: false },
  { icon: "ti-menu-2",     title: "Accesos y menú",    subtitle: "Módulos rápidos y barras",    defaultOpen: false },
  { icon: "ti-typography", title: "Tipografía",        subtitle: "Fuente, tamaño y legibilidad",defaultOpen: false },
];

// ---------- Preferencias: helpers de presentación ----------

type CuratedAccentKey = Exclude<AccentKey, "personalizado">;

const ACCENT_MAP: Record<CuratedAccentKey, { accent: string; soft: string }> = {
  morado:  { accent: "#4f46e5", soft: "#eef2ff" },
  azul:    { accent: "#0284c7", soft: "#eff8ff" },
  verde:   { accent: "#059669", soft: "#ecfdf5" },
  naranja: { accent: "#d97706", soft: "#fff7ed" },
  rosa:    { accent: "#e11d48", soft: "#fff1f3" },
  violeta: { accent: "#7c3aed", soft: "#f5f3ff" },
  aqua:    { accent: "#0891b2", soft: "#ecfeff" },
  grafito: { accent: "#475569", soft: "#f1f5f9" },
};

function getAccentColors(p: DashboardPreferences): { accent: string; soft: string } {
  if (p.accent === "personalizado") {
    return { accent: p.customAccentColor, soft: deriveAccentSoft(p.customAccentColor) };
  }
  return ACCENT_MAP[p.accent as CuratedAccentKey];
}

function getMainBackgroundStyle(p: DashboardPreferences): CSSProperties {
  if (p.backgroundType === "imagen" && p.backgroundImage) {
    return { backgroundImage: `url(${p.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" };
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
  if (isValidHex(p.backgroundValue)) return { background: p.backgroundValue };
  const opt = SOLID_BACKGROUNDS.find((o) => o.key === p.backgroundValue);
  return opt ? { background: opt.value } : {};
}

const DENSITY_VARS: Record<DashboardPreferences["density"], { padCard: string; gap: string }> = {
  comodo:  { padCard: "20px", gap: "18px" },
  compact: { padCard: "12px", gap: "12px" },
  amplio:  { padCard: "28px", gap: "24px" },
};

// ---------- Componente principal ----------

export function ZipDashboardReactClient() {
  const [sidebarGone,  setSidebarGone]  = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [dockOpen,     setDockOpen]     = useState(false);
  const [openSections, setOpenSections] = useState(SECTIONS.map((s) => s.defaultOpen));
  const [prefs,        setPrefs]        = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [resetKey,     setResetKey]     = useState(0);

  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  function toggleSection(index: number) {
    setOpenSections((prev) => prev.map((open, i) => (i === index ? !open : open)));
  }

  function applyChanges() { savePreferences(prefs); }

  function resetAll() {
    const defaults = resetPreferences();
    setPrefs(defaults);
    setResetKey((k) => k + 1); // remounts ColorFondsSection, resetting its local drafts
  }

  const accentColors    = getAccentColors(prefs);
  const activeAccentHex = accentColors.accent;
  const density         = DENSITY_VARS[prefs.density];

  const pageStyle: CSSProperties = {
    "--accent":      accentColors.accent,
    "--accent-soft": accentColors.soft,
    "--pad-card":    density.padCard,
    "--grid-gap":    density.gap,
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
                  <div className={cn(styles.tile, styles.tSky)}><i className="ti ti-calendar-event" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Citas de hoy</div>
                <div className={styles.kval}>8</div>
                <div className={styles.ksub}>4 confirmadas · 2 por confirmar</div>
                <span className={cn(styles.badge, styles.bGreen)}>
                  <i className="ti ti-circle-check" style={{ fontSize: 14 }} />Activo
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tGreen)}><i className="ti ti-cash" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Cobrado este mes</div>
                <div className={styles.kval}>$86,450<small>MXN</small></div>
                <div className={styles.ksub}><span className={styles.delta}>+18%</span> vs. mes anterior</div>
                <span className={cn(styles.badge, styles.bGray)}>Objetivo $120,000</span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tViolet)}><i className="ti ti-dental" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Tratamientos activos</div>
                <div className={styles.kval}>23</div>
                <div className={styles.ksub}>12 en curso · 11 por iniciar</div>
                <span className={cn(styles.badge, styles.bSky)}>En progreso</span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tAccent)}><i className="ti ti-trending-up" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Ingresos del mes</div>
                <div className={styles.kval}>$112,300<small>MXN</small></div>
                <div className={styles.ksub}><span className={styles.delta}>+22%</span> vs. mes anterior</div>
                <span className={cn(styles.badge, styles.bGray)}>Objetivo $150,000</span>
              </div>
            </div>

            {/* Row 2 */}
            <div className={cn(styles.grid, styles.row2)}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tAmber)}><i className="ti ti-file-invoice" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Por cobrar</div>
                <div className={styles.kval}>$34,800<small>MXN</small></div>
                <div className={styles.ksub}>7 pacientes · 12 documentos pendientes de pago</div>
                <span className={cn(styles.badge, styles.bAmber)}>
                  <i className="ti ti-clock" style={{ fontSize: 14 }} />Pendiente
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tSky)}><i className="ti ti-target-arrow" /></div>
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

            {/* Row 3 */}
            <div className={cn(styles.grid, styles.row2)}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tGreen)}><i className="ti ti-scale" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Punto de equilibrio</div>
                <div className={styles.kval}>$94,500<small>MXN</small></div>
                <div className={styles.ksub}>78% alcanzado · cubres tus costos fijos del mes</div>
                <span className={cn(styles.badge, styles.bGreen)}>
                  <i className="ti ti-heart" style={{ fontSize: 14 }} />Saludable
                </span>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={cn(styles.tile, styles.tViolet)}><i className="ti ti-clipboard-list" /></div>
                  <i className={cn("ti ti-info-circle", styles.info)} />
                </div>
                <div className={styles.klabel}>Presupuestos pendientes</div>
                <div className={styles.kval}>15</div>
                <div className={styles.ksub}>$56,200 MXN en total</div>
                <span className={cn(styles.badge, styles.bAmber)}>
                  <i className="ti ti-clock" style={{ fontSize: 14 }} />Pendiente
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
                    <div className={styles.sectIcon}><i className={`ti ${section.icon}`} /></div>
                    <div className={styles.sectText}>
                      <b>{section.title}</b>
                      <span>{section.subtitle}</span>
                    </div>
                    <i className={cn("ti ti-chevron-down", styles.chev)} />
                  </div>
                  <div className={styles.sectContent}>

                    {/* ── 1. Colores y fondos ── */}
                    {index === 0 && (
                      <ColorFondsSection
                        key={resetKey}
                        prefs={prefs}
                        setPrefs={setPrefs}
                        activeAccentHex={activeAccentHex}
                      />
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
                          {(["comodo", "compact", "amplio"] as const).map((d, i) => (
                            <button
                              key={d}
                              type="button"
                              className={cn(prefs.density === d && styles.segOn)}
                              onClick={() => setPrefs((p) => ({ ...p, density: d }))}
                            >
                              {["Cómodo", "Compacto", "Amplio"][i]}
                            </button>
                          ))}
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
                          {(["suave", "marcado", "minimal"] as const).map((s, i) => (
                            <button
                              key={s}
                              type="button"
                              className={cn(prefs.cardStyle === s && styles.segOn)}
                              onClick={() => setPrefs((p) => ({ ...p, cardStyle: s }))}
                            >
                              {["Suave", "Marcado", "Minimal"][i]}
                            </button>
                          ))}
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
                          {(["normal", "redondo", "grande"] as const).map((s, i) => (
                            <button
                              key={s}
                              type="button"
                              className={cn(prefs.iconStyle === s && styles.segOn)}
                              onClick={() => setPrefs((p) => ({ ...p, iconStyle: s }))}
                            >
                              {["Normal", "Redondo", "Grande"][i]}
                            </button>
                          ))}
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
                          {(["compacta", "normal", "grande"] as const).map((t, i) => (
                            <button
                              key={t}
                              type="button"
                              className={cn(prefs.typography === t && styles.segOn)}
                              onClick={() => setPrefs((p) => ({ ...p, typography: t }))}
                            >
                              {["Compacta", "Normal", "Grande"][i]}
                            </button>
                          ))}
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

        {/* Accesos directos: pill + pop-up */}
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
