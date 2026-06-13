// NELZZON — Pruebas FASE DS-2 (fundación de "alcance visual": dashboard vs
// system). Estructurales por readFileSync, siguiendo el patrón de
// tests/phase-1m-*.
// - visual-scope.ts declara VisualScope ("dashboard" | "system"),
//   VISUAL_SCOPES, DEFAULT_VISUAL_SCOPE ("system") e isVisualScope.
// - Es una capa puramente declarativa: sin localStorage, sin "use client",
//   sin conexión a componentes visuales todavía.
// - No se cambió la estructura base del Dashboard ni se crearon migraciones.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  VISUAL_SCOPES,
  DEFAULT_VISUAL_SCOPE,
  isVisualScope,
  SYSTEM_SURFACES,
  type VisualScope,
} from "../src/lib/visual-scope";

const VISUAL_SCOPE_PATH = resolve("src/lib/visual-scope.ts");
const DASHBOARD_PAGE_PATH = resolve("src/app/(app)/dashboard/page.tsx");

const visualScopeContent = readFileSync(VISUAL_SCOPE_PATH, "utf-8");
const dashboardPageContent = readFileSync(DASHBOARD_PAGE_PATH, "utf-8");

describe("DS-2 — integridad de archivos", () => {
  it("existe src/lib/visual-scope.ts", () => {
    expect(existsSync(VISUAL_SCOPE_PATH)).toBe(true);
  });

  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });
});

describe("DS-2 — VisualScope: tipos y valores", () => {
  it("declara el tipo VisualScope con 'dashboard' y 'system'", () => {
    expect(visualScopeContent).toContain('export type VisualScope = "dashboard" | "system"');
  });

  it("VISUAL_SCOPES tiene exactamente las 2 entradas dashboard/system", () => {
    expect(VISUAL_SCOPES.map((s) => s.key)).toEqual(["dashboard", "system"]);
    for (const scope of VISUAL_SCOPES) {
      expect(scope.label.length).toBeGreaterThan(0);
      expect(scope.description.length).toBeGreaterThan(0);
    }
  });

  it("el alcance por defecto es 'system'", () => {
    expect(DEFAULT_VISUAL_SCOPE).toBe("system");
  });

  it("isVisualScope valida correctamente", () => {
    expect(isVisualScope("dashboard")).toBe(true);
    expect(isVisualScope("system")).toBe(true);
    expect(isVisualScope("otro")).toBe(false);
    expect(isVisualScope(undefined)).toBe(false);

    const value: VisualScope = "system";
    expect(value).toBe(DEFAULT_VISUAL_SCOPE);
  });

  it("declara SYSTEM_SURFACES con las pantallas de 'Todo el sistema'", () => {
    const keys = SYSTEM_SURFACES.map((s) => s.key);
    for (const expected of [
      "dashboard",
      "pacientes",
      "ficha-paciente",
      "agenda",
      "consultas",
      "cobros",
      "presupuestos",
      "documentos",
      "portal-paciente",
      "fiscal",
      "configuracion",
      "personalizar",
    ]) {
      expect(keys).toContain(expected);
    }
  });
});

describe("DS-2 — sin nombres por vertical de negocio", () => {
  it("no usa palabras como dental, clínico, estética, etc. en visual-scope.ts", () => {
    const banned = ["dental", "clinico", "clínico", "estetica", "estética", "veterinaria", "taller"];
    const lower = visualScopeContent.toLowerCase();
    for (const word of banned) {
      expect(lower).not.toContain(word);
    }
  });
});

describe("DS-2 — alcance: capa declarativa, sin conexión a UI todavía", () => {
  it("no es 'use client', no usa localStorage ni importa de @/server", () => {
    expect(visualScopeContent).not.toContain('"use client"');
    expect(visualScopeContent).not.toContain("localStorage");
    expect(visualScopeContent).not.toMatch(/from\s+"@\/server/);
  });

  it("ningún componente existente importa visual-scope todavía", () => {
    const componentDirs = ["src/components", "src/app"];
    for (const dir of componentDirs) {
      const files = readdirSync(resolve(dir), { recursive: true, encoding: "utf-8" })
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
      for (const file of files) {
        const content = readFileSync(resolve(dir, file), "utf-8");
        expect(content).not.toMatch(/from\s+"@\/lib\/visual-scope"/);
      }
    }
  });
});

describe("DS-2 — no se cambió la estructura base del Dashboard", () => {
  it("conserva dashboard-shell y dashboard-grid", () => {
    expect(dashboardPageContent).toContain("dashboard-shell");
    expect(dashboardPageContent).toContain("dashboard-grid");
  });

  it("conserva DashboardKpiGrid", () => {
    expect(dashboardPageContent).toContain("DashboardKpiGrid");
  });
});
