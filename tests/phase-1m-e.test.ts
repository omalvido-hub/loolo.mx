// NELZZON — Pruebas Fase 1M-E (Diseño premium personalizable por categorías
// de negocio, local, sin DB). Estructurales por readFileSync, siguiendo el
// patrón de tests/phase-1m-a/b/c/d.
// - visual-preferences: BUSINESS_VISUAL_TEMPLATES (≥10), BACKGROUND_GALLERY
//   (≥30), MODULE_TILE_STYLES, DASHBOARD_CARD_STYLES, DOCK_STYLES y sus
//   setters/aplicadores/reset.
// - BackgroundCustomizer: galería visual de fondos.
// - ModuleIdentityCustomizer: estilo de módulos + controles avanzados por widget.
// - KpiWidget / DashboardKpiGrid: soporte de icon position/size, watermark,
//   center-large, "sin icono", apariencia/fondo/borde/sombra de tarjeta.
// - PersonalizationPanel: plantillas de negocio, dock, buscador ampliado.
// - globals.css: reglas para todo lo anterior.
// - Sin textos bloqueados, sin imports de @/server, Prisma/migraciones intactos.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VISUAL_PREFS_PATH = resolve("src/lib/visual-preferences.tsx");
const MODULE_IDENTITY_PATH = resolve("src/lib/module-identity.tsx");
const BACKGROUND_CUSTOMIZER_PATH = resolve("src/components/shell/BackgroundCustomizer.tsx");
const MODULE_IDENTITY_CUSTOMIZER_PATH = resolve("src/components/shell/ModuleIdentityCustomizer.tsx");
const PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const KPI_WIDGET_PATH = resolve("src/components/ui/kpi-widget.tsx");
const DASHBOARD_KPI_GRID_PATH = resolve("src/components/dashboard/DashboardKpiGrid.tsx");
const APP_DOCK_PATH = resolve("src/components/shell/AppDock.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const visualPrefsContent = readFileSync(VISUAL_PREFS_PATH, "utf-8");
const moduleIdentityContent = readFileSync(MODULE_IDENTITY_PATH, "utf-8");
const backgroundCustomizerContent = readFileSync(BACKGROUND_CUSTOMIZER_PATH, "utf-8");
const moduleIdentityCustomizerContent = readFileSync(MODULE_IDENTITY_CUSTOMIZER_PATH, "utf-8");
const panelContent = readFileSync(PANEL_PATH, "utf-8");
const kpiWidgetContent = readFileSync(KPI_WIDGET_PATH, "utf-8");
const dashboardKpiGridContent = readFileSync(DASHBOARD_KPI_GRID_PATH, "utf-8");
const appDockContent = readFileSync(APP_DOCK_PATH, "utf-8");
const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");

describe("1M-E — 1. registro de plantillas de negocio existe", () => {
  it("declara BUSINESS_VISUAL_TEMPLATES y BUSINESS_TEMPLATE_KEYS", () => {
    expect(visualPrefsContent).toContain("BUSINESS_VISUAL_TEMPLATES");
    expect(visualPrefsContent).toContain("BUSINESS_TEMPLATE_KEYS");
  });
});

describe("1M-E — 2. al menos 10 plantillas de negocio", () => {
  it("tiene 10 o más entradas en BUSINESS_VISUAL_TEMPLATES", () => {
    const matches = visualPrefsContent.match(/"?[a-z0-9-]+"?:\s*\{\s*\n\s*label:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });
});

describe("1M-E — 3. incluye categorías estética, taller, médico/dental, ejecutivo y educación", () => {
  it("contiene las claves esperadas", () => {
    for (const key of [
      "clinico-limpio",
      "dental-premium",
      "estetica-belleza",
      "taller-tecnico",
      "ejecutivo-legal",
      "educacion",
    ]) {
      expect(visualPrefsContent).toContain(`"${key}"`);
    }
  });

  it("cada plantilla describe su uso (campo usage)", () => {
    expect(visualPrefsContent).toContain("usage:");
  });
});

describe("1M-E — 4. BackgroundCustomizer: galería con 30 o más presets", () => {
  it("BACKGROUND_GALLERY tiene 30 o más entradas", () => {
    const matches = visualPrefsContent.match(/\{\s*id:\s*"[a-z0-9-]+",\s*label:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(30);
  });

  it("BackgroundCustomizer renderiza la galería con thumbnail, label y estado seleccionado", () => {
    expect(backgroundCustomizerContent).toContain("BACKGROUND_GALLERY");
    expect(backgroundCustomizerContent).toContain("BACKGROUND_GALLERY_CATEGORIES");
    expect(backgroundCustomizerContent).toContain("entry.preview");
    expect(backgroundCustomizerContent).toContain("entry.label");
    expect(backgroundCustomizerContent).toContain("setBackgroundPresetId");
    expect(backgroundCustomizerContent).toContain("preferences.backgroundPresetId");
  });
});

describe("1M-E — 5. ModuleIdentityCustomizer: estilo de módulos y tarjetas KPI", () => {
  it("incluye sección de estilo de módulos con MODULE_TILE_STYLES en PersonalizationPanel", () => {
    expect(panelContent).toContain("MODULE_TILE_STYLES");
    expect(panelContent).toContain("setModuleTileStyle");
    expect(panelContent).toContain("Estilo de módulos");
  });

  it("incluye controles avanzados de tarjeta por widget", () => {
    for (const token of [
      "MODULE_ICON_POSITIONS",
      "MODULE_ICON_SIZES",
      "MODULE_CONTENT_ALIGNS",
      "MODULE_CARD_APPEARANCES",
      "MODULE_CARD_BACKGROUNDS",
      "MODULE_CARD_BORDERS",
      "MODULE_CARD_SHADOWS",
    ]) {
      expect(moduleIdentityCustomizerContent).toContain(token);
    }
  });
});

describe("1M-E — 6. KpiWidget / DashboardKpiGrid: posición de icono", () => {
  it("KpiWidget acepta iconPosition con los 7 valores esperados", () => {
    expect(kpiWidgetContent).toContain("iconPosition");
    for (const value of ["auto", "top-right", "top-left", "top-center", "center-large", "watermark", "none"]) {
      expect(moduleIdentityContent).toContain(`"${value}"`);
    }
  });

  it("DashboardKpiGrid pasa identity.iconPosition/iconSize a KpiWidget", () => {
    expect(dashboardKpiGridContent).toContain("identity.iconPosition");
    expect(dashboardKpiGridContent).toContain("identity.iconSize");
  });
});

describe("1M-E — 7. marca de agua (watermark)", () => {
  it("KpiWidget renderiza .kpi-widget-icon-watermark cuando iconPosition es watermark", () => {
    expect(kpiWidgetContent).toContain("kpi-widget-icon-watermark");
    expect(kpiWidgetContent).toContain('"watermark"');
  });

  it("globals.css define el estilo de la marca de agua", () => {
    expect(globalsCssContent).toContain(".kpi-widget-icon-watermark");
  });
});

describe("1M-E — 8. icono grande al centro (center-large)", () => {
  it("KpiWidget renderiza .kpi-widget-icon-center cuando iconPosition es center-large", () => {
    expect(kpiWidgetContent).toContain("kpi-widget-icon-center");
    expect(kpiWidgetContent).toContain('"center-large"');
  });

  it("globals.css define el estilo del icono central", () => {
    expect(globalsCssContent).toContain(".kpi-widget-icon-center");
  });
});

describe("1M-E — 9. sin icono (none)", () => {
  it("KpiWidget oculta el icono cuando iconPosition es none", () => {
    expect(kpiWidgetContent).toMatch(/iconPosition\s*!==\s*"none"/);
  });
});

describe("1M-E — 10. apariencia / fondo / borde / sombra de tarjeta", () => {
  it("ModuleIdentity declara los 4 campos nuevos con sus valores 'auto'", () => {
    for (const field of ["cardAppearance", "cardBackground", "cardBorder", "cardShadow"]) {
      expect(moduleIdentityContent).toContain(field);
    }
  });

  it("KpiWidget aplica data-card-appearance/background/border/shadow", () => {
    for (const attr of ["data-card-appearance", "data-card-background", "data-card-border", "data-card-shadow"]) {
      expect(kpiWidgetContent).toContain(attr);
    }
  });

  it("globals.css define reglas para los 10 valores de apariencia", () => {
    for (const appearance of [
      "limpia", "pastel", "solida", "glass", "elevada", "premium", "ejecutiva", "clinica", "taller", "intensa",
    ]) {
      expect(globalsCssContent).toContain(`data-card-appearance="${appearance}"`);
    }
  });

  it("globals.css define reglas para fondo, borde y sombra de tarjeta", () => {
    for (const bg of ["blanco", "suave-color", "degradado", "glass", "solido"]) {
      expect(globalsCssContent).toContain(`data-card-background="${bg}"`);
    }
    for (const border of ["ninguno", "suave", "acento", "superior", "lateral"]) {
      expect(globalsCssContent).toContain(`data-card-border="${border}"`);
    }
    for (const shadow of ["ninguna", "suave", "media", "elevada"]) {
      expect(globalsCssContent).toContain(`data-card-shadow="${shadow}"`);
    }
  });
});

describe("1M-E — 11. dock inferior: estilo, tamaño, activo, etiquetas", () => {
  it("visual-preferences declara DOCK_STYLES, DOCK_SIZES, DOCK_ACTIVE_STYLES, DOCK_LABEL_VISIBILITIES", () => {
    for (const token of ["DOCK_STYLES", "DOCK_SIZES", "DOCK_ACTIVE_STYLES", "DOCK_LABEL_VISIBILITIES"]) {
      expect(visualPrefsContent).toContain(token);
    }
  });

  it("AppDock expone clases hook app-dock-*", () => {
    for (const cls of [
      "app-dock", "app-dock-nav", "app-dock-item", "app-dock-item-active",
      "app-dock-icon", "app-dock-label", "app-dock-separator",
    ]) {
      expect(appDockContent).toContain(cls);
    }
  });

  it("globals.css define reglas para los 8 estilos de dock y tamaño/activo/etiquetas/sombra/radio", () => {
    for (const style of [
      "limpio", "glass", "flotante-premium", "ejecutivo", "compacto", "app-moderna", "color-solido", "minimal",
    ]) {
      expect(globalsCssContent).toContain(`data-visual-dock-style="${style}"`);
    }
    expect(globalsCssContent).toContain("data-visual-dock-size=");
    expect(globalsCssContent).toContain("data-visual-dock-active=");
    expect(globalsCssContent).toContain("data-visual-dock-labels=");
    expect(globalsCssContent).toContain("data-visual-dock-shadow=");
    expect(globalsCssContent).toContain("data-visual-dock-radius=");
  });

  it("PersonalizationPanel incluye controles de dock", () => {
    expect(panelContent).toContain("setDockStyle");
    expect(panelContent).toContain("setDockSize");
    expect(panelContent).toContain("setDockActiveStyle");
    expect(panelContent).toContain("setDockLabelVisibility");
  });
});

describe("1M-E — 12. buscador: nuevos términos", () => {
  it("incluye términos de plantillas, tarjetas, dock y galería de fondos", () => {
    for (const term of [
      "plantilla", "estética", "taller", "médico", "dental", "clínico", "legal", "ejecutivo", "educación",
      "tarjeta", "card", "kpi", "dock", "menú inferior", "módulos", "galería", "degradados", "glass",
      "icono grande", "marca de agua", "sombra", "borde",
    ]) {
      expect(panelContent.toLowerCase()).toContain(term.toLowerCase());
    }
  });
});

describe("1M-E — 13. aplicar plantilla y resetear", () => {
  it("visual-preferences expone applyBusinessTemplate y resetBusinessTemplate", () => {
    expect(visualPrefsContent).toContain("applyBusinessTemplate");
    expect(visualPrefsContent).toContain("resetBusinessTemplate");
  });

  it("PersonalizationPanel usa applyBusinessTemplate y resetBusinessTemplate, con 'Restaurar estilo base'", () => {
    expect(panelContent).toContain("applyBusinessTemplate");
    expect(panelContent).toContain("resetBusinessTemplate");
    expect(panelContent).toContain("Restaurar estilo base");
  });
});

describe("1M-E — 14. sin textos bloqueados", () => {
  it("no aparecen frases de bloqueo en los archivos tocados (AppDock conserva su aviso preexistente de rutas sin página)", () => {
    const contents = [
      visualPrefsContent,
      moduleIdentityContent,
      backgroundCustomizerContent,
      moduleIdentityCustomizerContent,
      panelContent,
      kpiWidgetContent,
      dashboardKpiGridContent,
    ];
    for (const content of contents) {
      for (const phrase of [
        "Próximamente",
        "Requiere motor",
        "todavía no existe",
        "todavía no se guarda",
        "bloqueado",
        "Coming soon",
        "coming soon",
      ]) {
        expect(content).not.toContain(phrase);
      }
    }
  });
});

describe("1M-E — 15. alcance: sin servidor, sin migraciones nuevas", () => {
  it("los archivos visuales no importan de @/server (DashboardKpiGrid mantiene su tipo de agenda preexistente)", () => {
    for (const content of [
      visualPrefsContent,
      moduleIdentityContent,
      backgroundCustomizerContent,
      moduleIdentityCustomizerContent,
      panelContent,
      kpiWidgetContent,
      appDockContent,
    ]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
    expect(dashboardKpiGridContent).toMatch(/import type \{ AppointmentListItem \} from "@\/server\/domain\/agenda\/queries"/);
  });

  it("no existe migración 0021 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});
