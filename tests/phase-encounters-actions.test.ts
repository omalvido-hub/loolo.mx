// NELZZON — Pruebas NELZZON-ENCOUNTERS-1A-ACTIONS (server actions de consultas clínicas).
// Las server actions no son ejecutables en Vitest (requieren runtime Next.js).
// Las pruebas verifican estructura y contrato del archivo por readFileSync:
// - Sin migración 0019+.
// - encounters.ts existe con "use server" en primera línea.
// - Exactamente 6 funciones exportadas (ni más, ni menos).
// - Cada acción esperada está presente.
// - revalidatePath se llama con los patrones esperados (10 llamadas en total).
// - No hay SQL ni llamadas exec directas (sin lógica de negocio propia).
// - Captura UnauthorizedError / NoOrganizationError en cada acción.
// - Importa las 6 funciones de dominio de encounters.ts.

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENCOUNTERS_ACTIONS_PATH = resolve("src/server/actions/encounters.ts");

const EXPECTED_ACTIONS = [
  "createEncounterAction",
  "startEncounterAction",
  "updateEncounterAction",
  "addClinicalNoteAction",
  "finalizeEncounterAction",
  "cancelEncounterAction",
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// 1. Integridad de archivos
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1A-ACTIONS — integridad de archivos", () => {
  it("no existe migración 0019 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 19)).toBe(false);
  });

  it("src/server/actions/encounters.ts existe", () => {
    expect(existsSync(ENCOUNTERS_ACTIONS_PATH)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Verificación estructural de encounters.ts
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1A-ACTIONS — verificación estructural de encounters.ts", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(ENCOUNTERS_ACTIONS_PATH, "utf-8");
  });

  it('primera línea es "use server";', () => {
    const firstLine = content.split("\n")[0].trim();
    expect(firstLine).toBe('"use server";');
  });

  it.each(EXPECTED_ACTIONS)("exporta %s", (name) => {
    expect(content).toContain(`export async function ${name}`);
  });

  it("exporta exactamente 6 funciones (ni más, ni menos)", () => {
    const exported = (content.match(/^export async function \w+/gm) ?? []);
    expect(exported.length).toBe(6);
  });

  it("importa revalidatePath de next/cache", () => {
    expect(content).toContain(`from "next/cache"`);
    expect(content).toContain("revalidatePath");
  });

  it("revalidatePath se llama 10 veces en total con los patrones esperados", () => {
    const onlyPatient = (content.match(/revalidatePath\(`\/pacientes\/\$\{patientId\}`\)/g) ?? []);
    const withEncounterIdParam = (content.match(/revalidatePath\(`\/pacientes\/\$\{patientId\}\/consultas\/\$\{encounterId\}`\)/g) ?? []);
    const withDataEncounterId = (content.match(/revalidatePath\(`\/pacientes\/\$\{patientId\}\/consultas\/\$\{data\.encounterId\}`\)/g) ?? []);
    expect(onlyPatient.length).toBe(5);
    expect(withEncounterIdParam.length).toBe(3);
    expect(withDataEncounterId.length).toBe(2);
    expect(onlyPatient.length + withEncounterIdParam.length + withDataEncounterId.length).toBe(10);
  });

  it("no contiene SQL ni llamadas exec directas (sin lógica de negocio propia)", () => {
    expect(content).not.toMatch(/\bexec\s*\(/);
    expect(content).not.toMatch(/\bINSERT\b/);
    expect(content).not.toMatch(/\bUPDATE\b/);
    expect(content).not.toMatch(/\bSELECT\b/);
  });

  it("captura UnauthorizedError y NoOrganizationError en cada acción", () => {
    const sessionErrorMatches = (content.match(/UnauthorizedError/g) ?? []);
    // Al menos 1 import + 6 instanceof checks
    expect(sessionErrorMatches.length).toBeGreaterThanOrEqual(7);
    const noOrgMatches = (content.match(/NoOrganizationError/g) ?? []);
    expect(noOrgMatches.length).toBeGreaterThanOrEqual(7);
  });

  it("importa las 6 funciones de dominio de clinical/encounters", () => {
    expect(content).toContain(`from "@/server/domain/clinical/encounters"`);
    expect(content).toContain("createEncounter");
    expect(content).toContain("startEncounter");
    expect(content).toContain("updateEncounter");
    expect(content).toContain("addClinicalNote");
    expect(content).toContain("finalizeEncounter");
    expect(content).toContain("cancelEncounter");
  });

  it("createEncounterAction pasa patientId al dominio junto con los datos", () => {
    const fnMatch = content.match(/export async function createEncounterAction[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("createEncounter(exec, ctx, { patientId, ...data })");
  });

  it("updateEncounterAction y addClinicalNoteAction pasan data completo (incluye encounterId) al dominio", () => {
    const updateMatch = content.match(/export async function updateEncounterAction[\s\S]*?^}/m);
    expect(updateMatch).not.toBeNull();
    expect(updateMatch![0]).toContain("updateEncounter(exec, ctx, data)");

    const noteMatch = content.match(/export async function addClinicalNoteAction[\s\S]*?^}/m);
    expect(noteMatch).not.toBeNull();
    expect(noteMatch![0]).toContain("addClinicalNote(exec, ctx, data)");
  });

  it("startEncounterAction, finalizeEncounterAction y cancelEncounterAction pasan solo encounterId al dominio", () => {
    for (const [actionName, domainFn] of [
      ["startEncounterAction", "startEncounter"],
      ["finalizeEncounterAction", "finalizeEncounter"],
      ["cancelEncounterAction", "cancelEncounter"],
    ] as const) {
      const fnMatch = content.match(new RegExp(`export async function ${actionName}[\\s\\S]*?^}`, "m"));
      expect(fnMatch).not.toBeNull();
      expect(fnMatch![0]).toContain(`${domainFn}(exec, ctx, encounterId)`);
    }
  });
});
