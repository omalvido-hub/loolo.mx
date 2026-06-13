// NELZZON — Pruebas FASE DS-3 (catálogo declarativo de estilos visuales
// globales). Estructurales por readFileSync, siguiendo el patrón de
// tests/phase-ds2.
// - visual-style-catalog.ts declara VISUAL_STYLE_CATALOG con las 15
//   personalidades visuales universales (docs/nelzzon-design-system-v1.md,
//   sección 5.1), cada una con metadata simple (id, label, description,
//   colorLevel, shadowLevel, radius, density, feeling, suggestedTokens).
// - Sin nombres por vertical de negocio.
// - Capa puramente declarativa: sin "use client", sin persistencia, sin
//   conexión a componentes ni a data-visual-* todavía.
// - No se cambió la estructura base del Dashboard ni se crearon migraciones.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  VISUAL_STYLE_CATALOG,
  VISUAL_STYLE_CATALOG_KEYS,
  isVisualStyleId,
  type VisualStyleId,
} from "../src/lib/visual-style-catalog";

const CATALOG_PATH = resolve("src/lib/visual-style-catalog.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const catalogContent = readFileSync(CATALOG_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

const EXPECTED_STYLES: VisualStyleId[] = [
  "limpio",
  "moderno",
  "elegante",
  "colorido",
  "minimalista",
  "suave-pastel",
  "fuerte",
  "oscuro",
  "premium",
  "glass",
  "3d-suave",
  "cute",
  "peluche-fuzzy",
  "clay-plastilina",
  "profesional",
];

describe("DS-3 — integridad de archivos", () => {
  it("existe src/lib/visual-style-catalog.ts", () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-3 — catálogo: existen los 15 estilos requeridos", () => {
  it("VISUAL_STYLE_CATALOG_KEYS contiene exactamente los 15 estilos esperados", () => {
    expect(VISUAL_STYLE_CATALOG_KEYS.sort()).toEqual([...EXPECTED_STYLES].sort());
    expect(VISUAL_STYLE_CATALOG_KEYS).toHaveLength(15);
  });

  it("cada estilo tiene metadata completa: label, description, colorLevel, shadowLevel, radius, density, feeling, suggestedTokens", () => {
    for (const id of EXPECTED_STYLES) {
      const style = VISUAL_STYLE_CATALOG[id];
      expect(style).toBeDefined();
      expect(style.id).toBe(id);
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
      expect(["neutro", "suave", "medio", "vivo"]).toContain(style.colorLevel);
      expect(["ninguna", "suave", "media", "elevada"]).toContain(style.shadowLevel);
      expect(["recto", "suave", "redondeado", "muy-redondeado"]).toContain(style.radius);
      expect(["compacta", "cozy", "amplia"]).toContain(style.density);
      expect(style.feeling.length).toBeGreaterThan(0);
      expect(style.suggestedTokens.radius).toMatch(/^--ds-/);
      expect(style.suggestedTokens.shadow).toMatch(/^--ds-/);
      expect(style.suggestedTokens.density).toMatch(/^--ds-/);
      expect(style.suggestedTokens.accent).toMatch(/^--ds-/);
    }
  });

  it("isVisualStyleId valida correctamente", () => {
    expect(isVisualStyleId("limpio")).toBe(true);
    expect(isVisualStyleId("3d-suave")).toBe(true);
    expect(isVisualStyleId("dental-premium")).toBe(false);
    expect(isVisualStyleId(undefined)).toBe(false);
  });
});

describe("DS-3 — sin nombres por vertical de negocio", () => {
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

describe("DS-3 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es 'use client', no usa localStorage ni importa de @/server", () => {
    expect(catalogContent).not.toContain('"use client"');
    expect(catalogContent).not.toContain("localStorage");
    expect(catalogContent).not.toMatch(/from\s+"@\/server/);
  });

  it("no usa data-visual-* (sin conexión a globals.css todavía)", () => {
    expect(catalogContent).not.toContain("data-visual-");
  });

  it("ningún componente existente importa visual-style-catalog todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/visual-style-catalog"/);
      }
    }
  });

  it("globals.css no fue modificado por esta fase (no agrega selectores nuevos para los 15 estilos)", () => {
    const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
    for (const id of EXPECTED_STYLES) {
      expect(globalsCssContent).not.toContain(`data-visual-style="${id}"`);
    }
  });
});

describe("DS-3 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell, dashboard-grid y DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
