// NELZZON — Pruebas FASE DS-7 (catálogo declarativo de tarjetas, widgets y
// acomodo del Dashboard).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-ds3..6.
// - dashboard-card-layout-catalog.ts declara:
//   - Apariencia de tarjetas: CARD_SIZE_CATALOG, CARD_SHAPE_CATALOG,
//     CARD_RADIUS_CATALOG, CARD_SHADOW_CATALOG, CARD_BORDER_CATALOG,
//     CARD_SURFACE_CATALOG (glass/pastel/sólido).
//   - Acomodo del Dashboard: DASHBOARD_ARRANGE_ACTIONS (mover, cambiar
//     tamaño, ocultar/mostrar, ordenar widgets, restaurar).
//   - Zonas fijas del Dashboard base: DASHBOARD_ZONES (kpis-principales,
//     tarjetas-secundarias, accesos-rapidos) y DASHBOARD_BASE_STRUCTURE.
// - Sin nombres por vertical de negocio.
// - Capa puramente declarativa: sin componente cliente, sin persistencia,
//   sin conexión a componentes ni a globals.css todavía.
// - No se cambió globals.css ni la estructura base del Dashboard; sin
//   migraciones nuevas.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  CARD_SIZE_CATALOG,
  CARD_SHAPE_CATALOG,
  CARD_RADIUS_CATALOG,
  CARD_SHADOW_CATALOG,
  CARD_BORDER_CATALOG,
  CARD_SURFACE_CATALOG,
  isCardSizeId,
  isCardShapeId,
  isCardSurfaceStyle,
  DASHBOARD_ARRANGE_ACTIONS,
  isDashboardArrangeActionId,
  DASHBOARD_ZONES,
  isDashboardZoneId,
  getDashboardZone,
  DASHBOARD_BASE_STRUCTURE,
} from "../src/lib/dashboard-card-layout-catalog";

const CATALOG_PATH = resolve("src/lib/dashboard-card-layout-catalog.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");
const GLOBALS_CSS_PATH = resolve("src/app/globals.css");

const catalogContent = readFileSync(CATALOG_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");
const globalsCssContentBefore = readFileSync(GLOBALS_CSS_PATH, "utf-8");

describe("DS-7 — integridad de archivos", () => {
  it("existe src/lib/dashboard-card-layout-catalog.ts", () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-7 — catálogo de tarjetas y widgets", () => {
  it("CARD_SIZE_CATALOG declara compacto/normal/grande", () => {
    expect(CARD_SIZE_CATALOG.map((c) => c.key)).toEqual(["compacto", "normal", "grande"]);
    for (const size of CARD_SIZE_CATALOG) {
      expect(size.label.length).toBeGreaterThan(0);
      expect(size.suggestedToken).toMatch(/^--ds-/);
    }
  });

  it("CARD_SHAPE_CATALOG declara cuadrado/redondo", () => {
    expect(CARD_SHAPE_CATALOG.map((c) => c.key)).toEqual(["cuadrado", "redondo"]);
    for (const shape of CARD_SHAPE_CATALOG) {
      expect(shape.suggestedToken).toMatch(/^--ds-radius-/);
    }
  });

  it("CARD_RADIUS_CATALOG declara una escala de redondez", () => {
    expect(CARD_RADIUS_CATALOG.map((c) => c.key)).toEqual(["recto", "suave", "redondeado", "muy-redondeado"]);
    for (const radius of CARD_RADIUS_CATALOG) {
      expect(radius.suggestedToken).toMatch(/^--ds-radius-/);
    }
  });

  it("CARD_SHADOW_CATALOG declara niveles de sombra referenciando --ds-shadow-*", () => {
    expect(CARD_SHADOW_CATALOG.map((c) => c.key)).toEqual(["ninguna", "suave", "media", "elevada"]);
    for (const shadow of CARD_SHADOW_CATALOG) {
      expect(shadow.suggestedToken).toMatch(/^--ds-shadow-/);
    }
  });

  it("CARD_BORDER_CATALOG declara estilos de borde", () => {
    expect(CARD_BORDER_CATALOG.map((c) => c.key)).toEqual(["ninguno", "suave", "acento"]);
    for (const border of CARD_BORDER_CATALOG) {
      expect(border.suggestedToken).toMatch(/^--ds-/);
    }
  });

  it("CARD_SURFACE_CATALOG declara glass/pastel/solido", () => {
    expect(CARD_SURFACE_CATALOG.map((c) => c.key)).toEqual(["glass", "pastel", "solido"]);
    for (const surface of CARD_SURFACE_CATALOG) {
      expect(surface.description.length).toBeGreaterThan(0);
      expect(surface.suggestedToken).toMatch(/^--ds-/);
    }
  });

  it("type-guards de tarjetas validan correctamente", () => {
    expect(isCardSizeId("compacto")).toBe(true);
    expect(isCardSizeId("dental")).toBe(false);
    expect(isCardShapeId("redondo")).toBe(true);
    expect(isCardShapeId(undefined)).toBe(false);
    expect(isCardSurfaceStyle("glass")).toBe(true);
    expect(isCardSurfaceStyle("vidrio")).toBe(false);
  });
});

describe("DS-7 — acomodo del Dashboard", () => {
  it("DASHBOARD_ARRANGE_ACTIONS incluye mover, cambiar tamaño, ocultar/mostrar, ordenar widgets y restaurar", () => {
    expect(DASHBOARD_ARRANGE_ACTIONS.map((a) => a.key)).toEqual([
      "mover",
      "cambiar-tamano",
      "ocultar-mostrar",
      "ordenar-widgets",
      "restaurar",
    ]);
    for (const action of DASHBOARD_ARRANGE_ACTIONS) {
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
    }
  });

  it("isDashboardArrangeActionId valida correctamente", () => {
    expect(isDashboardArrangeActionId("restaurar")).toBe(true);
    expect(isDashboardArrangeActionId("eliminar")).toBe(false);
  });
});

describe("DS-7 — estructura base del Dashboard respetada por las zonas", () => {
  it("DASHBOARD_ZONES declara kpis-principales, tarjetas-secundarias y accesos-rapidos", () => {
    expect(DASHBOARD_ZONES.map((z) => z.id)).toEqual([
      "kpis-principales",
      "tarjetas-secundarias",
      "accesos-rapidos",
    ]);
  });

  it("la zona kpis-principales tiene 4 tarjetas fijas en 1 fila", () => {
    const zone = getDashboardZone("kpis-principales");
    expect(zone.cardCount).toBe(4);
    expect(zone.fixedCardCount).toBe(true);
    expect(zone.columns).toBe(4);
    expect(zone.rows).toBe(1);
  });

  it("la zona tarjetas-secundarias tiene 4 tarjetas fijas en 2x2", () => {
    const zone = getDashboardZone("tarjetas-secundarias");
    expect(zone.cardCount).toBe(4);
    expect(zone.fixedCardCount).toBe(true);
    expect(zone.columns).toBe(2);
    expect(zone.rows).toBe(2);
    expect(zone.orientation).toBe("horizontal");
  });

  it("la zona accesos-rapidos es independiente de las KPIs", () => {
    const zone = getDashboardZone("accesos-rapidos");
    expect(zone.fixedCardCount).toBe(false);
    expect(zone.id).not.toBe("kpis-principales");
    expect(zone.id).not.toBe("tarjetas-secundarias");
  });

  it("isDashboardZoneId valida correctamente", () => {
    expect(isDashboardZoneId("kpis-principales")).toBe(true);
    expect(isDashboardZoneId("zona-extra")).toBe(false);
  });

  it("DASHBOARD_BASE_STRUCTURE coincide con el Dashboard base aprobado", () => {
    expect(DASHBOARD_BASE_STRUCTURE.kpiRowCardCount).toBe(4);
    expect(DASHBOARD_BASE_STRUCTURE.secondaryGridColumns).toBe(2);
    expect(DASHBOARD_BASE_STRUCTURE.secondaryGridRows).toBe(2);
    expect(DASHBOARD_BASE_STRUCTURE.secondaryCardCount).toBe(4);
    expect(DASHBOARD_BASE_STRUCTURE.quickAccessIsSeparateZone).toBe(true);
  });
});

describe("DS-7 — sin nombres por vertical de negocio", () => {
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

describe("DS-7 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es componente cliente, no usa localStorage ni importa de @/server", () => {
    expect(catalogContent).not.toContain('"use client"');
    expect(catalogContent).not.toContain("localStorage");
    expect(catalogContent).not.toMatch(/from\s+"@\/server/);
  });

  it("no usa atributos data-visual-* (sin conexión a globals.css todavía)", () => {
    expect(catalogContent).not.toContain("data-visual");
  });

  it("ningún componente existente importa dashboard-card-layout-catalog todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/dashboard-card-layout-catalog"/);
      }
    }
  });

  it("globals.css no fue modificado por esta fase", () => {
    const globalsCssContentAfter = readFileSync(GLOBALS_CSS_PATH, "utf-8");
    expect(globalsCssContentAfter).toBe(globalsCssContentBefore);
  });
});

describe("DS-7 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell, dashboard-grid y DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
