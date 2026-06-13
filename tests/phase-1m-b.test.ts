// NELZZON — Pruebas Fase 1M-B (Personalizar Studio v1 completo, sin DB).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-1m-a.
// - visual-preferences: 6 presets (incluye "showcase"), applyPreset y
//   resetVisualPreferences.
// - PersonalizationPreviewCanvas: mini dashboard de ejemplo con
//   ModuleCard/KpiWidget/ChartPreviewCard, vive dentro del documento.
// - PersonalizationPanel: reorganizado en Estilo visual / Vista previa /
//   Dashboard / Acciones, con botón de reset.
// - globals.css: refuerzos por preset (showcase, kpi-dashboard, glass-soft,
//   ejecutivo) y hooks .dashboard-shell / .dashboard-grid.
// - Dashboard: usa los hooks visuales sin cambiar datos ni lógica.
// - Fuera de alcance: server, prisma, agenda, pacientes, cobros, presupuestos.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VISUAL_PREFS_PATH = resolve("src/lib/visual-preferences.tsx");
const MODULE_CARD_PATH = resolve("src/components/ui/module-card.tsx");
const KPI_WIDGET_PATH = resolve("src/components/ui/kpi-widget.tsx");
const CHART_PREVIEW_PATH = resolve("src/components/ui/chart-preview-card.tsx");
const PRESET_SELECTOR_PATH = resolve("src/components/shell/VisualPresetSelector.tsx");
const PREVIEW_CANVAS_PATH = resolve("src/components/shell/PersonalizationPreviewCanvas.tsx");
const PERSONALIZATION_PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const STYLE_WIZARD_PATH = resolve("src/components/shell/StyleWizard.tsx");
const PERSONALIZATION_DETAILS_PATH = resolve("src/components/shell/PersonalizationDetails.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");
const DASHBOARD_KPI_GRID_PATH = resolve("src/components/dashboard/DashboardKpiGrid.tsx");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");

const visualPrefsContent = readFileSync(VISUAL_PREFS_PATH, "utf-8");
const moduleCardContent = readFileSync(MODULE_CARD_PATH, "utf-8");
const kpiWidgetContent = readFileSync(KPI_WIDGET_PATH, "utf-8");
const chartPreviewContent = readFileSync(CHART_PREVIEW_PATH, "utf-8");
const presetSelectorContent = readFileSync(PRESET_SELECTOR_PATH, "utf-8");
const previewCanvasContent = readFileSync(PREVIEW_CANVAS_PATH, "utf-8");
const panelContent = readFileSync(PERSONALIZATION_PANEL_PATH, "utf-8");
const styleWizardContent = readFileSync(STYLE_WIZARD_PATH, "utf-8");
const personalizationDetailsContent = readFileSync(PERSONALIZATION_DETAILS_PATH, "utf-8");
const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const dashboardKpiGridContent = readFileSync(DASHBOARD_KPI_GRID_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

describe("1M-B — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("existe PersonalizationPreviewCanvas", () => {
    expect(existsSync(PREVIEW_CANVAS_PATH)).toBe(true);
  });
});

describe("1M-B — visual-preferences: 6 presets, applyPreset y reset", () => {
  it("declara los 6 presets requeridos, incluyendo showcase", () => {
    for (const preset of [
      "minimal-clinico",
      "premium-cards",
      "kpi-dashboard",
      "glass-soft",
      "ejecutivo",
      "showcase",
    ]) {
      expect(visualPrefsContent).toContain(`"${preset}"`);
    }
  });

  it("expone applyPreset y resetVisualPreferences en el contexto", () => {
    expect(visualPrefsContent).toContain("applyPreset");
    expect(visualPrefsContent).toContain("resetVisualPreferences");
  });

  it("resetVisualPreferences vuelve a DEFAULT_VISUAL_PREFERENCES", () => {
    expect(visualPrefsContent).toMatch(/resetVisualPreferences:\s*\(\)\s*=>\s*setPreferences\(DEFAULT_VISUAL_PREFERENCES\)/);
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(visualPrefsContent.split("\n")[0].trim()).toBe('"use client";');
    expect(visualPrefsContent).not.toMatch(/from\s+"@\/server/);
    expect(visualPrefsContent).not.toMatch(/prisma/i);
  });
});

describe("1M-B — PersonalizationPreviewCanvas", () => {
  it('es un componente cliente y exporta PersonalizationPreviewCanvas', () => {
    expect(previewCanvasContent.split("\n")[0].trim()).toBe('"use client";');
    expect(previewCanvasContent).toContain("export function PersonalizationPreviewCanvas");
  });

  it("usa ModuleCard, KpiWidget y ChartPreviewCard", () => {
    expect(previewCanvasContent).toMatch(/from\s+"@\/components\/ui\/module-card"/);
    expect(previewCanvasContent).toMatch(/from\s+"@\/components\/ui\/kpi-widget"/);
    expect(previewCanvasContent).toMatch(/from\s+"@\/components\/ui\/chart-preview-card"/);
    expect(previewCanvasContent).toContain("<ModuleCard");
    expect(previewCanvasContent).toContain("<KpiWidget");
    expect(previewCanvasContent).toContain("<ChartPreviewCard");
  });

  it("marca el contenido como vista previa / ejemplo, sin datos reales", () => {
    expect(previewCanvasContent.toLowerCase()).toMatch(/vista previa|ejemplo/);
  });

  it("no importa de server/prisma", () => {
    expect(previewCanvasContent).not.toMatch(/from\s+"@\/server/);
    expect(previewCanvasContent).not.toMatch(/prisma/i);
  });
});

describe("1M-B — VisualPresetSelector con 6 presets", () => {
  it("sigue usando useVisualPreferences y VISUAL_PRESET_KEYS (cubre los 6 presets dinámicamente)", () => {
    expect(presetSelectorContent).toContain("useVisualPreferences");
    expect(presetSelectorContent).toContain("VISUAL_PRESET_KEYS");
  });

  it("cada tarjeta de preset muestra acento y etiquetas de densidad/sombra/radio/estilo", () => {
    expect(presetSelectorContent).toContain("ACCENT_SWATCH_CLASS[preset.prefs.accent]");
    expect(presetSelectorContent).toContain("preset.prefs.density");
    expect(presetSelectorContent).toContain("preset.prefs.shadow");
    expect(presetSelectorContent).toContain("preset.prefs.radius");
    expect(presetSelectorContent).toContain("preset.prefs.cardStyle");
  });
});

describe("1M-B — Personalizar: estilo visual / vista previa / dashboard / acciones", () => {
  it("importa PersonalizationPreviewCanvas y useVisualPreferences", () => {
    expect(styleWizardContent).toMatch(/from\s+"@\/components\/shell\/PersonalizationPreviewCanvas"/);
    expect(styleWizardContent).toMatch(/from\s+"@\/lib\/visual-preferences"/);
  });

  it("renderiza VisualPresetSelector y PersonalizationPreviewCanvas", () => {
    expect(personalizationDetailsContent).toContain("<VisualPresetSelector");
    expect(styleWizardContent).toContain("<PersonalizationPreviewCanvas");
  });

  it("incluye un bloque de Acciones con reset (los widgets del Dashboard se personalizan en Acomodar, FASE 1M-F)", () => {
    expect(personalizationDetailsContent).toContain("resetVisualPreferences");
    expect(personalizationDetailsContent).toContain("Resetear diseño");
  });

  it('comunica que el guardado es local en este navegador', () => {
    expect(panelContent.toLowerCase()).toContain("en este navegador");
  });
});

describe("1M-B — globals.css: refuerzos por preset y hooks de Dashboard", () => {
  it('declara refuerzos para el preset "showcase"', () => {
    expect(globalsCssContent).toContain('[data-visual-preset="showcase"]');
  });

  it("declara hooks .dashboard-shell y .dashboard-grid para kpi-dashboard / glass-soft", () => {
    expect(globalsCssContent).toContain(".dashboard-grid");
    expect(globalsCssContent).toContain(".dashboard-shell");
    expect(globalsCssContent).toContain('[data-visual-preset="kpi-dashboard"] .dashboard-grid');
    expect(globalsCssContent).toContain('[data-visual-preset="glass-soft"] .dashboard-shell');
  });

  it("no elimina los tokens base de 1L-B (:root / .dark siguen intactos)", () => {
    expect(globalsCssContent).toContain("--brand-accent: oklch(0.58 0.10 232)");
    expect(globalsCssContent).toContain("--surface-elevated: oklch(1 0 0)");
    expect(globalsCssContent).toContain(".dark {");
  });
});

describe("1M-B — Dashboard usa los hooks visuales sin tocar datos/lógica", () => {
  it("page.tsx tiene las clases dashboard-shell y dashboard-grid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
  });

  it("conserva la llamada real a listAppointmentsByRange y el cálculo de Citas de hoy", () => {
    expect(dashboardPageContent).toContain("listAppointmentsByRange(run, ctx, {})");
    expect(dashboardKpiGridContent).toContain("appointmentsToday");
    expect(dashboardKpiGridContent).toContain("export function CitasHoyKpi");
  });

  it("DashboardKpiGrid sigue usando KpiWidget", () => {
    expect(dashboardKpiGridContent).toMatch(/from\s+"@\/components\/ui\/kpi-widget"/);
    expect(dashboardKpiGridContent).toContain("<KpiWidget");
  });
});

describe("1M-B — alcance: no toca server/prisma/agenda/pacientes/cobros/presupuestos", () => {
  it("los archivos nuevos/editados de la capa visual no importan de server/**", () => {
    for (const content of [visualPrefsContent, moduleCardContent, kpiWidgetContent, chartPreviewContent, presetSelectorContent, previewCanvasContent, panelContent]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
  });

  it("no se crearon/tocaron archivos de agenda, pacientes, cobros ni presupuestos", () => {
    expect(existsSync(resolve("src/components/agenda"))).toBe(true);
    expect(existsSync(resolve("src/components/patients"))).toBe(true);
  });
});
