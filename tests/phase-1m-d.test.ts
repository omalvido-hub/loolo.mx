// NELZZON — Pruebas Fase 1M-D (Personalizar completo, local, sin DB).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-1m-a/b/c.
// - PersonalizationPanel: exactamente 5 secciones visibles (inicio, marca,
//   apariencia, fondos, modulos), sin StudioOptionStatus/STATUS_META/
//   StatusBadge/AccessibilityPreview/DashboardWidgetsPreview, sin textos
//   bloqueados visibles.
// - visual-preferences: nuevos campos de fondo y marca, setters, resets.
// - BackgroundCustomizer / BrandCustomizer: existen, controles reales.
// - PersonalizationPreviewCanvas: bloque de marca reactivo.
// - AppSidebar: bloque de marca con .brand-block/.brand-symbol y tagline.
// - globals.css: reglas data-visual-background*/data-visual-brand-*.
// - Fuera de alcance: server, prisma, migraciones nuevas, agenda, pacientes,
//   odontograma, tratamientos, permisos, RLS.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VISUAL_PREFS_PATH = resolve("src/lib/visual-preferences.tsx");
const BACKGROUND_CUSTOMIZER_PATH = resolve("src/components/shell/BackgroundCustomizer.tsx");
const BRAND_CUSTOMIZER_PATH = resolve("src/components/shell/BrandCustomizer.tsx");
const PREVIEW_CANVAS_PATH = resolve("src/components/shell/PersonalizationPreviewCanvas.tsx");
const APP_SIDEBAR_PATH = resolve("src/components/app-sidebar.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");
const PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const STYLE_WIZARD_PATH = resolve("src/components/shell/StyleWizard.tsx");
const PERSONALIZATION_DETAILS_PATH = resolve("src/components/shell/PersonalizationDetails.tsx");

const visualPrefsContent = readFileSync(VISUAL_PREFS_PATH, "utf-8");
const backgroundCustomizerContent = readFileSync(BACKGROUND_CUSTOMIZER_PATH, "utf-8");
const brandCustomizerContent = readFileSync(BRAND_CUSTOMIZER_PATH, "utf-8");
const previewCanvasContent = readFileSync(PREVIEW_CANVAS_PATH, "utf-8");
const appSidebarContent = readFileSync(APP_SIDEBAR_PATH, "utf-8");
const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const panelContent = readFileSync(PANEL_PATH, "utf-8");
const styleWizardContent = readFileSync(STYLE_WIZARD_PATH, "utf-8");
const personalizationDetailsContent = readFileSync(PERSONALIZATION_DETAILS_PATH, "utf-8");

describe("1M-D — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("existen BackgroundCustomizer.tsx y BrandCustomizer.tsx", () => {
    expect(existsSync(BACKGROUND_CUSTOMIZER_PATH)).toBe(true);
    expect(existsSync(BRAND_CUSTOMIZER_PATH)).toBe(true);
  });
});

describe("1M-D — Personalizar (FASE 1M-F): inicio con 3 acciones simples", () => {
  it("declara las 3 acciones del inicio: Cambiar estilo completo, Acomodar dashboard, Personalizar detalles", () => {
    const order = ["Cambiar estilo completo", "Acomodar dashboard", "Personalizar detalles"];
    let lastIndex = -1;
    for (const title of order) {
      const idx = panelContent.indexOf(title);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
    for (const key of ["tipografias", "dashboard", "widgets", "navegacion", "portal", "plantillas", "accesibilidad", "avanzado", "ia"]) {
      expect(panelContent).not.toContain(`key: "${key}"`);
    }
  });

  it("no contiene StudioOptionStatus/STATUS_META/StatusBadge/StudioOption", () => {
    for (const token of ["StudioOptionStatus", "STATUS_META", "StatusBadge", "interface StudioOption"]) {
      expect(panelContent).not.toContain(token);
    }
  });

  it("no contiene AccessibilityPreview ni DashboardWidgetsPreview", () => {
    expect(panelContent).not.toContain("AccessibilityPreview");
    expect(panelContent).not.toContain("DashboardWidgetsPreview");
    expect(panelContent).not.toContain("FONT_SCALES");
    expect(panelContent).not.toContain("DASHBOARD_WIDGET_LABELS");
  });

  it("importa y renderiza BackgroundCustomizer y BrandCustomizer en Personalizar detalles", () => {
    expect(personalizationDetailsContent).toMatch(/from\s+"@\/components\/shell\/BackgroundCustomizer"/);
    expect(personalizationDetailsContent).toMatch(/from\s+"@\/components\/shell\/BrandCustomizer"/);
    expect(personalizationDetailsContent).toContain("<BackgroundCustomizer />");
    expect(personalizationDetailsContent).toContain("<BrandCustomizer />");
  });

  it("conserva ModuleIdentityCustomizer en Iconos (edición uno por uno)", () => {
    expect(personalizationDetailsContent).toContain("<ModuleIdentityCustomizer />");
  });

  it("conserva PersonalizationPreviewToggle, VisualPresetSelector y PersonalizationPreviewCanvas", () => {
    expect(panelContent).toContain("<PersonalizationPreviewToggle");
    expect(personalizationDetailsContent).toContain("<VisualPresetSelector />");
    expect(styleWizardContent).toContain("<PersonalizationPreviewCanvas />");
    expect(personalizationDetailsContent).toContain("<PersonalizationPreviewCanvas />");
  });

  it("el footer dice que los cambios se guardan localmente, sin lenguaje de bloqueo", () => {
    expect(panelContent).toContain("Los cambios se guardan localmente en este navegador.");
  });

  it("no contiene textos de bloqueo visibles en el panel", () => {
    for (const phrase of [
      "Próximamente",
      "Requiere motor",
      "todavía no existe",
      "todavía no se guardan",
      "guardar no disponible",
      "bloqueado",
      "Coming soon",
      "Motor futuro",
      "Sin guardar todavía",
      "Solo admin",
      "Guardar es parte del motor",
    ]) {
      expect(panelContent).not.toContain(phrase);
    }
  });
});

describe("1M-D.1 — buscador real de Personalizar", () => {
  it("declara PERSONALIZATION_SEARCH_INDEX", () => {
    expect(panelContent).toContain("PERSONALIZATION_SEARCH_INDEX");
  });

  it("incluye términos de marca, fondos, módulos y apariencia", () => {
    for (const term of [
      "logo", "marca", "nombre", "lema", "símbolo", "tamaño",
      "apariencia", "preset", "acento", "densidad", "sombra", "radio", "tarjeta",
      "fondo", "imagen", "blur", "intensidad", "degradado", "glass", "clínico",
      "módulos", "iconos", "emojis", "widgets", "kpi", "color", "forma", "ocultar", "mostrar", "reset",
    ]) {
      expect(panelContent.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("el input de búsqueda existe con placeholder de búsqueda", () => {
    expect(panelContent).toMatch(/placeholder="Busca una categoría/);
  });

  it("calcula resultados de búsqueda y los hace clickeables hacia una pantalla real", () => {
    expect(panelContent).toContain("searchResults");
    expect(panelContent).toMatch(/onClick=\{\(\)\s*=>\s*goTo\(result\)\}/);
  });

  it('muestra "No encontré esa opción en Personalizar." cuando no hay resultados', () => {
    expect(panelContent).toContain("No encontré esa opción en Personalizar.");
  });

  it("no reintroduce textos bloqueados en el buscador", () => {
    for (const phrase of [
      "Próximamente",
      "Requiere motor",
      "todavía no se guardan",
      "todavía no existe",
      "Guardar es parte del motor",
    ]) {
      expect(panelContent).not.toContain(phrase);
    }
  });
});

describe("1M-D — visual-preferences: campos, constantes y acciones de fondo/marca", () => {
  it("declara los tipos de fondo y marca", () => {
    expect(visualPrefsContent).toContain("VisualBackgroundStyle");
    expect(visualPrefsContent).toContain("VisualBackgroundIntensity");
    expect(visualPrefsContent).toContain("VisualBackgroundBlur");
    expect(visualPrefsContent).toContain("VisualBrandSize");
    expect(visualPrefsContent).toContain("VisualBrandTextStyle");
    expect(visualPrefsContent).toContain("VisualBrandSymbolStyle");
  });

  it("declara los 6 estilos de fondo requeridos", () => {
    for (const style of ["clean", "gradient", "glass", "executive", "intense", "clinical"]) {
      expect(visualPrefsContent).toContain(`"${style}"`);
    }
  });

  it("declara intensidad (low/medium/high) y blur (none/soft/medium/high)", () => {
    for (const v of ["low", "medium", "high"]) expect(visualPrefsContent).toContain(`"${v}"`);
    for (const v of ["none", "soft", "medium", "high"]) expect(visualPrefsContent).toContain(`"${v}"`);
  });

  it("declara MAX_BACKGROUND_IMAGE_BYTES = 700 * 1024", () => {
    expect(visualPrefsContent).toContain("MAX_BACKGROUND_IMAGE_BYTES = 700 * 1024");
  });

  it("declara DEFAULT_BRAND_NAME y DEFAULT_BRAND_TAGLINE", () => {
    expect(visualPrefsContent).toContain('DEFAULT_BRAND_NAME = "nelzzon"');
    expect(visualPrefsContent).toContain("DEFAULT_BRAND_TAGLINE");
  });

  it("VisualPreferences incluye los nuevos campos de fondo y marca", () => {
    for (const field of [
      "backgroundStyle",
      "backgroundIntensity",
      "backgroundBlur",
      "backgroundImageDataUrl",
      "brandName",
      "brandTagline",
      "brandSize",
      "brandTextStyle",
      "brandSymbolStyle",
    ]) {
      expect(visualPrefsContent).toContain(field);
    }
  });

  it("expone setters y resets para fondo y marca, y resetAllPersonalization", () => {
    for (const fn of [
      "setBackgroundStyle",
      "setBackgroundIntensity",
      "setBackgroundBlur",
      "setBackgroundImageDataUrl",
      "clearBackgroundImage",
      "resetBackground",
      "setBrandName",
      "setBrandTagline",
      "setBrandSize",
      "setBrandTextStyle",
      "setBrandSymbolStyle",
      "resetBrand",
      "resetAllPersonalization",
    ]) {
      expect(visualPrefsContent).toContain(fn);
    }
  });

  it("resetVisualPreferences y resetAllPersonalization vuelven a DEFAULT_VISUAL_PREFERENCES", () => {
    expect(visualPrefsContent).toMatch(/resetVisualPreferences:\s*\(\)\s*=>\s*setPreferences\(DEFAULT_VISUAL_PREFERENCES\)/);
    expect(visualPrefsContent).toMatch(/resetAllPersonalization:\s*\(\)\s*=>\s*setPreferences\(DEFAULT_VISUAL_PREFERENCES\)/);
  });

  it("applyPreferencesToDocument aplica data-visual-background*, data-visual-brand-* y --visual-bg-image", () => {
    expect(visualPrefsContent).toContain("root.dataset.visualBackground");
    expect(visualPrefsContent).toContain("root.dataset.visualBackgroundIntensity");
    expect(visualPrefsContent).toContain("root.dataset.visualBackgroundBlur");
    expect(visualPrefsContent).toContain("root.dataset.visualBrandSize");
    expect(visualPrefsContent).toContain("root.dataset.visualBrandSymbol");
    expect(visualPrefsContent).toContain("--visual-bg-image");
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(visualPrefsContent.split("\n")[0].trim()).toBe('"use client";');
    expect(visualPrefsContent).not.toMatch(/from\s+"@\/server/);
    expect(visualPrefsContent).not.toMatch(/prisma/i);
  });
});

describe("1M-D — BackgroundCustomizer: controles reales", () => {
  it("exporta BackgroundCustomizer", () => {
    expect(backgroundCustomizerContent).toContain("export function BackgroundCustomizer");
  });

  it("ofrece selectores de estilo, intensidad y blur usando las listas curadas", () => {
    expect(backgroundCustomizerContent).toContain("VISUAL_BACKGROUND_STYLES");
    expect(backgroundCustomizerContent).toContain("VISUAL_BACKGROUND_INTENSITIES");
    expect(backgroundCustomizerContent).toContain("VISUAL_BACKGROUND_BLURS");
  });

  it("ofrece subir imagen propia con validación de tipo y tamaño", () => {
    expect(backgroundCustomizerContent).toContain("image/png");
    expect(backgroundCustomizerContent).toContain("image/jpeg");
    expect(backgroundCustomizerContent).toContain("image/webp");
    expect(backgroundCustomizerContent).toContain("MAX_BACKGROUND_IMAGE_BYTES");
    expect(backgroundCustomizerContent).toContain("Formato no soportado");
    expect(backgroundCustomizerContent).toContain("Imagen demasiado pesada para guardado local");
  });

  it("ofrece quitar imagen y resetear fondo", () => {
    expect(backgroundCustomizerContent).toContain("clearBackgroundImage");
    expect(backgroundCustomizerContent).toContain("resetBackground");
    expect(backgroundCustomizerContent).toContain("Quitar imagen");
    expect(backgroundCustomizerContent).toContain("Resetear fondo");
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(backgroundCustomizerContent.split("\n")[0].trim()).toBe('"use client";');
    expect(backgroundCustomizerContent).not.toMatch(/from\s+"@\/server/);
    expect(backgroundCustomizerContent).not.toMatch(/prisma/i);
  });
});

describe("1M-D — BrandCustomizer: controles reales", () => {
  it("exporta BrandCustomizer", () => {
    expect(brandCustomizerContent).toContain("export function BrandCustomizer");
  });

  it("ofrece nombre visible y lema corto vinculados a setBrandName/setBrandTagline", () => {
    expect(brandCustomizerContent).toContain("setBrandName(e.target.value)");
    expect(brandCustomizerContent).toContain("setBrandTagline(e.target.value)");
  });

  it("ofrece selectores de tamaño, estilo de texto y estilo de símbolo", () => {
    expect(brandCustomizerContent).toContain("VISUAL_BRAND_SIZES");
    expect(brandCustomizerContent).toContain("VISUAL_BRAND_TEXT_STYLES");
    expect(brandCustomizerContent).toContain("VISUAL_BRAND_SYMBOL_STYLES");
  });

  it("ofrece resetear marca", () => {
    expect(brandCustomizerContent).toContain("resetBrand");
    expect(brandCustomizerContent).toContain("Resetear marca");
  });

  it("aclara que no modifica el logo oficial ni el nombre de la organización", () => {
    expect(brandCustomizerContent).toContain("No cambia tu logo oficial ni el nombre de tu organización");
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(brandCustomizerContent.split("\n")[0].trim()).toBe('"use client";');
    expect(brandCustomizerContent).not.toMatch(/from\s+"@\/server/);
    expect(brandCustomizerContent).not.toMatch(/prisma/i);
  });
});

describe("1M-D — PersonalizationPreviewCanvas: bloque de marca reactivo", () => {
  it("usa useVisualPreferences y muestra brandName/brandTagline", () => {
    expect(previewCanvasContent).toContain("useVisualPreferences");
    expect(previewCanvasContent).toContain("brandName");
    expect(previewCanvasContent).toContain("brandTagline");
  });

  it("usa .personalization-preview-shell, .brand-block y .brand-symbol", () => {
    expect(previewCanvasContent).toContain("personalization-preview-shell");
    expect(previewCanvasContent).toContain("brand-block");
    expect(previewCanvasContent).toContain("brand-symbol");
  });

  it("oculta el bloque de marca cuando brandTextStyle es 'hide'", () => {
    expect(previewCanvasContent).toMatch(/brandTextStyle\s*!==\s*"hide"/);
  });
});

describe("1M-D — AppSidebar: bloque de marca con tagline", () => {
  it("usa useVisualPreferences y .brand-block/.brand-symbol", () => {
    expect(appSidebarContent).toMatch(/from\s+"@\/lib\/visual-preferences"/);
    expect(appSidebarContent).toContain("brand-block");
    expect(appSidebarContent).toContain("brand-symbol");
  });

  it("muestra brandTagline condicionado a brandTextStyle !== 'hide'", () => {
    expect(appSidebarContent).toContain("brandTagline");
    expect(appSidebarContent).toMatch(/brandTextStyle\s*!==\s*"hide"/);
  });

  it("conserva orgName y BrandLogo", () => {
    expect(appSidebarContent).toContain("{orgName}");
    expect(appSidebarContent).toContain("<BrandLogo");
  });
});

describe("1M-D — globals.css: reglas de fondo y marca", () => {
  it("declara variables de intensidad y blur de fondo", () => {
    expect(globalsCssContent).toContain('[data-visual-background-intensity="low"]');
    expect(globalsCssContent).toContain('[data-visual-background-intensity="medium"]');
    expect(globalsCssContent).toContain('[data-visual-background-intensity="high"]');
    expect(globalsCssContent).toContain('[data-visual-background-blur="none"]');
    expect(globalsCssContent).toContain('[data-visual-background-blur="soft"]');
    expect(globalsCssContent).toContain('[data-visual-background-blur="medium"]');
    expect(globalsCssContent).toContain('[data-visual-background-blur="high"]');
  });

  it("declara reglas para los 6 estilos de fondo sobre .dashboard-shell y .personalization-preview-shell", () => {
    for (const style of ["clean", "gradient", "glass", "executive", "intense", "clinical"]) {
      expect(globalsCssContent).toContain(`[data-visual-background="${style}"] .dashboard-shell`);
      expect(globalsCssContent).toContain(`[data-visual-background="${style}"] .personalization-preview-shell`);
    }
  });

  it("usa --visual-bg-image en los background-image", () => {
    expect(globalsCssContent).toContain("var(--visual-bg-image, none)");
  });

  it("declara reglas de tamaño y estilo de símbolo de marca", () => {
    expect(globalsCssContent).toContain('[data-visual-brand-size="compact"] .brand-block');
    expect(globalsCssContent).toContain('[data-visual-brand-size="large"] .brand-block');
    expect(globalsCssContent).toContain('[data-visual-brand-symbol="soft"] .brand-symbol');
    expect(globalsCssContent).toContain('[data-visual-brand-symbol="intense"] .brand-symbol');
    expect(globalsCssContent).toContain('[data-visual-brand-symbol="monochrome"] .brand-symbol');
  });
});

describe("1M-D — alcance: no toca server/prisma/agenda/pacientes/cobros/presupuestos", () => {
  it("los archivos nuevos/editados de la capa visual no importan de server/**", () => {
    for (const content of [
      visualPrefsContent,
      backgroundCustomizerContent,
      brandCustomizerContent,
      previewCanvasContent,
      panelContent,
    ]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
  });

  it("no se tocaron archivos de agenda ni pacientes", () => {
    expect(existsSync(resolve("src/components/agenda"))).toBe(true);
    expect(existsSync(resolve("src/components/patients"))).toBe(true);
  });
});
