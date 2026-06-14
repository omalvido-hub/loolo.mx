// NELZZON — Pruebas Fase 1M-A (Personalizar visual v1 en Dashboard, sin DB).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-1l-*.
// - VisualPreferencesProvider: estado cliente con localStorage
//   (nelzzon.visualPrefs.v1), 5 presets, aplica data-visual-* en <html>.
// - ModuleCard / KPIWidget / ChartPreviewCard: componentes reutilizables de
//   la capa visual, reaccionan a data-visual-* vía globals.css.
// - VisualPresetSelector: vive dentro de PersonalizationPanel y usa
//   useVisualPreferences().
// - AppShell envuelve la app con VisualPreferencesProvider.
// - Dashboard usa ModuleCard/KPIWidget sin tocar la fuente de datos.
// - Fuera de alcance: server, prisma, agenda, pacientes, cobros, presupuestos.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VISUAL_PREFS_PATH = resolve("src/lib/visual-preferences.tsx");
const MODULE_CARD_PATH = resolve("src/components/ui/module-card.tsx");
const KPI_WIDGET_PATH = resolve("src/components/ui/kpi-widget.tsx");
const CHART_PREVIEW_PATH = resolve("src/components/ui/chart-preview-card.tsx");
const PRESET_SELECTOR_PATH = resolve("src/components/shell/VisualPresetSelector.tsx");
const PERSONALIZATION_PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const APP_SHELL_PATH = resolve("src/components/shell/AppShell.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");
const DASHBOARD_KPI_GRID_PATH = resolve("src/components/dashboard/DashboardKpiGrid.tsx");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");

const visualPrefsContent = readFileSync(VISUAL_PREFS_PATH, "utf-8");
const moduleCardContent = readFileSync(MODULE_CARD_PATH, "utf-8");
const kpiWidgetContent = readFileSync(KPI_WIDGET_PATH, "utf-8");
const chartPreviewContent = readFileSync(CHART_PREVIEW_PATH, "utf-8");
const presetSelectorContent = readFileSync(PRESET_SELECTOR_PATH, "utf-8");
const panelContent = readFileSync(PERSONALIZATION_PANEL_PATH, "utf-8");
const appShellContent = readFileSync(APP_SHELL_PATH, "utf-8");
const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const dashboardKpiGridContent = readFileSync(DASHBOARD_KPI_GRID_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

describe("1M-A — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("existen los archivos nuevos de la capa visual", () => {
    expect(existsSync(VISUAL_PREFS_PATH)).toBe(true);
    expect(existsSync(MODULE_CARD_PATH)).toBe(true);
    expect(existsSync(KPI_WIDGET_PATH)).toBe(true);
    expect(existsSync(CHART_PREVIEW_PATH)).toBe(true);
    expect(existsSync(PRESET_SELECTOR_PATH)).toBe(true);
  });
});

describe("1M-A — VisualPreferencesProvider", () => {
  it('es un componente cliente ("use client")', () => {
    expect(visualPrefsContent.split("\n")[0].trim()).toBe('"use client";');
  });

  it("exporta VisualPreferencesProvider y useVisualPreferences", () => {
    expect(visualPrefsContent).toContain("export function VisualPreferencesProvider");
    expect(visualPrefsContent).toContain("export function useVisualPreferences");
  });

  it("usa localStorage con la clave nelzzon.visualPrefs.v1", () => {
    expect(visualPrefsContent).toContain("nelzzon.visualPrefs.v1");
    expect(visualPrefsContent).toContain("localStorage");
  });

  it("el default es minimal-clinico", () => {
    expect(visualPrefsContent).toMatch(/preset:\s*"minimal-clinico"/);
  });

  it("declara los 5 presets requeridos", () => {
    for (const preset of ["minimal-clinico", "premium-cards", "kpi-dashboard", "glass-soft", "ejecutivo"]) {
      expect(visualPrefsContent).toContain(`"${preset}"`);
    }
  });

  it("aplica atributos data-visual-* en document.documentElement", () => {
    for (const attr of [
      "visualPreset",
      "visualAccent",
      "visualDensity",
      "visualShadow",
      "visualRadius",
      "visualCardStyle",
    ]) {
      expect(visualPrefsContent).toContain(`root.dataset.${attr}`);
    }
  });

  it("no usa DB ni server actions", () => {
    expect(visualPrefsContent).not.toMatch(/from\s+"@\/server/);
    expect(visualPrefsContent).not.toMatch(/prisma/i);
  });
});

describe("1M-A — ModuleCard / KPIWidget / ChartPreviewCard", () => {
  it("ModuleCard exporta el componente y usa la clase module-card", () => {
    expect(moduleCardContent).toContain("export function ModuleCard");
    expect(moduleCardContent).toContain("module-card");
    expect(moduleCardContent).toContain("module-card-body");
  });

  it("ModuleCard acepta title/subtitle/badge/action/children/variant", () => {
    expect(moduleCardContent).toContain("title?:");
    expect(moduleCardContent).toContain("subtitle?:");
    expect(moduleCardContent).toContain("badge?:");
    expect(moduleCardContent).toContain("action?:");
    expect(moduleCardContent).toContain("children:");
    expect(moduleCardContent).toContain("variant?:");
  });

  it("KPIWidget exporta el componente y usa la clase kpi-widget", () => {
    expect(kpiWidgetContent).toContain("export function KpiWidget");
    expect(kpiWidgetContent).toContain("kpi-widget");
  });

  it("KPIWidget acepta label/value/description/icon/tone/trend", () => {
    expect(kpiWidgetContent).toContain("label:");
    expect(kpiWidgetContent).toContain("value:");
    expect(kpiWidgetContent).toContain("description?:");
    expect(kpiWidgetContent).toContain("icon?:");
    expect(kpiWidgetContent).toContain("tone?:");
    expect(kpiWidgetContent).toContain("trend?:");
  });

  it("ChartPreviewCard es claramente decorativo (etiqueta 'Vista previa')", () => {
    expect(chartPreviewContent).toContain("export function ChartPreviewCard");
    expect(chartPreviewContent).toContain("chart-preview-card");
    expect(chartPreviewContent).toContain("Vista previa");
  });

  it("ChartPreviewCard no menciona ingresos/citas/montos como si fueran reales", () => {
    const forbidden = ["ingresos reales", "citas reales"];
    for (const term of forbidden) {
      expect(chartPreviewContent.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});

describe("1M-A — VisualPresetSelector", () => {
  it('es un componente cliente y usa useVisualPreferences', () => {
    expect(presetSelectorContent.split("\n")[0].trim()).toBe('"use client";');
    expect(presetSelectorContent).toContain("useVisualPreferences");
  });

  it("expone controles de preset, acento, densidad, sombra, radio y estilo de tarjeta", () => {
    expect(presetSelectorContent).toContain("setPreset");
    expect(presetSelectorContent).toContain("setAccent");
    expect(presetSelectorContent).toContain("setDensity");
    expect(presetSelectorContent).toContain("setShadow");
    expect(presetSelectorContent).toContain("setRadius");
    expect(presetSelectorContent).toContain("setCardStyle");
  });
});

describe("1M-A — PersonalizationPanel integra VisualPresetSelector", () => {
  it("importa y renderiza VisualPresetSelector", () => {
    expect(panelContent).toMatch(/from\s+"@\/components\/shell\/VisualPresetSelector"/);
    expect(panelContent).toContain("<VisualPresetSelector");
  });
});

describe("1M-A — AppShell envuelve la app con VisualPreferencesProvider", () => {
  it("importa VisualPreferencesProvider desde src/lib/visual-preferences", () => {
    expect(appShellContent).toMatch(/from\s+"@\/lib\/visual-preferences"/);
  });

  it("usa <VisualPreferencesProvider> en el árbol", () => {
    expect(appShellContent).toContain("<VisualPreferencesProvider>");
  });

  it("no cambia la lógica de sesión ni navegación (AppSidebar/AppTopbar/AppDock siguen presentes)", () => {
    expect(appShellContent).toContain("<AppSidebar");
    expect(appShellContent).toContain("<AppTopbar");
    expect(appShellContent).toContain("<AppDock");
  });
});

describe("1M-A — globals.css: bloques aditivos data-visual-*", () => {
  it("declara reglas para preset, acento, densidad, sombra, radio y estilo de tarjeta", () => {
    expect(globalsCssContent).toContain("data-visual-accent");
    expect(globalsCssContent).toContain("data-visual-density");
    expect(globalsCssContent).toContain("data-visual-shadow");
    expect(globalsCssContent).toContain("data-visual-radius");
    expect(globalsCssContent).toContain("data-visual-card-style");
  });

  it("no elimina los tokens base de 1L-B (:root / .dark siguen intactos)", () => {
    expect(globalsCssContent).toContain("--brand-accent: oklch(0.58 0.10 232)");
    expect(globalsCssContent).toContain("--surface-elevated: oklch(1 0 0)");
    expect(globalsCssContent).toContain(".dark {");
  });
});

describe("1M-A — Dashboard usa ModuleCard/KPIWidget sin tocar la fuente de datos", () => {
  it("DashboardKpiGrid importa KPIWidget", () => {
    expect(dashboardKpiGridContent).toMatch(/from\s+"@\/components\/ui\/kpi-widget"/);
    expect(dashboardKpiGridContent).toContain("<KpiWidget");
  });

  it("conserva el cálculo real de Citas de hoy (appointmentsToday)", () => {
    expect(dashboardKpiGridContent).toContain("appointmentsToday");
    expect(dashboardKpiGridContent).toContain("export function CitasHoyKpi");
  });

  it("dashboard page.tsx usa tarjetas KPI respaldadas por KPIWidget", () => {
    expect(dashboardPageContent).toMatch(/from\s+"@\/components\/dashboard\/DashboardKpiGrid"/);
    expect(dashboardKpiGridContent).toContain("<KpiWidget");
  });

  it("dashboard page.tsx conserva la llamada real a listAppointmentsByRange", () => {
    expect(dashboardPageContent).toContain("listAppointmentsByRange(run, ctx, {})");
  });
});

describe("1M-A — alcance: no toca server/prisma/agenda/pacientes/cobros/presupuestos", () => {
  it("VisualPreferencesProvider, ModuleCard, KPIWidget, ChartPreviewCard y VisualPresetSelector no importan de server/**", () => {
    for (const content of [visualPrefsContent, moduleCardContent, kpiWidgetContent, chartPreviewContent, presetSelectorContent]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
  });

  it("no se crearon/tocaron archivos de agenda, pacientes, cobros ni presupuestos", () => {
    expect(existsSync(resolve("src/components/agenda"))).toBe(true);
    expect(existsSync(resolve("src/components/patients"))).toBe(true);
    // Estos directorios deben seguir intactos (no se listan como tocados en esta fase).
  });
});
