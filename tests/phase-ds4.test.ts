// NELZZON — Pruebas FASE DS-4 (catálogo declarativo de paquetes de iconos).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-ds3.
// - icon-package-catalog.ts declara ICON_PACKAGE_CATALOG con los 12
//   paquetes universales (docs/nelzzon-design-system-v1.md, sección 5.5),
//   cada uno con metadata simple (id, label, description, style, weight,
//   roundness, depth, suggestedSize, supportsIconOnly,
//   supportsIconWithText, suggestedTokens), y ICON_MODULES con los 15
//   módulos base que en fases futuras podrán usar iconos.
// - Sin nombres por vertical de negocio.
// - Capa puramente declarativa: sin componente cliente, sin persistencia,
//   sin conexión a componentes ni a atributos visuales todavía.
// - No se cambió la estructura base del Dashboard ni se crearon migraciones.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  ICON_PACKAGE_CATALOG,
  ICON_PACKAGE_CATALOG_KEYS,
  isIconPackageId,
  ICON_MODULES,
  isIconModuleId,
  type IconPackageId,
  type IconModuleId,
} from "../src/lib/icon-package-catalog";

const CATALOG_PATH = resolve("src/lib/icon-package-catalog.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const catalogContent = readFileSync(CATALOG_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

const EXPECTED_PACKAGES: IconPackageId[] = [
  "lineal-limpio",
  "solido-minimal",
  "pastel-app",
  "3d-suave",
  "peluche-fuzzy",
  "clay-plastilina",
  "glass",
  "premium-elegante",
  "cute",
  "tech",
  "bold",
  "ilustrado",
];

const EXPECTED_MODULES: IconModuleId[] = [
  "pacientes",
  "agenda",
  "consultas",
  "presupuestos",
  "cobros",
  "documentos",
  "reportes",
  "portal",
  "mensajes",
  "tareas",
  "configuracion",
  "archivos",
  "notificaciones",
  "metas",
  "indicadores",
];

describe("DS-4 — integridad de archivos", () => {
  it("existe src/lib/icon-package-catalog.ts", () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-4 — catálogo: existen los 12 paquetes requeridos", () => {
  it("ICON_PACKAGE_CATALOG_KEYS contiene exactamente los 12 paquetes esperados", () => {
    expect(ICON_PACKAGE_CATALOG_KEYS.sort()).toEqual([...EXPECTED_PACKAGES].sort());
    expect(ICON_PACKAGE_CATALOG_KEYS).toHaveLength(12);
  });

  it("cada paquete tiene metadata completa", () => {
    for (const id of EXPECTED_PACKAGES) {
      const pkg = ICON_PACKAGE_CATALOG[id];
      expect(pkg).toBeDefined();
      expect(pkg.id).toBe(id);
      expect(pkg.label.length).toBeGreaterThan(0);
      expect(pkg.description.length).toBeGreaterThan(0);
      expect(pkg.style.length).toBeGreaterThan(0);
      expect(["fino", "medio", "grueso"]).toContain(pkg.weight);
      expect(["recto", "suave", "redondeado", "muy-redondeado"]).toContain(pkg.roundness);
      expect(["plano", "sutil", "volumen"]).toContain(pkg.depth);
      expect(["pequeño", "normal", "grande"]).toContain(pkg.suggestedSize);
      expect(typeof pkg.supportsIconOnly).toBe("boolean");
      expect(typeof pkg.supportsIconWithText).toBe("boolean");
      expect(pkg.suggestedTokens.size).toMatch(/^--ds-/);
      expect(pkg.suggestedTokens.strokeWidth).toMatch(/^--ds-/);
      expect(pkg.suggestedTokens.radius).toMatch(/^--ds-/);
      expect(pkg.suggestedTokens.accent).toMatch(/^--ds-/);
    }
  });

  it("isIconPackageId valida correctamente", () => {
    expect(isIconPackageId("lineal-limpio")).toBe(true);
    expect(isIconPackageId("3d-suave")).toBe(true);
    expect(isIconPackageId("dental-premium")).toBe(false);
    expect(isIconPackageId(undefined)).toBe(false);
  });
});

describe("DS-4 — catálogo: existen los 15 módulos base", () => {
  it("ICON_MODULES contiene exactamente los 15 módulos esperados", () => {
    expect(ICON_MODULES.map((m) => m.key).sort()).toEqual([...EXPECTED_MODULES].sort());
    expect(ICON_MODULES).toHaveLength(15);
    for (const m of ICON_MODULES) {
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it("isIconModuleId valida correctamente", () => {
    expect(isIconModuleId("pacientes")).toBe(true);
    expect(isIconModuleId("indicadores")).toBe(true);
    expect(isIconModuleId("odontograma")).toBe(false);
    expect(isIconModuleId(undefined)).toBe(false);
  });
});

describe("DS-4 — sin nombres por vertical de negocio", () => {
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

describe("DS-4 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es componente cliente, no usa localStorage ni importa de @/server", () => {
    expect(catalogContent).not.toContain('"use client"');
    expect(catalogContent).not.toContain("localStorage");
    expect(catalogContent).not.toMatch(/from\s+"@\/server/);
  });

  it("no usa atributos data-visual-* (sin conexión a globals.css todavía)", () => {
    expect(catalogContent).not.toContain("data-visual");
  });

  it("ningún componente existente importa icon-package-catalog todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/icon-package-catalog"/);
      }
    }
  });

  it("globals.css no fue modificado por esta fase (sin selectores nuevos por paquete)", () => {
    const globalsCssContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
    for (const id of EXPECTED_PACKAGES) {
      expect(globalsCssContent).not.toContain(`data-visual-icon-package="${id}"`);
    }
  });
});

describe("DS-4 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell, dashboard-grid y DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
