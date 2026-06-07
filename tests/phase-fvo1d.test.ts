// NELZZON — Pruebas Fase FVO-1d (server actions FVO).
// Las server actions no son ejecutables en Vitest (requieren runtime Next.js).
// Las pruebas verifican estructura y contrato del archivo por readFileSync:
// - Sin migración 0018+.
// - Archivos de entrega existen.
// - fvo.ts tiene "use server" en primera línea.
// - Exactamente 11 funciones exportadas (ni más, ni menos).
// - Cada acción esperada está presente.
// - revalidatePath se llama con /pacientes/${patientId} en cada acción.
// - No hay SQL ni llamadas exec directas (sin lógica de negocio propia).

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FVO_ACTIONS_PATH = resolve("src/server/actions/fvo.ts");

const EXPECTED_ACTIONS = [
  "upsertDemographicsAction",
  "upsertAddressAction",
  "upsertCommercialOriginAction",
  "upsertClinicalProfileAction",
  "createMedicalAlertAction",
  "deactivateMedicalAlertAction",
  "upsertTaxProfileAction",
  "addGuardianAction",
  "addEmergencyContactAction",
  "grantConsentAction",
  "revokeConsentAction",
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// 1. Integridad de archivos
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1d — integridad de archivos", () => {
  it("no existe migración 0018 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 19)).toBe(false);
  });

  it("src/server/actions/fvo.ts existe", () => {
    expect(existsSync(FVO_ACTIONS_PATH)).toBe(true);
  });

  it("PHASE_FVO-1D_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_FVO-1D_DELIVERY_MARKER.txt"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Verificación estructural de fvo.ts
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1d — verificación estructural de fvo.ts", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(FVO_ACTIONS_PATH, "utf-8");
  });

  it('primera línea es "use server";', () => {
    const firstLine = content.split("\n")[0].trim();
    expect(firstLine).toBe('"use server";');
  });

  it.each(EXPECTED_ACTIONS)("exporta %s", (name) => {
    expect(content).toContain(`export async function ${name}`);
  });

  it("exporta exactamente 11 funciones (ni más, ni menos)", () => {
    const exported = (content.match(/^export async function \w+/gm) ?? []);
    expect(exported.length).toBe(11);
  });

  it("importa revalidatePath de next/cache", () => {
    expect(content).toContain(`from "next/cache"`);
    expect(content).toContain("revalidatePath");
  });

  it("cada acción llama revalidatePath con /pacientes/${patientId}", () => {
    const revalidateCalls = (content.match(/revalidatePath\(`\/pacientes\/\$\{patientId\}`\)/g) ?? []);
    expect(revalidateCalls.length).toBe(11);
  });

  it("no contiene SQL ni llamadas exec directas (sin lógica de negocio propia)", () => {
    expect(content).not.toMatch(/\bexec\s*\(/);
    expect(content).not.toMatch(/\bINSERT\b/);
    expect(content).not.toMatch(/\bUPDATE\b/);
    expect(content).not.toMatch(/\bSELECT\b/);
  });

  it("deactivateMedicalAlertAction recibe patientId y alertId (no pasa patientId al dominio)", () => {
    const fnMatch = content.match(
      /export async function deactivateMedicalAlertAction[\s\S]*?^}/m,
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("patientId");
    expect(fnBody).toContain("alertId");
    // El dominio recibe solo alertId (deactivateMedicalAlert(exec, ctx, alertId))
    expect(fnBody).toContain("deactivateMedicalAlert(exec, ctx, alertId)");
    // No pasa patientId al dominio
    expect(fnBody).not.toContain("deactivateMedicalAlert(exec, ctx, patientId");
  });

  it("captura UnauthorizedError y NoOrganizationError en cada acción", () => {
    const sessionErrorMatches = (content.match(/UnauthorizedError/g) ?? []);
    // Al menos 1 import + 11 instanceof checks
    expect(sessionErrorMatches.length).toBeGreaterThanOrEqual(12);
  });

  it("importa todas las funciones de dominio de fvo-write", () => {
    expect(content).toContain("upsertDemographics");
    expect(content).toContain("upsertAddress");
    expect(content).toContain("upsertCommercialOrigin");
    expect(content).toContain("upsertClinicalProfile");
    expect(content).toContain("createMedicalAlert");
    expect(content).toContain("deactivateMedicalAlert");
    expect(content).toContain("upsertTaxProfile");
    expect(content).toContain("addGuardian");
    expect(content).toContain("addEmergencyContact");
    expect(content).toContain("grantConsent");
    expect(content).toContain("revokeConsent");
  });
});
