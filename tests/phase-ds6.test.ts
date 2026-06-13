// NELZZON — Pruebas FASE DS-6 (catálogo declarativo de tipografía).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-ds3/4/5.
// - typography-catalog.ts declara:
//   - TYPOGRAPHY_FAMILY_CATALOG: 5 familias por sensación (clásica,
//     redondeada, técnica, elegante, amigable), todas con pilas de fuentes
//     del sistema (sin @font-face ni imports externos).
//   - TYPOGRAPHY_SIZE_CATALOG: tamaño base (compacto/normal/amplio).
//   - TITLE_SCALE_CATALOG: escala de h1/h2/h3.
//   - TYPOGRAPHY_WEIGHT_CATALOG: pesos (ligero/normal/marcado).
//   - LETTER_SPACING_CATALOG: espaciado entre letras.
//   - LINE_HEIGHT_CATALOG: altura de línea.
//   - TEXT_DENSITY_CATALOG: densidad textual.
// - Sin nombres por vertical de negocio.
// - Capa puramente declarativa: sin componente cliente, sin persistencia,
//   sin conexión a componentes ni a globals.css todavía.
// - No se cambió globals.css ni la estructura base del Dashboard; sin
//   migraciones nuevas.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  TYPOGRAPHY_FAMILY_CATALOG,
  TYPOGRAPHY_FAMILY_CATALOG_KEYS,
  isTypographyFamilyId,
  TYPOGRAPHY_SIZE_CATALOG,
  TITLE_SCALE_CATALOG,
  TYPOGRAPHY_WEIGHT_CATALOG,
  LETTER_SPACING_CATALOG,
  LINE_HEIGHT_CATALOG,
  TEXT_DENSITY_CATALOG,
  type TypographyFamilyId,
} from "../src/lib/typography-catalog";

const CATALOG_PATH = resolve("src/lib/typography-catalog.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const catalogContent = readFileSync(CATALOG_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");
const globalsCssContentBefore = readFileSync(GLOBALS_CSS_PATH, "utf-8");

const EXPECTED_FAMILIES: TypographyFamilyId[] = ["clasica", "redondeada", "tecnica", "elegante", "amigable"];

describe("DS-6 — integridad de archivos", () => {
  it("existe src/lib/typography-catalog.ts", () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-6 — familias por sensación", () => {
  it("TYPOGRAPHY_FAMILY_CATALOG_KEYS contiene exactamente las 5 familias esperadas", () => {
    expect(TYPOGRAPHY_FAMILY_CATALOG_KEYS.sort()).toEqual([...EXPECTED_FAMILIES].sort());
  });

  it("cada familia tiene metadata completa y pila de fuentes del sistema", () => {
    for (const id of EXPECTED_FAMILIES) {
      const family = TYPOGRAPHY_FAMILY_CATALOG[id];
      expect(family).toBeDefined();
      expect(family.id).toBe(id);
      expect(family.label.length).toBeGreaterThan(0);
      expect(family.description.length).toBeGreaterThan(0);
      expect(family.feeling.length).toBeGreaterThan(0);
      expect(family.fontFamily.length).toBeGreaterThan(0);
      expect(family.suggestedToken).toBe("--ds-font-family");
    }
  });

  it("isTypographyFamilyId valida correctamente", () => {
    expect(isTypographyFamilyId("clasica")).toBe(true);
    expect(isTypographyFamilyId("amigable")).toBe(true);
    expect(isTypographyFamilyId("dental")).toBe(false);
    expect(isTypographyFamilyId(undefined)).toBe(false);
  });
});

describe("DS-6 — tamaños, escala de títulos, pesos, espaciado y altura de línea", () => {
  it("TYPOGRAPHY_SIZE_CATALOG declara compacto/normal/amplio", () => {
    expect(TYPOGRAPHY_SIZE_CATALOG.map((s) => s.key)).toEqual(["compacto", "normal", "amplio"]);
    for (const size of TYPOGRAPHY_SIZE_CATALOG) {
      expect(size.baseSizeRem).toBeGreaterThan(0);
      expect(size.suggestedToken).toBe("--ds-font-size-base");
    }
  });

  it("TITLE_SCALE_CATALOG declara compacta/estandar/amplia con h1 > h2 > h3", () => {
    expect(TITLE_SCALE_CATALOG.map((s) => s.key)).toEqual(["compacta", "estandar", "amplia"]);
    for (const scale of TITLE_SCALE_CATALOG) {
      expect(scale.h1).toBeGreaterThan(scale.h2);
      expect(scale.h2).toBeGreaterThan(scale.h3);
    }
  });

  it("TYPOGRAPHY_WEIGHT_CATALOG declara ligero/normal/marcado en orden creciente", () => {
    expect(TYPOGRAPHY_WEIGHT_CATALOG.map((w) => w.key)).toEqual(["ligero", "normal", "marcado"]);
    expect(TYPOGRAPHY_WEIGHT_CATALOG[0].value).toBeLessThan(TYPOGRAPHY_WEIGHT_CATALOG[1].value);
    expect(TYPOGRAPHY_WEIGHT_CATALOG[1].value).toBeLessThan(TYPOGRAPHY_WEIGHT_CATALOG[2].value);
  });

  it("LETTER_SPACING_CATALOG declara ajustado/normal/amplio", () => {
    expect(LETTER_SPACING_CATALOG.map((l) => l.key)).toEqual(["ajustado", "normal", "amplio"]);
    expect(LETTER_SPACING_CATALOG[0].valueEm).toBeLessThan(LETTER_SPACING_CATALOG[1].valueEm);
    expect(LETTER_SPACING_CATALOG[1].valueEm).toBeLessThan(LETTER_SPACING_CATALOG[2].valueEm);
  });

  it("LINE_HEIGHT_CATALOG declara compacta/normal/amplia en orden creciente", () => {
    expect(LINE_HEIGHT_CATALOG.map((l) => l.key)).toEqual(["compacta", "normal", "amplia"]);
    expect(LINE_HEIGHT_CATALOG[0].value).toBeLessThan(LINE_HEIGHT_CATALOG[1].value);
    expect(LINE_HEIGHT_CATALOG[1].value).toBeLessThan(LINE_HEIGHT_CATALOG[2].value);
  });

  it("TEXT_DENSITY_CATALOG declara compacta/cozy/amplia con tokens --ds-space-*", () => {
    expect(TEXT_DENSITY_CATALOG.map((d) => d.key)).toEqual(["compacta", "cozy", "amplia"]);
    for (const density of TEXT_DENSITY_CATALOG) {
      expect(density.suggestedToken).toMatch(/^--ds-space-/);
    }
  });
});

describe("DS-6 — sin fuentes externas", () => {
  it("no usa @font-face, next/font ni URLs de fuentes externas", () => {
    expect(catalogContent).not.toContain("@font-face");
    expect(catalogContent).not.toMatch(/from\s+"next\/font/);
    expect(catalogContent).not.toContain("fonts.googleapis.com");
    expect(catalogContent).not.toContain("fonts.gstatic.com");
  });
});

describe("DS-6 — sin nombres por vertical de negocio", () => {
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

describe("DS-6 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es componente cliente, no usa localStorage ni importa de @/server", () => {
    expect(catalogContent).not.toContain('"use client"');
    expect(catalogContent).not.toContain("localStorage");
    expect(catalogContent).not.toMatch(/from\s+"@\/server/);
  });

  it("no usa atributos data-visual-* (sin conexión a globals.css todavía)", () => {
    expect(catalogContent).not.toContain("data-visual");
  });

  it("ningún componente existente importa typography-catalog todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/typography-catalog"/);
      }
    }
  });

  it("globals.css no fue modificado por esta fase", () => {
    const globalsCssContentAfter = readFileSync(GLOBALS_CSS_PATH, "utf-8");
    expect(globalsCssContentAfter).toBe(globalsCssContentBefore);
  });
});

describe("DS-6 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell, dashboard-grid y DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
