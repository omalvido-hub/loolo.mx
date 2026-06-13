// NELZZON — Pruebas FASE DS-5 (catálogo declarativo de colores y fondos).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-ds3/4.
// - color-background-catalog.ts declara:
//   - COLOR_PALETTE_CATALOG: 10 paletas listas con swatches y tokens
//     sugeridos --ds-*.
//   - Selector avanzado: COLOR_ROLES, AdvancedColorAdjustments
//     (brightness/intensity/opacity).
//   - Fondos: BACKGROUND_KINDS (color/gradient/pattern/preset/image),
//     BACKGROUND_COLOR_CATALOG, BACKGROUND_GRADIENT_CATALOG,
//     BACKGROUND_PATTERN_CATALOG, BACKGROUND_PRESET_CATALOG.
//   - Opacidad/blur: BACKGROUND_OPACITY_LEVELS, BACKGROUND_BLUR_LEVELS.
//   - Imagen personal futura: PersonalImageConfig,
//     DEFAULT_PERSONAL_IMAGE_CONFIG.
// - Sin nombres por vertical de negocio.
// - Capa puramente declarativa: sin componente cliente, sin persistencia,
//   sin conexión a componentes ni a atributos visuales todavía.
// - No se cambió globals.css, los tokens de DS-1, ni la estructura base del
//   Dashboard; sin migraciones nuevas.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  COLOR_PALETTE_CATALOG,
  COLOR_PALETTE_CATALOG_KEYS,
  isColorPaletteId,
  COLOR_ROLES,
  DEFAULT_ADVANCED_COLOR_ADJUSTMENTS,
  BACKGROUND_KINDS,
  BACKGROUND_COLOR_CATALOG,
  BACKGROUND_GRADIENT_CATALOG,
  BACKGROUND_PATTERN_CATALOG,
  BACKGROUND_PRESET_CATALOG,
  BACKGROUND_OPACITY_LEVELS,
  BACKGROUND_BLUR_LEVELS,
  DEFAULT_PERSONAL_IMAGE_CONFIG,
  type ColorPaletteId,
} from "../src/lib/color-background-catalog";

const CATALOG_PATH = resolve("src/lib/color-background-catalog.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const catalogContent = readFileSync(CATALOG_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");
const globalsCssContentBefore = readFileSync(GLOBALS_CSS_PATH, "utf-8");

const EXPECTED_PALETTES: ColorPaletteId[] = [
  "cielo",
  "bosque",
  "atardecer",
  "lavanda",
  "coral",
  "grafito",
  "turquesa",
  "arena",
  "vino",
  "menta",
];

describe("DS-5 — integridad de archivos", () => {
  it("existe src/lib/color-background-catalog.ts", () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-5 — paletas listas", () => {
  it("COLOR_PALETTE_CATALOG_KEYS contiene al menos 10 paletas", () => {
    expect(COLOR_PALETTE_CATALOG_KEYS.length).toBeGreaterThanOrEqual(10);
    expect(COLOR_PALETTE_CATALOG_KEYS.sort()).toEqual([...EXPECTED_PALETTES].sort());
  });

  it("cada paleta tiene metadata completa: label, description, swatches y tokens sugeridos", () => {
    for (const id of EXPECTED_PALETTES) {
      const palette = COLOR_PALETTE_CATALOG[id];
      expect(palette).toBeDefined();
      expect(palette.id).toBe(id);
      expect(palette.label.length).toBeGreaterThan(0);
      expect(palette.description.length).toBeGreaterThan(0);
      for (const key of ["principal", "secundario", "acento", "boton"] as const) {
        expect(palette.swatches[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      expect(palette.suggestedTokens.primary).toMatch(/^--ds-/);
      expect(palette.suggestedTokens.secondary).toMatch(/^--ds-/);
      expect(palette.suggestedTokens.accent).toMatch(/^--ds-/);
      expect(palette.suggestedTokens.button).toMatch(/^--ds-/);
    }
  });

  it("isColorPaletteId valida correctamente", () => {
    expect(isColorPaletteId("cielo")).toBe(true);
    expect(isColorPaletteId("vino")).toBe(true);
    expect(isColorPaletteId("dental-azul")).toBe(false);
    expect(isColorPaletteId(undefined)).toBe(false);
  });
});

describe("DS-5 — selector avanzado (rueda de color)", () => {
  it("declara los 5 roles de color", () => {
    expect(COLOR_ROLES.map((r) => r.key)).toEqual(["principal", "secundario", "acento", "boton", "estado"]);
    for (const role of COLOR_ROLES) {
      expect(role.label.length).toBeGreaterThan(0);
    }
  });

  it("declara ajustes por defecto de brillo, intensidad y opacidad", () => {
    expect(DEFAULT_ADVANCED_COLOR_ADJUSTMENTS).toEqual({ brightness: 0, intensity: 0, opacity: 1 });
  });
});

describe("DS-5 — fondos: tipos, colores, degradados, patrones y prediseñados", () => {
  it("BACKGROUND_KINDS incluye color, gradient, pattern, preset e image", () => {
    expect(BACKGROUND_KINDS.map((k) => k.key).sort()).toEqual(["color", "gradient", "image", "pattern", "preset"]);
  });

  it("existen fondos de color liso", () => {
    expect(BACKGROUND_COLOR_CATALOG.length).toBeGreaterThanOrEqual(3);
    for (const bg of BACKGROUND_COLOR_CATALOG) {
      expect(bg.value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("existen degradados con al menos 2 colores cada uno", () => {
    expect(BACKGROUND_GRADIENT_CATALOG.length).toBeGreaterThanOrEqual(3);
    for (const gradient of BACKGROUND_GRADIENT_CATALOG) {
      expect(gradient.stops.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("existen patrones suaves", () => {
    expect(BACKGROUND_PATTERN_CATALOG.length).toBeGreaterThanOrEqual(3);
  });

  it("existen fondos prediseñados", () => {
    expect(BACKGROUND_PRESET_CATALOG.length).toBeGreaterThanOrEqual(3);
  });
});

describe("DS-5 — opacidad y blur", () => {
  it("declara niveles de opacidad referenciando --ds-bg-overlay-opacity", () => {
    expect(BACKGROUND_OPACITY_LEVELS.map((o) => o.key)).toEqual(["baja", "media", "alta"]);
    for (const level of BACKGROUND_OPACITY_LEVELS) {
      expect(level.suggestedToken).toBe("--ds-bg-overlay-opacity");
    }
  });

  it("declara niveles de blur referenciando --ds-bg-blur", () => {
    expect(BACKGROUND_BLUR_LEVELS.map((b) => b.key)).toEqual(["ninguno", "suave", "medio", "alto"]);
    for (const level of BACKGROUND_BLUR_LEVELS) {
      expect(level.suggestedToken).toBe("--ds-bg-blur");
    }
  });
});

describe("DS-5 — configuración futura de imagen personal", () => {
  it("declara DEFAULT_PERSONAL_IMAGE_CONFIG con límites razonables", () => {
    expect(DEFAULT_PERSONAL_IMAGE_CONFIG.maxBytes).toBeGreaterThan(0);
    expect(DEFAULT_PERSONAL_IMAGE_CONFIG.allowedFormats.length).toBeGreaterThan(0);
    expect(["baja", "media", "alta"]).toContain(DEFAULT_PERSONAL_IMAGE_CONFIG.opacity);
    expect(["ninguno", "suave", "medio", "alto"]).toContain(DEFAULT_PERSONAL_IMAGE_CONFIG.blur);
  });
});

describe("DS-5 — sin nombres por vertical de negocio", () => {
  it("no usa palabras como dental, clínico, estética, taller, legal, restaurante, etc.", () => {
    const banned = [
      "dental",
      "clinico",
      "clínico",
      "estetica",
      "estética",
      "veterinaria",
      "taller",
      "legal",
      "restaurante",
      "fisioterapia",
      "nutricion",
      "nutrición",
    ];
    const lower = catalogContent.toLowerCase();
    for (const word of banned) {
      expect(lower).not.toContain(word);
    }
  });
});

describe("DS-5 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es componente cliente, no usa localStorage ni importa de @/server", () => {
    expect(catalogContent).not.toContain('"use client"');
    expect(catalogContent).not.toContain("localStorage");
    expect(catalogContent).not.toMatch(/from\s+"@\/server/);
  });

  it("no usa atributos data-visual-* (sin conexión a globals.css todavía)", () => {
    expect(catalogContent).not.toContain("data-visual");
  });

  it("ningún componente existente importa color-background-catalog todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/color-background-catalog"/);
      }
    }
  });

  it("globals.css no fue modificado por esta fase", () => {
    const globalsCssContentAfter = readFileSync(GLOBALS_CSS_PATH, "utf-8");
    expect(globalsCssContentAfter).toBe(globalsCssContentBefore);
  });
});

describe("DS-5 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell, dashboard-grid y DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
