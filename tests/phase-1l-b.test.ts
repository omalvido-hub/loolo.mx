// NELZZON — Pruebas Fase 1L-B (fundación visual premium: tokens aditivos +
// StatCard/SectionCard). Estructurales por readFileSync, siguiendo el patrón
// de tests/phase-1k-e.test.ts:
// - src/app/globals.css: nuevos tokens aditivos (--brand-accent,
//   --brand-accent-soft, --brand-accent-foreground, --surface-elevated,
//   --shadow-soft, --shadow-elevated) en :root y .dark, sin tocar tokens
//   existentes.
// - src/components/ui/stat-card.tsx y src/components/ui/section-card.tsx:
//   componentes nuevos, reutilizables.
// - PatientLiveRecordView.tsx: usa StatCard en lugar del MiniStat local,
//   sin cambiar la lógica (próxima cita, consulta activa, plan, saldo,
//   hallazgos, links).
// No se toca dashboard, agenda, server, DB, migraciones ni VPS.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const GLOBALS_CSS_PATH = resolve("src/app/globals.css");
const STAT_CARD_PATH = resolve("src/components/ui/stat-card.tsx");
const SECTION_CARD_PATH = resolve("src/components/ui/section-card.tsx");
const PATIENT_VIEW_PATH = resolve("src/components/patients/PatientLiveRecordView.tsx");

const globalsContent = readFileSync(GLOBALS_CSS_PATH, "utf-8");
const patientViewContent = readFileSync(PATIENT_VIEW_PATH, "utf-8");

describe("1L-B — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("src/components/ui/stat-card.tsx existe", () => {
    expect(existsSync(STAT_CARD_PATH)).toBe(true);
  });

  it("src/components/ui/section-card.tsx existe", () => {
    expect(existsSync(SECTION_CARD_PATH)).toBe(true);
  });
});

describe("1L-B — globals.css: tokens premium aditivos", () => {
  const tokens = [
    "--brand-accent",
    "--brand-accent-soft",
    "--brand-accent-foreground",
    "--surface-elevated",
    "--shadow-soft",
    "--shadow-elevated",
  ];

  it("define los 6 tokens nuevos en :root", () => {
    const rootBlock = globalsContent.match(/:root\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    for (const token of tokens) {
      expect(rootBlock, `:root debe definir ${token} (directo o vía @theme inline)`).toMatch(
        new RegExp(token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"))
      );
    }
  });

  it("define overrides oscuros para acento y superficie elevada en .dark", () => {
    const darkBlock = globalsContent.match(/\n\.dark\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    for (const token of ["--brand-accent", "--brand-accent-soft", "--brand-accent-foreground", "--surface-elevated"]) {
      expect(darkBlock, `.dark debe sobreescribir ${token}`).toContain(token);
    }
  });

  it("no elimina ningún token existente de :root o .dark", () => {
    const existingRootTokens = ["--background", "--foreground", "--card", "--primary", "--border", "--radius"];
    for (const token of existingRootTokens) {
      expect(globalsContent).toContain(token);
    }
  });
});

describe("1L-B — StatCard", () => {
  const content = readFileSync(STAT_CARD_PATH, "utf-8");

  it("exporta StatCard con el mismo contrato que el MiniStat anterior", () => {
    expect(content).toContain("export function StatCard");
    expect(content).toContain("label");
    expect(content).toContain("value");
    expect(content).toContain("valueClassName");
    expect(content).toContain("action");
    expect(content).toContain("multiline");
  });

  it("usa superficie elevada y sombra suave (tokens premium)", () => {
    expect(content).toContain("bg-surface-elevated");
    expect(content).toContain("shadow-soft");
  });
});

describe("1L-B — SectionCard (componente reutilizable)", () => {
  const content = readFileSync(SECTION_CARD_PATH, "utf-8");

  it("exporta SectionCard con el contrato title/badge/hint/children", () => {
    expect(content).toContain("export function SectionCard");
    expect(content).toContain("title");
    expect(content).toContain("badge");
    expect(content).toContain("hint");
    expect(content).toContain("children");
  });
});

describe("1L-B — PatientLiveRecordView: StatCard en bloque superior, lógica intacta", () => {
  it("importa StatCard desde @/components/ui/stat-card", () => {
    expect(patientViewContent).toContain('import { StatCard } from "@/components/ui/stat-card"');
  });

  it("ya no define MiniStat localmente", () => {
    expect(patientViewContent).not.toContain("function MiniStat");
    expect(patientViewContent).not.toContain("<MiniStat");
  });

  it("usa StatCard para las 5 métricas del bloque superior", () => {
    const matches = patientViewContent.match(/<StatCard/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it("mantiene la lógica funcional: próxima cita, consulta activa, plan, saldo, hallazgos", () => {
    expect(patientViewContent).toContain('label="Próxima cita"');
    expect(patientViewContent).toContain('label="Consulta activa"');
    expect(patientViewContent).toContain('label="Plan"');
    expect(patientViewContent).toContain('label="Saldo"');
    expect(patientViewContent).toContain('label="Hallazgos"');
    expect(patientViewContent).toContain("nextAppt");
    expect(patientViewContent).toContain("activeEncounter");
    expect(patientViewContent).toContain("hasPlan");
    expect(patientViewContent).toContain("balance");
    expect(patientViewContent).toContain("odontogramSummary?.totalFindings");
  });

  it("mantiene los links funcionales (agenda, consultas)", () => {
    expect(patientViewContent).toContain("/agenda?appointmentId=");
    expect(patientViewContent).toContain("/agenda?patientId=");
    expect(patientViewContent).toContain("/consultas/");
  });
});

describe("1L-B — no toca dashboard, agenda ni migraciones", () => {
  it("PatientLiveRecordView no importa nada de dashboard/agenda", () => {
    expect(patientViewContent).not.toMatch(/from ["']@\/components\/dashboard/);
    expect(patientViewContent).not.toMatch(/from ["']@\/components\/agenda/);
  });
});
