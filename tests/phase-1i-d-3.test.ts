// NELZZON — Pruebas Fase 1I-D-3 (Aseguradora / cobertura en Datos del paciente).
// Estructurales: migración 0020 (patient_insurance, RLS, grants), dominio
// (fvo-write-schemas, fvo-write, fvo-sections, schemas, resolver), server action
// (fvo.ts) y UI (PatientFVOSectionsClient, PatientLiveRecordView).
// No se toca DB de producción, no hay push ni deploy: solo verificación local.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve("prisma/migrations/0020_patient_insurance.sql");
const writeSchemasPath = resolve("src/server/domain/patient-record/fvo-write-schemas.ts");
const writePath = resolve("src/server/domain/patient-record/fvo-write.ts");
const sectionsPath = resolve("src/server/domain/patient-record/fvo-sections.ts");
const schemasPath = resolve("src/server/domain/patient-record/schemas.ts");
const resolverPath = resolve("src/server/domain/patient-record/resolver.ts");
const actionsPath = resolve("src/server/actions/fvo.ts");
const fvoClientPath = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");

let migrationContent: string;
let writeSchemasContent: string;
let writeContent: string;
let sectionsContent: string;
let schemasContent: string;
let resolverContent: string;
let actionsContent: string;
let fvoClientContent: string;
let viewContent: string;

beforeAll(() => {
  migrationContent = readFileSync(migrationPath, "utf-8");
  writeSchemasContent = readFileSync(writeSchemasPath, "utf-8");
  writeContent = readFileSync(writePath, "utf-8");
  sectionsContent = readFileSync(sectionsPath, "utf-8");
  schemasContent = readFileSync(schemasPath, "utf-8");
  resolverContent = readFileSync(resolverPath, "utf-8");
  actionsContent = readFileSync(actionsPath, "utf-8");
  fvoClientContent = readFileSync(fvoClientPath, "utf-8");
  viewContent = readFileSync(viewPath, "utf-8");
});

describe("1I-D-3 — Migración 0020_patient_insurance", () => {
  it("existe y crea la tabla patient_insurance con los campos esperados", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(migrationContent).toContain('CREATE TABLE "patient_insurance"');
    for (const col of [
      '"organizationId"', '"patientId"', '"hasInsurance"', '"providerName"',
      '"policyNumber"', '"policyholderName"', '"planName"',
      '"validFrom"', '"validUntil"', '"notes"', '"createdAt"', '"updatedAt"',
    ]) {
      expect(migrationContent).toContain(col);
    }
    expect(migrationContent).toContain('UNIQUE ("patientId")');
  });

  it("aplica el patrón estándar de RLS y permisos de app_user", () => {
    expect(migrationContent).toContain('GRANT SELECT, INSERT, UPDATE ON "patient_insurance" TO app_user');
    expect(migrationContent).toContain('REVOKE DELETE ON "patient_insurance" FROM app_user');
    expect(migrationContent).toContain('ALTER TABLE "patient_insurance" ENABLE ROW LEVEL SECURITY');
    expect(migrationContent).toContain('ALTER TABLE "patient_insurance" FORCE  ROW LEVEL SECURITY');
    expect(migrationContent).toContain('CREATE POLICY tenant_isolation ON "patient_insurance"');
    expect(migrationContent).toContain("current_setting('app.current_tenant_id', true)");
  });

  it("no modifica migraciones existentes (0001-0019)", () => {
    expect(migrationContent).not.toContain("ALTER TABLE \"patient_address\"");
    expect(migrationContent).not.toContain("ALTER TABLE \"patient_demographics\"");
  });
});

describe("1I-D-3 — Dominio: escritura (fvo-write-schemas + fvo-write)", () => {
  it("define UpsertPatientInsuranceZ con los 8 campos de cobertura", () => {
    expect(writeSchemasContent).toContain("UpsertPatientInsuranceZ");
    for (const field of [
      "hasInsurance", "providerName", "policyNumber", "policyholderName",
      "planName", "validFrom", "validUntil", "notes",
    ]) {
      expect(writeSchemasContent).toContain(field);
    }
  });

  it("upsertInsurance autoriza con patient.demographics.edit y hace UPSERT por patientId", () => {
    const idx = writeContent.indexOf("export async function upsertInsurance");
    expect(idx).toBeGreaterThan(-1);
    const block = writeContent.slice(idx, idx + 1600);
    expect(block).toContain('authorize(ctx, "patient.demographics.edit")');
    expect(block).toContain('INSERT INTO "patient_insurance"');
    expect(block).toContain('ON CONFLICT ("patientId") DO UPDATE');
  });

  it("la auditoría de aseguradora no expone número de póliza ni notas (metadata vacía)", () => {
    const idx = writeContent.indexOf("export async function upsertInsurance");
    const block = writeContent.slice(idx, idx + 1600);
    expect(block).toMatch(/audit\(exec, ctx, "patient\.insurance\.updated", "patient", patientId, \{\}\)/);
  });
});

describe("1I-D-3 — Dominio: lectura (fvo-sections + schemas + resolver)", () => {
  it("fetchInsuranceSection selecciona solo columnas de cobertura, sin SELECT *", () => {
    const idx = sectionsContent.indexOf("export async function fetchInsuranceSection");
    expect(idx).toBeGreaterThan(-1);
    const block = sectionsContent.slice(idx, idx + 700);
    expect(block).not.toContain("SELECT *");
    expect(block).toContain('FROM "patient_insurance" WHERE "patientId"=$1');
  });

  it("PatientInsuranceSectionSchema y el campo insurance existen en PatientLiveRecordSchema", () => {
    expect(schemasContent).toContain("PatientInsuranceSectionSchema");
    expect(schemasContent).toContain("insurance: PatientInsuranceSectionSchema.optional()");
  });

  it("el resolver solo expone insurance cuando hay patient.demographics.view", () => {
    expect(resolverContent).toContain("fetchInsuranceSection");
    const idx = resolverContent.indexOf('can(ctx.permissions, "patient.demographics.view")');
    expect(idx).toBeGreaterThan(-1);
    const block = resolverContent.slice(idx, idx + 600);
    expect(block).toContain("insurance = await fetchInsuranceSection(exec, patientId)");
  });
});

describe("1I-D-3 — Server action: upsertInsuranceAction", () => {
  it("existe, sigue el patrón ActionResult + revalidatePath", () => {
    const idx = actionsContent.indexOf("export async function upsertInsuranceAction");
    expect(idx).toBeGreaterThan(-1);
    const block = actionsContent.slice(idx, idx + 700);
    expect(block).toContain("upsertInsurance(exec, ctx, patientId, data)");
    expect(block).toContain("revalidatePath(`/pacientes/${patientId}`)");
  });
});

describe('1I-D-3 — UI: "Cobertura / aseguradora" dentro de "Datos del paciente"', () => {
  it('PatientFVOSectionsClient renderiza la sección "Cobertura / aseguradora" con los 7 campos de detalle', () => {
    const idx = fvoClientContent.indexOf('title="Cobertura / aseguradora"');
    expect(idx).toBeGreaterThan(-1);
    const block = fvoClientContent.slice(idx, idx + 4000);
    expect(block).toContain("Tiene seguro");
    expect(block).toContain("Aseguradora");
    expect(block).toContain("Número de póliza");
    expect(block).toContain("Titular");
    expect(block).toContain("Plan / cobertura");
    expect(block).toContain("Vigente desde");
    expect(block).toContain("Vigente hasta");
    expect(block).toContain("Observaciones");
  });

  it('el grupo "Aseguradora" usa canEditDemographics para editar (reutiliza permiso existente)', () => {
    const idx = fvoClientContent.indexOf('title="Cobertura / aseguradora"');
    const block = fvoClientContent.slice(Math.max(0, idx - 400), idx + 200);
    expect(block).toContain("canEditDemographics");
    expect(block).toContain("<GroupLabel>Aseguradora</GroupLabel>");
  });

  it('"Datos del paciente" en resumen muestra Teléfono, Domicilio, Aseguradora, Fiscal, Contacto de emergencia y Consentimiento, en ese orden', () => {
    const idx = viewContent.indexOf('title="Datos del paciente"');
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 1800);
    const telIdx = block.indexOf('label="Teléfono"');
    const domIdx = block.indexOf('label="Domicilio"');
    const asegIdx = block.indexOf('label="Aseguradora"');
    const fiscalIdx = block.indexOf('label="Fiscal"');
    const emergIdx = block.indexOf('label="Contacto de emergencia"');
    const consentIdx = block.indexOf('label="Consentimiento"');
    for (const i of [telIdx, domIdx, asegIdx, fiscalIdx, emergIdx, consentIdx]) {
      expect(i).toBeGreaterThan(-1);
    }
    expect(telIdx).toBeLessThan(domIdx);
    expect(domIdx).toBeLessThan(asegIdx);
    expect(asegIdx).toBeLessThan(fiscalIdx);
    expect(fiscalIdx).toBeLessThan(emergIdx);
    expect(emergIdx).toBeLessThan(consentIdx);
  });

  it("no se toca DB, permisos ni server actions desde la UI", () => {
    for (const content of [fvoClientContent, viewContent]) {
      expect(content).not.toContain("makeTenantRunner");
      expect(content).not.toContain("requireOrganization");
    }
  });
});
