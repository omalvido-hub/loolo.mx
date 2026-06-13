// NELZZON — Pruebas Fase 1M-F (Personalizar 2.0 como experiencia simple,
// local, sin DB). Estructurales por readFileSync, siguiendo el patrón de
// tests/phase-1m-a/b/c/d/e.
// - Personalizar Home: 3 acciones grandes (Cambiar estilo completo, Acomodar
//   dashboard, Personalizar detalles), sin menú técnico.
// - Cambiar estilo completo: flujo de 3 pasos (negocio → estilo → galería),
//   ≥25 tipos de negocio, ≥10 estilos.
// - Personalizar detalles: ≥10 paletas de color, ≥10 paquetes de iconos,
//   galería de fondos/portadas.
// - Acomodar dashboard: orden/tamaño/ocultar/reset, aplicado al Dashboard real.
// - Buscador con los nuevos términos.
// - Sin textos prohibidos, sin tocar servidor ni migraciones.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VISUAL_PREFS_PATH = resolve("src/lib/visual-preferences.tsx");
const MODULE_IDENTITY_PATH = resolve("src/lib/module-identity.tsx");
const DASHBOARD_LAYOUT_PATH = resolve("src/lib/dashboard-layout.tsx");
const PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const STYLE_WIZARD_PATH = resolve("src/components/shell/StyleWizard.tsx");
const DASHBOARD_ARRANGER_PATH = resolve("src/components/shell/DashboardArranger.tsx");
const PERSONALIZATION_DETAILS_PATH = resolve("src/components/shell/PersonalizationDetails.tsx");
const BACKGROUND_CUSTOMIZER_PATH = resolve("src/components/shell/BackgroundCustomizer.tsx");
const DASHBOARD_KPI_GRID_PATH = resolve("src/components/dashboard/DashboardKpiGrid.tsx");
const DASHBOARD_KPI_ORDERED_GRID_PATH = resolve("src/components/dashboard/DashboardKpiOrderedGrid.tsx");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const APP_SHELL_PATH = resolve("src/components/shell/AppShell.tsx");

const visualPrefsContent = readFileSync(VISUAL_PREFS_PATH, "utf-8");
const moduleIdentityContent = readFileSync(MODULE_IDENTITY_PATH, "utf-8");
const dashboardLayoutContent = readFileSync(DASHBOARD_LAYOUT_PATH, "utf-8");
const panelContent = readFileSync(PANEL_PATH, "utf-8");
const styleWizardContent = readFileSync(STYLE_WIZARD_PATH, "utf-8");
const dashboardArrangerContent = readFileSync(DASHBOARD_ARRANGER_PATH, "utf-8");
const detailsContent = readFileSync(PERSONALIZATION_DETAILS_PATH, "utf-8");
const backgroundCustomizerContent = readFileSync(BACKGROUND_CUSTOMIZER_PATH, "utf-8");
const dashboardKpiGridContent = readFileSync(DASHBOARD_KPI_GRID_PATH, "utf-8");
const dashboardKpiOrderedGridContent = readFileSync(DASHBOARD_KPI_ORDERED_GRID_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");
const appShellContent = readFileSync(APP_SHELL_PATH, "utf-8");

describe("1M-F — 1. Personalizar Home: 3 acciones grandes, sin menú técnico", () => {
  it("declara las 3 acciones con sus descripciones", () => {
    expect(panelContent).toContain("Cambiar estilo completo");
    expect(panelContent).toContain("Elige negocio, estilo, colores, iconos y fondos en pocos pasos.");
    expect(panelContent).toContain("Acomodar dashboard");
    expect(panelContent).toContain("Mueve tarjetas, cambia tamaños y oculta lo que no uses.");
    expect(panelContent).toContain("Personalizar detalles");
    expect(panelContent).toContain("Ajusta colores, iconos, fondos, tarjetas y menú.");
  });

  it("no usa palabras técnicas como nombres de pestaña visibles (Marca/Apariencia/Fondos/Módulos como menú principal)", () => {
    expect(panelContent).not.toMatch(/>\s*Apariencia\s*</);
    expect(panelContent).not.toMatch(/>\s*Módulos\s*</);
  });
});

describe("1M-F — 2. Cambiar estilo completo: flujo de 3 pasos", () => {
  it("paso 1: pregunta de negocio agrupada por categorías", () => {
    expect(styleWizardContent).toContain("¿Qué tipo de negocio tienes?");
    expect(styleWizardContent).toContain("BUSINESS_TYPE_GROUPS");
  });

  it("paso 2: pregunta de estilo con STYLE_OPTIONS", () => {
    expect(styleWizardContent).toContain("¿Qué estilo te gusta?");
    expect(styleWizardContent).toContain("STYLE_OPTIONS");
  });

  it("paso 3: galería de plantillas con botón 'Aplicar este estilo'", () => {
    expect(styleWizardContent).toContain("BUSINESS_TEMPLATE_KEYS");
    expect(styleWizardContent).toContain("Aplicar este estilo");
  });

  it("siempre muestra la vista previa grande", () => {
    expect(styleWizardContent).toContain("<PersonalizationPreviewCanvas />");
  });
});

describe("1M-F — 3. al menos 25 tipos de negocio agrupados", () => {
  it("BUSINESS_TYPE_GROUPS tiene 25 o más opciones de negocio (templateId)", () => {
    const matches = visualPrefsContent.match(/templateId:\s*"[a-z0-9-]+"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(25);
  });

  it("incluye categorías salud, belleza, servicios, profesional, educación, comercio, bienestar, creativo", () => {
    for (const group of ["salud", "belleza", "servicios", "profesional", "educacion", "comercio", "bienestar", "creativo"]) {
      expect(visualPrefsContent).toContain(`key: "${group}"`);
    }
  });
});

describe("1M-F — 4. al menos 10 estilos simples", () => {
  it("STYLE_OPTIONS tiene 10 o más entradas", () => {
    const matches = visualPrefsContent.match(/\{\s*key:\s*"[a-z-]+",\s*label:\s*"[^"]+",\s*description:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });
});

describe("1M-F — 5. colores: al menos 10 paletas con nombre y vista previa", () => {
  it("COLOR_PALETTES tiene 10 o más entradas, con swatches visibles", () => {
    expect(visualPrefsContent).toContain("COLOR_PALETTES");
    const matches = visualPrefsContent.match(/swatches:\s*\[/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });

  it("Personalizar detalles renderiza las paletas con swatches y botón de aplicar", () => {
    expect(detailsContent).toContain("COLOR_PALETTES");
    expect(detailsContent).toContain("applyColorPalette");
    expect(detailsContent).toContain("palette.swatches");
  });
});

describe("1M-F — 6. iconos: al menos 10 paquetes completos", () => {
  it("MODULE_ICON_PACKAGES tiene 10 o más entradas", () => {
    expect(moduleIdentityContent).toContain("MODULE_ICON_PACKAGES");
    const matches = moduleIdentityContent.match(/\{\s*key:\s*"[a-z]+",\s*label:\s*"[^"]+",\s*description:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });

  it("Personalizar detalles aplica paquetes completos y permite editar uno por uno", () => {
    expect(detailsContent).toContain("applyIconPackage");
    expect(detailsContent).toContain("Aplicar paquete");
    expect(detailsContent).toContain("Editar iconos uno por uno");
  });
});

describe("1M-F — 7. fondos y portadas: galería visual existente", () => {
  it("BackgroundCustomizer sigue ofreciendo galería, intensidad, blur y subir imagen", () => {
    expect(backgroundCustomizerContent).toContain("BACKGROUND_GALLERY");
    expect(backgroundCustomizerContent).toContain("BACKGROUND_GALLERY_CATEGORIES");
  });

  it("Personalizar detalles incluye la pestaña 'Fondos y portadas'", () => {
    expect(detailsContent).toContain("Fondos y portadas");
    expect(detailsContent).toContain("<BackgroundCustomizer />");
  });
});

describe("1M-F — 8. tarjetas y menú: nombres simples, sin exponer cardAppearance/dockStyle como texto visible", () => {
  it("SIMPLE_CARD_STYLES y SIMPLE_DOCK_STYLES tienen 8 y 7 entradas respectivamente (con nombres simples)", () => {
    expect(visualPrefsContent).toContain("SIMPLE_CARD_STYLES");
    expect(visualPrefsContent).toContain("SIMPLE_DOCK_STYLES");
    for (const label of ["Limpias", "Icono grande", "Coloridas", "Tipo app", "Glass", "Elegantes", "Compactas", "Fuertes"]) {
      expect(visualPrefsContent).toContain(`"${label}"`);
    }
    for (const label of ["Simple", "Glass", "Flotante", "Compacto", "Moderno", "Sin texto", "Iconos grandes"]) {
      expect(visualPrefsContent).toContain(`"${label}"`);
    }
  });

  it("Personalizar detalles aplica los estilos simples de tarjetas y menú", () => {
    expect(detailsContent).toContain("applySimpleCardStyle");
    expect(detailsContent).toContain("applySimpleDockStyle");
  });
});

describe("1M-F — 9. Acomodar dashboard: orden, tamaño, ocultar/mostrar y reset", () => {
  it("declara la sección 'Acomoda tu dashboard'", () => {
    expect(dashboardArrangerContent).toContain("Acomoda tu dashboard");
  });

  it("permite mover (orden), cambiar tamaño, ocultar/mostrar y restaurar", () => {
    expect(dashboardArrangerContent).toContain("moveCard");
    expect(dashboardArrangerContent).toContain("setCardSize");
    expect(dashboardArrangerContent).toContain("DASHBOARD_CARD_SIZES");
    expect(dashboardArrangerContent).toContain("setIdentity");
    expect(dashboardArrangerContent).toContain("resetLayout");
    expect(dashboardArrangerContent).toContain("Restaurar acomodo");
  });

  it("dashboard-layout.tsx declara orden, tamaños y persistencia local", () => {
    expect(dashboardLayoutContent).toContain("DASHBOARD_CARD_IDS");
    expect(dashboardLayoutContent).toContain("DASHBOARD_CARD_SIZES");
    expect(dashboardLayoutContent).toContain("moveCard");
    expect(dashboardLayoutContent).toContain("setCardSize");
    expect(dashboardLayoutContent).toContain("resetLayout");
  });
});

describe("1M-F — 10. Acomodar dashboard se aplica al Dashboard real", () => {
  it("DashboardKpiOrderedGrid usa useDashboardLayout para ordenar las tarjetas", () => {
    expect(dashboardKpiOrderedGridContent).toContain("useDashboardLayout");
    expect(dashboardKpiOrderedGridContent).toContain("layout.order");
  });

  it("DashboardKpiGrid aplica el tamaño elegido a cada tarjeta", () => {
    expect(dashboardKpiGridContent).toContain("useDashboardLayout");
    expect(dashboardKpiGridContent).toContain("getCardSize");
  });

  it("la página de Dashboard usa DashboardKpiOrderedGrid y conserva dashboard-shell/dashboard-grid", () => {
    expect(dashboardPageContent).toContain("DashboardKpiOrderedGrid");
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
  });

  it("AppShell envuelve la app con DashboardLayoutProvider", () => {
    expect(appShellContent).toMatch(/from\s+"@\/lib\/dashboard-layout"/);
    expect(appShellContent).toContain("<DashboardLayoutProvider>");
    expect(appShellContent).toContain("</DashboardLayoutProvider>");
  });
});

describe("1M-F — 11. preview grande siempre visible", () => {
  it("Cambiar estilo completo y Personalizar detalles muestran PersonalizationPreviewCanvas", () => {
    expect(styleWizardContent).toContain("<PersonalizationPreviewCanvas />");
    expect(detailsContent).toContain("<PersonalizationPreviewCanvas />");
  });
});

describe("1M-F — 12. buscador: nuevos términos", () => {
  it("incluye términos de estilo, negocio, colores, iconos, fondos, tarjetas, menú y acomodar", () => {
    for (const term of [
      "estilo", "negocio", "dental", "médico", "estética", "taller", "legal", "educación",
      "colores", "iconos", "fondos", "portadas", "tarjetas", "menú", "dock", "acomodar",
      "mover", "ordenar", "tamaño", "ocultar", "dashboard",
    ]) {
      expect(panelContent.toLowerCase()).toContain(term.toLowerCase());
    }
  });
});

describe("1M-F — 13. sin textos prohibidos", () => {
  it("no aparecen frases bloqueadas en los archivos nuevos/editados", () => {
    const contents = [panelContent, styleWizardContent, dashboardArrangerContent, detailsContent];
    for (const content of contents) {
      for (const phrase of [
        "Próximamente",
        "Requiere motor",
        "todavía no existe",
        "bloqueado",
        "coming soon",
        "Coming soon",
      ]) {
        expect(content).not.toContain(phrase);
      }
    }
  });

  it("cardAppearance/dockStyle/localStorage/data-visual no aparecen como texto visible en JSX", () => {
    const banned = ["cardAppearance", "dockStyle", "localStorage", "data-visual"];
    for (const content of [panelContent, styleWizardContent, dashboardArrangerContent, detailsContent]) {
      const visibleTexts = [...content.matchAll(/>\s*([^<>{}\n]+?)\s*</g)].map((m) => m[1]);
      for (const text of visibleTexts) {
        for (const phrase of banned) {
          expect(text).not.toContain(phrase);
        }
      }
    }
  });
});

describe("1M-F — 14. alcance: sin servidor ni migraciones nuevas", () => {
  it("los archivos nuevos no importan de @/server", () => {
    for (const content of [panelContent, styleWizardContent, dashboardArrangerContent, detailsContent]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
  });

  it("no existe migración 0021 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});
