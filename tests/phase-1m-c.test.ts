// NELZZON — Pruebas Fase 1M-C (Identidad visual de módulos/KPIs/widgets, sin DB).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-1m-a/b.
// - module-identity: MODULE_IDENTITY_REGISTRY extensible (8 widgets + 13
//   módulos), 9 estilos / 9 colores / 3 formas / 4 tipos, provider con
//   getIdentity/setIdentity/resetIdentity/resetAllIcons/resetAllIdentities,
//   persistencia en localStorage nelzzon.moduleIdentity.v1.
// - ModuleIcon: renderiza emoji/icono/iniciales/badge según identidad.
// - KpiWidget: prop iconWrapped para iconos autocontenidos.
// - DashboardKpiGrid: usa ModuleIcon + useModuleIdentities, oculta cuando
//   hidden, conserva appointmentsToday/CitasHoyKpi/listAppointmentsByRange.
// - AppShell: envuelve con ModuleIdentityProvider.
// - ModuleIdentityCustomizer: existe y se usa en PersonalizationPanel.
// - Fuera de alcance: server, prisma, migraciones nuevas, agenda, pacientes.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const MODULE_IDENTITY_PATH = resolve("src/lib/module-identity.tsx");
const MODULE_ICON_PATH = resolve("src/components/ui/module-icon.tsx");
const KPI_WIDGET_PATH = resolve("src/components/ui/kpi-widget.tsx");
const DASHBOARD_KPI_GRID_PATH = resolve("src/components/dashboard/DashboardKpiGrid.tsx");
const APP_SHELL_PATH = resolve("src/components/shell/AppShell.tsx");
const CUSTOMIZER_PATH = resolve("src/components/shell/ModuleIdentityCustomizer.tsx");
const PERSONALIZATION_PANEL_PATH = resolve("src/components/shell/PersonalizationPanel.tsx");
const PERSONALIZATION_DETAILS_PATH = resolve("src/components/shell/PersonalizationDetails.tsx");

const moduleIdentityContent = readFileSync(MODULE_IDENTITY_PATH, "utf-8");
const moduleIconContent = readFileSync(MODULE_ICON_PATH, "utf-8");
const kpiWidgetContent = readFileSync(KPI_WIDGET_PATH, "utf-8");
const dashboardKpiGridContent = readFileSync(DASHBOARD_KPI_GRID_PATH, "utf-8");
const appShellContent = readFileSync(APP_SHELL_PATH, "utf-8");
const customizerContent = readFileSync(CUSTOMIZER_PATH, "utf-8");
const panelContent = readFileSync(PERSONALIZATION_PANEL_PATH, "utf-8");
const personalizationDetailsContent = readFileSync(PERSONALIZATION_DETAILS_PATH, "utf-8");

describe("1M-C — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("existen module-identity.tsx, module-icon.tsx y ModuleIdentityCustomizer.tsx", () => {
    expect(existsSync(MODULE_IDENTITY_PATH)).toBe(true);
    expect(existsSync(MODULE_ICON_PATH)).toBe(true);
    expect(existsSync(CUSTOMIZER_PATH)).toBe(true);
  });
});

describe("1M-C — module-identity: registro extensible y tipos", () => {
  it("declara MODULE_IDENTITY_REGISTRY con 8 widgets de dashboard y 13 módulos del sistema", () => {
    expect(moduleIdentityContent).toContain("MODULE_IDENTITY_REGISTRY");
    for (const id of [
      "kpi-citas",
      "kpi-cobrado",
      "kpi-porcobrar",
      "kpi-presupuestos",
      "kpi-tratamientos",
      "kpi-ingresos",
      "kpi-punto-equilibrio",
      "kpi-meta-mensual",
    ]) {
      expect(moduleIdentityContent).toContain(`id: "${id}"`);
      expect(moduleIdentityContent).toContain(`"dashboard-widget"`);
    }
    for (const id of [
      "module-pacientes",
      "module-agenda",
      "module-consultas",
      "module-odontograma",
      "module-presupuestos",
      "module-cobros",
      "module-documentos",
      "module-portal",
      "module-reportes",
      "module-fiscal",
      "module-inventario",
      "module-seguimiento",
      "module-configuracion",
    ]) {
      expect(moduleIdentityContent).toContain(`id: "${id}"`);
    }
  });

  it("declara los 4 tipos de identidad: emoji, icono, iniciales, badge", () => {
    expect(moduleIdentityContent).toContain('"emoji" | "icon" | "initials" | "badge"');
  });

  it("declara los 9 estilos de icono requeridos", () => {
    for (const style of ["outline", "solid-soft", "duotone", "glass", "badge", "emoji", "executive", "clinical", "minimal"]) {
      expect(moduleIdentityContent).toContain(`"${style}"`);
    }
  });

  it("declara la paleta curada de 9 colores", () => {
    for (const color of ["teal", "violet", "emerald", "amber", "rose", "slate", "blue", "cyan", "neutral"]) {
      expect(moduleIdentityContent).toContain(`"${color}"`);
    }
  });

  it("declara las 3 formas de contenedor", () => {
    for (const shape of ["circle", "square", "pill"]) {
      expect(moduleIdentityContent).toContain(`"${shape}"`);
    }
  });

  it("declara bibliotecas curadas de iconos y emoji agrupadas por categoría", () => {
    expect(moduleIdentityContent).toContain("MODULE_ICON_LIBRARY");
    expect(moduleIdentityContent).toContain("MODULE_EMOJI_LIBRARY");
    expect(moduleIdentityContent).toContain("MODULE_ICON_CATEGORIES");
    for (const cat of ["clinico", "dinero", "agenda", "documentos", "metas", "reportes", "operacion", "usuarios"]) {
      expect(moduleIdentityContent).toContain(`"${cat}"`);
    }
  });

  it("usa la clave de localStorage nelzzon.moduleIdentity.v1", () => {
    expect(moduleIdentityContent).toContain('MODULE_IDENTITY_STORAGE_KEY = "nelzzon.moduleIdentity.v1"');
  });

  it("expone provider y hook con getIdentity/setIdentity/resetIdentity/resetAllIcons/resetAllIdentities", () => {
    expect(moduleIdentityContent).toContain("export function ModuleIdentityProvider");
    expect(moduleIdentityContent).toContain("export function useModuleIdentities");
    for (const fn of ["getIdentity", "setIdentity", "resetIdentity", "resetAllIcons", "resetAllIdentities"]) {
      expect(moduleIdentityContent).toContain(fn);
    }
  });

  it("resetAllIcons preserva la visibilidad explícita y resetAllIdentities limpia todo", () => {
    expect(moduleIdentityContent).toMatch(/function resetAllIcons\(\)/);
    expect(moduleIdentityContent).toMatch(/function resetAllIdentities\(\)\s*{\s*setOverrides\(\{\}\);/);
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(moduleIdentityContent.split("\n")[0].trim()).toBe('"use client";');
    expect(moduleIdentityContent).not.toMatch(/from\s+"@\/server/);
    expect(moduleIdentityContent).not.toMatch(/prisma/i);
  });
});

describe("1M-C — ModuleIcon: renderiza por tipo", () => {
  it("exporta ModuleIcon y usa useModuleIdentities", () => {
    expect(moduleIconContent).toContain("export function ModuleIcon");
    expect(moduleIconContent).toContain("useModuleIdentities");
  });

  it("contempla los 4 tipos de identidad al renderizar", () => {
    expect(moduleIconContent).toContain('view.type === "emoji"');
    expect(moduleIconContent).toContain('view.type === "initials"');
    expect(moduleIconContent).toContain('view.type === "badge"');
    expect(moduleIconContent).toContain("MODULE_ICON_LIBRARY");
  });
});

describe("1M-C — KpiWidget: icono autocontenido opcional", () => {
  it("declara la prop iconWrapped", () => {
    expect(kpiWidgetContent).toContain("iconWrapped");
  });

  it("renderiza el icono sin envoltura cuando iconWrapped es false", () => {
    expect(kpiWidgetContent).toMatch(/icon\s*&&\s*!iconWrapped\s*&&\s*icon/);
  });
});

describe("1M-C — DashboardKpiGrid: identidad aplicada y ocultamiento", () => {
  it("importa ModuleIcon y useModuleIdentities", () => {
    expect(dashboardKpiGridContent).toMatch(/from\s+"@\/components\/ui\/module-icon"/);
    expect(dashboardKpiGridContent).toMatch(/from\s+"@\/lib\/module-identity"/);
  });

  it("usa ModuleIcon con iconWrapped={false} para las tarjetas", () => {
    expect(dashboardKpiGridContent).toContain("<ModuleIcon id={cardId} fallbackIcon={Icon} />");
    expect(dashboardKpiGridContent).toContain("iconWrapped={false}");
  });

  it("oculta una tarjeta cuando su identidad está marcada como hidden", () => {
    expect(dashboardKpiGridContent).toMatch(/if\s*\(getIdentity\(cardId\)\.hidden\)\s*return null;/);
  });

  it("conserva appointmentsToday, CitasHoyKpi y la llamada real de agenda", () => {
    expect(dashboardKpiGridContent).toContain("appointmentsToday");
    expect(dashboardKpiGridContent).toContain("export function CitasHoyKpi");
    expect(dashboardKpiGridContent).toContain("APPT_STATUS_ES");
  });

  it("sigue usando KpiWidget", () => {
    expect(dashboardKpiGridContent).toMatch(/from\s+"@\/components\/ui\/kpi-widget"/);
    expect(dashboardKpiGridContent).toContain("<KpiWidget");
  });
});

describe("1M-C — AppShell: envuelve con ModuleIdentityProvider", () => {
  it("importa y usa ModuleIdentityProvider", () => {
    expect(appShellContent).toMatch(/from\s+"@\/lib\/module-identity"/);
    expect(appShellContent).toContain("<ModuleIdentityProvider>");
    expect(appShellContent).toContain("</ModuleIdentityProvider>");
  });

  it("conserva VisualPreferencesProvider", () => {
    expect(appShellContent).toContain("<VisualPreferencesProvider>");
  });
});

describe("1M-C — ModuleIdentityCustomizer: UI de Personalizar > Módulos", () => {
  it("exporta ModuleIdentityCustomizer", () => {
    expect(customizerContent).toContain("export function ModuleIdentityCustomizer");
  });

  it("ofrece selector de tipo Emoji/Icono/Iniciales/Badge", () => {
    expect(customizerContent).toContain('{ key: "icon", label: "Icono" }');
    expect(customizerContent).toContain('{ key: "emoji", label: "Emoji" }');
    expect(customizerContent).toContain('{ key: "initials", label: "Iniciales" }');
    expect(customizerContent).toContain('{ key: "badge", label: "Badge" }');
  });

  it("ofrece selectores de estilo, color y forma usando las listas curadas", () => {
    expect(customizerContent).toContain("MODULE_ICON_STYLES");
    expect(customizerContent).toContain("MODULE_ACCENT_COLORS");
    expect(customizerContent).toContain("MODULE_SHAPES");
  });

  it("ofrece mostrar/ocultar y reset individual", () => {
    expect(customizerContent).toContain("setIdentity(def.id, { hidden:");
    expect(customizerContent).toContain("resetIdentity(def.id)");
  });

  it("ofrece reset global de iconos y de identidad completa", () => {
    expect(customizerContent).toContain("resetAllIcons");
    expect(customizerContent).toContain("resetAllIdentities");
  });

  it("separa widgets del Dashboard de los módulos del sistema", () => {
    expect(customizerContent).toContain('section === "dashboard-widget"');
    expect(customizerContent).toContain('section === "module"');
  });

  it('se siente como personalizar módulos, no como poner emojis decorativos', () => {
    expect(customizerContent).toContain("Estoy personalizando mis módulos");
  });

  it("sigue siendo cliente, sin DB ni server actions", () => {
    expect(customizerContent.split("\n")[0].trim()).toBe('"use client";');
    expect(customizerContent).not.toMatch(/from\s+"@\/server/);
    expect(customizerContent).not.toMatch(/prisma/i);
  });
});

describe("1M-C — Personalizar: integra el customizer en Iconos (edición uno por uno)", () => {
  it("importa y usa ModuleIdentityCustomizer", () => {
    expect(personalizationDetailsContent).toMatch(/from\s+"@\/components\/shell\/ModuleIdentityCustomizer"/);
    expect(personalizationDetailsContent).toContain("<ModuleIdentityCustomizer />");
  });
});

describe("1M-C — alcance: no toca server/prisma/agenda/pacientes/cobros/presupuestos", () => {
  it("los archivos nuevos/editados de la capa visual no importan de server/** (salvo el tipo ya existente AppointmentListItem)", () => {
    for (const content of [moduleIdentityContent, moduleIconContent, kpiWidgetContent, appShellContent, customizerContent, panelContent]) {
      expect(content).not.toMatch(/from\s+"@\/server/);
    }
    expect(dashboardKpiGridContent).toMatch(/import type \{ AppointmentListItem \} from "@\/server\/domain\/agenda\/queries"/);
  });

  it("no se tocaron archivos de agenda ni pacientes", () => {
    expect(existsSync(resolve("src/components/agenda"))).toBe(true);
    expect(existsSync(resolve("src/components/patients"))).toBe(true);
  });
});
