// NELZZON — Pruebas Fase FVO-1 (Ficha Viva Odontológica Completa base).
// Postgres real + RLS + permisos. Cubre:
// - Secciones FVO visibles con los permisos correctos (owner, clinician, admin).
// - owner ve demographics, address, clinicalProfile, tax, emergencyContact, consent, commercialOrigin.
// - clinician ve demographics y clinicalProfile pero NO tax.
// - front_desk y billing → FORBIDDEN (no tienen patients.view; consistente con phase-ui1).
// - clinician ve medicalAlertFlag y clinicalProfile con alertas detalladas.
// - Paciente sin datos FVO no truena (secciones null/undefined limpias).
// - RLS multi-tenant: actor de orgB no ve datos FVO de orgA.
// - DTO no expone campos prohibidos (createdBy, updatedBy, organizationId).
// - PatientLiveRecordSchema valida las nuevas secciones.
// - Migración 0016 existe y las 9 tablas existen en la BD.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { resolvePatientLiveRecord } from "../src/server/domain/patient-record/resolver.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import { PatientLiveRecordSchema } from "../src/server/domain/patient-record/schemas.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let frontDeskA: ActorContext;
let billingA: ActorContext;
let ownerB: ActorContext;

let patientAId: string;     // paciente CON datos FVO
let patientEmptyId: string; // paciente SIN datos FVO (no truena)
let patientBId: string;     // paciente de orgB

async function ensureRbac() {
  for (const p of PERMISSIONS)
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description],
    );
  for (const r of ROLES) {
    const id = (
      await adminPool.query(
        `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4)
         ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
        [r.key, r.name, r.scope, r.assignable],
      )
    ).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions)
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId")
         SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`,
        [id, pk],
      );
  }
}

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@fvo1.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
    [memberId, roleKey],
  );
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr
     JOIN "roles" r ON r.id=mr."roleId"
     JOIN "role_permissions" rp ON rp."roleId"=r.id
     JOIN "permissions" p ON p.id=rp."permissionId"
     WHERE mr."memberId"=$1`,
    [memberId],
  );
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r: any) => r.key)) };
}

async function createPatient(orgId: string, name: string, phone: string) {
  const cid = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, name, phone],
    )
  ).rows[0].id;
  const pid = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgId, cid],
    )
  ).rows[0].id;
  return pid;
}

async function seedFVOData(orgId: string, patientId: string, ownerId: string) {
  await adminPool.query(
    `INSERT INTO "patient_demographics"
       ("organizationId","patientId","dateOfBirth","sex","bloodType","occupation","maritalStatus","createdBy")
     VALUES ($1,$2,'1990-06-20','F','A+','Diseñadora','SINGLE',$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_address"
       ("organizationId","patientId","street","extNumber","neighborhood","municipality","state","postalCode","country","createdBy")
     VALUES ($1,$2,'Calle Maple','45','Polanco','Miguel Hidalgo','CDMX','11560','MX',$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_tax_profile"
       ("organizationId","patientId","rfc","legalName","taxRegime","cfdiUse","taxPostalCode","createdBy")
     VALUES ($1,$2,'MAPL900620HDF','María López','605','G03','11560',$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_clinical_profile"
       ("organizationId","patientId","knownAllergies","currentMedications","relevantHistory","safetyNotes","createdBy","updatedBy")
     VALUES ($1,$2,ARRAY['Aspirina'],ARRAY['Enalapril 10mg'],'Hipertensión leve.','Monitorear presión antes de procedimientos.',$3,$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_medical_alert"
       ("organizationId","patientId","alertType","severity","description","active","createdBy")
     VALUES ($1,$2,'ALLERGY','HIGH','Alergia a Aspirina — reacción documentada.',true,$3)`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_emergency_contact"
       ("organizationId","patientId","name","relationship","phone","createdBy")
     VALUES ($1,$2,'Carlos López','Hermano','+5215599887766',$3)`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_commercial_origin"
       ("organizationId","patientId","channel","referredBy","initialReason","createdBy")
     VALUES ($1,$2,'REFERRAL','Dr. Pérez','Revisión de rutina',$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
  await adminPool.query(
    `INSERT INTO "patient_data_consent"
       ("organizationId","patientId","consentType","status","grantedAt","version","method","grantedByUserId")
     VALUES ($1,$2,'DATA_TREATMENT','GRANTED',now(),'v1.0','SIGNATURE',$3)
     ON CONFLICT ("patientId","consentType") DO NOTHING`,
    [orgId, patientId, ownerId],
  );
}

beforeAll(async () => {
  await ensureRbac();

  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`, ["OrgFVO1-A-" + rnd(), "fvo1a-" + rnd()])).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`, ["OrgFVO1-B-" + rnd(), "fvo1b-" + rnd()])).rows[0].id;

  ownerA     = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  frontDeskA = await member(orgA, "front_desk");
  billingA   = await member(orgA, "billing");
  ownerB     = await member(orgB, "owner");

  patientAId    = await createPatient(orgA, "Paciente FVO1-A", "+5215510001001");
  patientEmptyId = await createPatient(orgA, "Paciente FVO1-Vacio", "+5215510001002");
  patientBId    = await createPatient(orgB, "Paciente FVO1-B", "+5215510001003");

  await seedFVOData(orgA, patientAId, ownerA.userId);
  await seedFVOData(orgB, patientBId, ownerB.userId);
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Migración e integridad estructural
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural FVO-1", () => {
  it("migración 0016 existe", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => f.startsWith("0016"))).toBe(true);
  });

  it("no existe migración 0020 ni superior (snapshot: FVO-1 no creó más de 0016; 0017-0019 son de fases posteriores legítimas)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 20)).toBe(false);
  });

  it("las 9 tablas FVO-1 existen en la BD", async () => {
    const tables = [
      "patient_demographics", "patient_address", "patient_tax_profile",
      "patient_clinical_profile", "patient_medical_alert", "patient_guardian",
      "patient_emergency_contact", "patient_commercial_origin", "patient_data_consent",
    ];
    for (const table of tables) {
      const { rows } = await adminPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name=$1 AND table_schema='public'`,
        [table],
      );
      expect(rows.length, `Tabla ${table} debe existir`).toBe(1);
    }
  });

  it("PatientLiveRecordSchema tiene los nuevos campos FVO-1", () => {
    const shape = PatientLiveRecordSchema.shape;
    expect(shape).toHaveProperty("demographics");
    expect(shape).toHaveProperty("address");
    expect(shape).toHaveProperty("guardian");
    expect(shape).toHaveProperty("emergencyContact");
    expect(shape).toHaveProperty("commercialOrigin");
    expect(shape).toHaveProperty("consent");
    expect(shape).toHaveProperty("medicalAlertFlag");
    expect(shape).toHaveProperty("clinicalProfile");
    expect(shape).toHaveProperty("tax");
  });

  it("fvo-sections.ts existe", () => {
    expect(existsSync(resolve("src/server/domain/patient-record/fvo-sections.ts"))).toBe(true);
  });

  it("PatientFVOSections.tsx existe", () => {
    expect(existsSync(resolve("src/components/patients/PatientFVOSections.tsx"))).toBe(true);
  });

  it("PHASE_FVO-1_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_FVO-1_DELIVERY_MARKER.txt"))).toBe(true);
  });

  it("rbac.ts tiene los 3 nuevos permisos FVO-1", () => {
    expect(PERMISSIONS.some((p) => p.key === "patient.demographics.view")).toBe(true);
    expect(PERMISSIONS.some((p) => p.key === "patient.clinical_profile.view")).toBe(true);
    expect(PERMISSIONS.some((p) => p.key === "patient.tax.view")).toBe(true);
  });

  it("fvo-sections.ts no hace SELECT * FROM", async () => {
    const { readFileSync } = await import("node:fs");
    const content = readFileSync(resolve("src/server/domain/patient-record/fvo-sections.ts"), "utf-8");
    expect(content).not.toMatch(/SELECT \* FROM/i);
  });

  it("fvo-sections.ts no selecciona createdBy ni updatedBy", async () => {
    const { readFileSync } = await import("node:fs");
    const content = readFileSync(resolve("src/server/domain/patient-record/fvo-sections.ts"), "utf-8");
    expect(content).not.toContain('"createdBy"');
    expect(content).not.toContain('"updatedBy"');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Secciones FVO por permiso (roles con patients.view)
// ══════════════════════════════════════════════════════════════════════

describe("resolvePatientLiveRecord — secciones FVO por permiso", () => {
  it("owner ve demographics, address, clinicalProfile, tax, emergencyContact, commercialOrigin, consent", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics).toBeDefined();
    expect(result.value.address).toBeDefined();
    expect(result.value.clinicalProfile).toBeDefined();
    expect(result.value.tax).toBeDefined();
    expect(result.value.emergencyContact).toBeDefined();
    expect(result.value.commercialOrigin).toBeDefined();
    expect(result.value.consent).toBeDefined();
    expect(result.value.medicalAlertFlag).toBeDefined();
  });

  it("clinician ve demographics y clinicalProfile pero NO tax", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics).toBeDefined();
    expect(result.value.clinicalProfile).toBeDefined();
    expect(result.value.tax).toBeUndefined();
  });

  it("clinician ve medicalAlertFlag", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.medicalAlertFlag).toBeDefined();
    expect(result.value.medicalAlertFlag?.hasActiveAlerts).toBe(true);
    expect(result.value.medicalAlertFlag?.highSeverityCount).toBeGreaterThanOrEqual(1);
  });

  // front_desk ahora tiene patients.view; billing sigue sin él → FORBIDDEN
  it("front_desk con patients.view → OK en resolvePatientLiveRecord", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, frontDeskA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("billing sin patients.view → FORBIDDEN en resolvePatientLiveRecord", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, billingA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Alertas médicas — bandera y detalle
// ══════════════════════════════════════════════════════════════════════

describe("alertas médicas — medicalAlertFlag y clinicalProfile.medicalAlerts", () => {
  it("owner ve medicalAlertFlag con hasActiveAlerts=true", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.medicalAlertFlag?.hasActiveAlerts).toBe(true);
    expect(result.value.medicalAlertFlag?.highSeverityCount).toBeGreaterThanOrEqual(1);
  });

  it("clinician ve clinicalProfile con alertas detalladas", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clinicalProfile?.medicalAlerts.length).toBeGreaterThanOrEqual(1);
    const alert = result.value.clinicalProfile?.medicalAlerts[0];
    expect(alert).toHaveProperty("id");
    expect(alert).toHaveProperty("severity");
    expect(alert).toHaveProperty("description");
    expect(alert).toHaveProperty("alertType");
    expect(alert).toHaveProperty("active");
  });

  it("clinician ve alergias y medicamentos en clinicalProfile", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clinicalProfile?.knownAllergies).toContain("Aspirina");
    expect(result.value.clinicalProfile?.currentMedications.length).toBeGreaterThanOrEqual(1);
  });

  it("clinician ve relevantHistory y safetyNotes", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clinicalProfile?.relevantHistory).toBe("Hipertensión leve.");
    expect(result.value.clinicalProfile?.safetyNotes).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Datos demográficos correctos
// ══════════════════════════════════════════════════════════════════════

describe("demographics — datos correctos", () => {
  it("dateOfBirth y age calculado son correctos", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics?.dateOfBirth).toBe("1990-06-20");
    expect(result.value.demographics?.age).toBeGreaterThan(30);
    expect(typeof result.value.demographics?.age).toBe("number");
  });

  it("sex y bloodType tienen valores del seed", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics?.sex).toBe("F");
    expect(result.value.demographics?.bloodType).toBe("A+");
  });

  it("address tiene campos del seed", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.address?.street).toBe("Calle Maple");
    expect(result.value.address?.postalCode).toBe("11560");
    expect(result.value.address?.country).toBe("MX");
  });

  it("emergencyContact tiene nombre y teléfono", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emergencyContact?.name).toBe("Carlos López");
    expect(result.value.emergencyContact?.phone).toBe("+5215599887766");
  });

  it("commercialOrigin tiene canal y referredBy", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.commercialOrigin?.channel).toBe("REFERRAL");
    expect(result.value.commercialOrigin?.referredBy).toBe("Dr. Pérez");
  });

  it("consent tiene status GRANTED", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.consent?.status).toBe("GRANTED");
    expect(result.value.consent?.method).toBe("SIGNATURE");
    expect(result.value.consent?.version).toBe("v1.0");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Datos fiscales del paciente
// ══════════════════════════════════════════════════════════════════════

describe("patient tax — solo con patient.tax.view", () => {
  it("owner ve RFC y régimen fiscal del paciente", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tax?.rfc).toBe("MAPL900620HDF");
    expect(result.value.tax?.taxRegime).toBe("605");
    expect(result.value.tax?.cfdiUse).toBe("G03");
    expect(result.value.tax?.taxPostalCode).toBe("11560");
  });

  it("clinician NO ve datos fiscales del paciente (sin patient.tax.view)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tax).toBeUndefined();
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain("MAPL900620HDF");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Paciente sin datos FVO — no truena
// ══════════════════════════════════════════════════════════════════════

describe("paciente sin datos FVO — comportamiento seguro", () => {
  it("owner sobre paciente vacío → demographics con nulls, sin error", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics).toBeDefined();
    expect(result.value.demographics?.dateOfBirth).toBeNull();
    expect(result.value.demographics?.age).toBeNull();
    expect(result.value.demographics?.sex).toBeNull();
    expect(result.value.address).toBeUndefined();
    expect(result.value.emergencyContact).toBeUndefined();
  });

  it("clinician sobre paciente vacío → clinicalProfile con arrays vacíos y alerts vacíos", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clinicalProfile).toBeDefined();
    expect(result.value.clinicalProfile?.knownAllergies).toEqual([]);
    expect(result.value.clinicalProfile?.currentMedications).toEqual([]);
    expect(result.value.clinicalProfile?.medicalAlerts).toEqual([]);
    expect(result.value.clinicalProfile?.relevantHistory).toBeNull();
  });

  it("medicalAlertFlag de paciente vacío → hasActiveAlerts=false", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.medicalAlertFlag?.hasActiveAlerts).toBe(false);
    expect(result.value.medicalAlertFlag?.highSeverityCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. RLS y multi-tenant
// ══════════════════════════════════════════════════════════════════════

describe("RLS multi-tenant — FVO-1", () => {
  it("actor de orgB no ve paciente de orgA (RLS filtra)", async () => {
    const run = makeTenantRunner(orgB);
    const result = await resolvePatientLiveRecord(run, ownerB, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["NOT_FOUND", "ARCHIVED"]).toContain(result.reason);
  });

  it("actor de orgA ve sus propios datos FVO", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.demographics?.sex).toBe("F");
    expect(result.value.tax?.rfc).toBe("MAPL900620HDF");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. DTO no expone campos prohibidos
// ══════════════════════════════════════════════════════════════════════

describe("DTO — campos prohibidos no expuestos en ningún rol", () => {
  it("owner: ningún campo del DTO contiene createdBy ni updatedBy", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"createdBy"');
    expect(raw).not.toContain('"updatedBy"');
  });

  it("clinician: secciones FVO no contienen organizationId del tenant", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fvoRaw = JSON.stringify({
      demographics: result.value.demographics,
      address: result.value.address,
      clinicalProfile: result.value.clinicalProfile,
    });
    expect(fvoRaw).not.toContain(orgA);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. Validación Zod de nuevas secciones
// ══════════════════════════════════════════════════════════════════════

describe("PatientLiveRecordSchema — validación FVO-1", () => {
  it("registro del owner pasa validación Zod", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = PatientLiveRecordSchema.safeParse(result.value);
    expect(parsed.success).toBe(true);
  });

  it("registro del clinician pasa validación Zod", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = PatientLiveRecordSchema.safeParse(result.value);
    expect(parsed.success).toBe(true);
  });

  it("registro del paciente vacío (owner) pasa validación Zod", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = PatientLiveRecordSchema.safeParse(result.value);
    expect(parsed.success).toBe(true);
  });
});
