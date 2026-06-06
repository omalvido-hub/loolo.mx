// LOOLO — Pruebas Fase FVO-1a (correcciones al modelo de datos FVO-1).
// Verifica:
// - Migración 0017 existe y 0018+ no.
// - patient_demographics.curp nullable.
// - 5 CHECK constraints existen y rechazan valores inválidos.
// - patient_emergency_contact es 1:N (UNIQUE eliminado).
// - patient_guardian es 1:N (UNIQUE eliminado).
// - 6 permisos de escritura FVO-1a en PERMISSIONS y asignados correctamente por rol.
// - RLS sigue activo en patient_emergency_contact y patient_guardian tras los ALTER.
// - PHASE_FVO-1A_DELIVERY_MARKER.txt existe.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

// IDs creados en beforeAll para pruebas funcionales
let orgId: string;
let patientId: string;   // para curp y CHECK constraint tests
let patientEcId: string; // para emergency_contact 1:N
let patientGuId: string; // para guardian 1:N

beforeAll(async () => {
  orgId = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["Org-FVO1A-" + rnd(), "fvo1a-" + rnd()],
    )
  ).rows[0].id;

  const mkContact = async (name: string, phone: string) =>
    (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
        [orgId, name, phone],
      )
    ).rows[0].id;

  const mkPatient = async (contactId: string) =>
    (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgId, contactId],
      )
    ).rows[0].id;

  const c1 = await mkContact("Paciente FVO1A-Main", "+521" + rnd() + rnd());
  const c2 = await mkContact("Paciente FVO1A-EC",   "+521" + rnd() + rnd());
  const c3 = await mkContact("Paciente FVO1A-GU",   "+521" + rnd() + rnd());

  patientId   = await mkPatient(c1);
  patientEcId = await mkPatient(c2);
  patientGuId = await mkPatient(c3);
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Integridad de archivos
// ══════════════════════════════════════════════════════════════════════

describe("integridad de archivos FVO-1a", () => {
  it("migración 0017 existe", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => f.startsWith("0017"))).toBe(true);
  });

  it("no existe migración 0018 ni superior (FVO-1a no creó más)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 19)).toBe(false);
  });

  it("PHASE_FVO-1A_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_FVO-1A_DELIVERY_MARKER.txt"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Columna curp
// ══════════════════════════════════════════════════════════════════════

describe("patient_demographics.curp", () => {
  it("columna curp existe como text nullable", async () => {
    const { rows } = await adminPool.query(
      `SELECT data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'patient_demographics' AND column_name = 'curp'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].data_type).toBe("text");
    expect(rows[0].is_nullable).toBe("YES");
  });

  it("insertar curp en patient_demographics → OK", async () => {
    await adminPool.query(
      `INSERT INTO "patient_demographics"
         ("organizationId","patientId","curp","sex")
       VALUES ($1,$2,'GALA880315MDFRRR01','F')`,
      [orgId, patientId],
    );
    const { rows } = await adminPool.query(
      `SELECT curp FROM "patient_demographics" WHERE "patientId"=$1`,
      [patientId],
    );
    expect(rows[0].curp).toBe("GALA880315MDFRRR01");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. CHECK constraints — existencia
// ══════════════════════════════════════════════════════════════════════

describe("CHECK constraints — existencia en pg_constraint", () => {
  const checkExists = async (table: string, conname: string) => {
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_constraint
       WHERE conrelid=$1::regclass AND conname=$2 AND contype='c'`,
      [table, conname],
    );
    return rows.length === 1;
  };

  it("chk_demographics_sex existe en patient_demographics", async () => {
    expect(await checkExists("patient_demographics", "chk_demographics_sex")).toBe(true);
  });

  it("chk_medical_alert_type existe en patient_medical_alert", async () => {
    expect(await checkExists("patient_medical_alert", "chk_medical_alert_type")).toBe(true);
  });

  it("chk_medical_alert_severity existe en patient_medical_alert", async () => {
    expect(await checkExists("patient_medical_alert", "chk_medical_alert_severity")).toBe(true);
  });

  it("chk_consent_method existe en patient_data_consent", async () => {
    expect(await checkExists("patient_data_consent", "chk_consent_method")).toBe(true);
  });

  it("chk_consent_status existe en patient_data_consent", async () => {
    expect(await checkExists("patient_data_consent", "chk_consent_status")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. CHECK constraints — rechazan valores inválidos
// ══════════════════════════════════════════════════════════════════════

describe("CHECK constraints — rechazan valores inválidos", () => {
  it("sex='INVALID' viola chk_demographics_sex (code 23514)", async () => {
    // patientId ya tiene demographics del test de curp; intentamos UPDATE
    try {
      await adminPool.query(
        `UPDATE "patient_demographics" SET "sex"='INVALID' WHERE "patientId"=$1`,
        [patientId],
      );
      expect.fail("Debió lanzar violación de CHECK constraint");
    } catch (e: any) {
      expect(e.code).toBe("23514");
    }
  });

  it("alertType='VIRUS' viola chk_medical_alert_type (code 23514)", async () => {
    try {
      await adminPool.query(
        `INSERT INTO "patient_medical_alert"
           ("organizationId","patientId","alertType","severity","description","active")
         VALUES ($1,$2,'VIRUS','HIGH','test',true)`,
        [orgId, patientId],
      );
      expect.fail("Debió lanzar violación de CHECK constraint");
    } catch (e: any) {
      expect(e.code).toBe("23514");
    }
  });

  it("severity='EXTREME' viola chk_medical_alert_severity (code 23514)", async () => {
    try {
      await adminPool.query(
        `INSERT INTO "patient_medical_alert"
           ("organizationId","patientId","alertType","severity","description","active")
         VALUES ($1,$2,'ALLERGY','EXTREME','test',true)`,
        [orgId, patientId],
      );
      expect.fail("Debió lanzar violación de CHECK constraint");
    } catch (e: any) {
      expect(e.code).toBe("23514");
    }
  });

  it("method='FAX' viola chk_consent_method (code 23514)", async () => {
    try {
      await adminPool.query(
        `INSERT INTO "patient_data_consent"
           ("organizationId","patientId","consentType","status","method")
         VALUES ($1,$2,'DATA_TREATMENT','GRANTED','FAX')`,
        [orgId, patientId],
      );
      expect.fail("Debió lanzar violación de CHECK constraint");
    } catch (e: any) {
      expect(e.code).toBe("23514");
    }
  });

  it("status='PENDING' viola chk_consent_status (code 23514)", async () => {
    try {
      await adminPool.query(
        `INSERT INTO "patient_data_consent"
           ("organizationId","patientId","consentType","status","method")
         VALUES ($1,$2,'DATA_TREATMENT','PENDING','SIGNATURE')`,
        [orgId, patientId],
      );
      expect.fail("Debió lanzar violación de CHECK constraint");
    } catch (e: any) {
      expect(e.code).toBe("23514");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. patient_emergency_contact — 1:N
// ══════════════════════════════════════════════════════════════════════

describe("patient_emergency_contact — 1:N", () => {
  it("no existe UNIQUE constraint por patientId en patient_emergency_contact", async () => {
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_constraint
       WHERE conrelid='patient_emergency_contact'::regclass
         AND conname='patient_emergency_contact_patientId_key'
         AND contype='u'`,
    );
    expect(rows.length).toBe(0);
  });

  it("insertar 2 contactos de emergencia para el mismo paciente → ambos OK", async () => {
    await adminPool.query(
      `INSERT INTO "patient_emergency_contact"
         ("organizationId","patientId","name","relationship","phone")
       VALUES ($1,$2,'Contacto Uno','Hermano','+5215551111111')`,
      [orgId, patientEcId],
    );
    await adminPool.query(
      `INSERT INTO "patient_emergency_contact"
         ("organizationId","patientId","name","relationship","phone")
       VALUES ($1,$2,'Contacto Dos','Madre','+5215552222222')`,
      [orgId, patientEcId],
    );
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_emergency_contact" WHERE "patientId"=$1`,
      [patientEcId],
    );
    expect(Number(rows[0].cnt)).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. patient_guardian — 1:N
// ══════════════════════════════════════════════════════════════════════

describe("patient_guardian — 1:N", () => {
  it("no existe UNIQUE constraint por patientId en patient_guardian", async () => {
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_constraint
       WHERE conrelid='patient_guardian'::regclass
         AND conname='patient_guardian_patientId_key'
         AND contype='u'`,
    );
    expect(rows.length).toBe(0);
  });

  it("insertar 2 tutores para el mismo paciente → ambos OK", async () => {
    await adminPool.query(
      `INSERT INTO "patient_guardian"
         ("organizationId","patientId","name","relationship","phone")
       VALUES ($1,$2,'Tutor Uno','Padre','+5215553333333')`,
      [orgId, patientGuId],
    );
    await adminPool.query(
      `INSERT INTO "patient_guardian"
         ("organizationId","patientId","name","relationship","phone")
       VALUES ($1,$2,'Tutora Dos','Madre','+5215554444444')`,
      [orgId, patientGuId],
    );
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_guardian" WHERE "patientId"=$1`,
      [patientGuId],
    );
    expect(Number(rows[0].cnt)).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. RBAC — 6 permisos de escritura FVO-1a
// ══════════════════════════════════════════════════════════════════════

const NEW_PERMS = [
  "patient.demographics.edit",
  "patient.clinical_profile.edit",
  "patient.tax.edit",
  "patient.guardian.edit",
  "patient.emergency_contact.edit",
  "patient.consent.manage",
] as const;

describe("RBAC — permisos FVO-1a en catálogo y roles", () => {
  it("PERMISSIONS contiene los 6 permisos nuevos de escritura", () => {
    const keys = new Set(PERMISSIONS.map((p) => p.key));
    for (const perm of NEW_PERMS) {
      expect(keys.has(perm), `Falta permiso: ${perm}`).toBe(true);
    }
  });

  it("owner tiene los 6 permisos de escritura FVO-1a", () => {
    const owner = ROLES.find((r) => r.key === "owner")!;
    const perms = new Set(owner.permissions);
    for (const perm of NEW_PERMS) {
      expect(perms.has(perm), `owner falta: ${perm}`).toBe(true);
    }
  });

  it("admin tiene los 6 permisos de escritura FVO-1a", () => {
    const admin = ROLES.find((r) => r.key === "admin")!;
    const perms = new Set(admin.permissions);
    for (const perm of NEW_PERMS) {
      expect(perms.has(perm), `admin falta: ${perm}`).toBe(true);
    }
  });

  it("front_desk tiene demographics/guardian/emergency_contact/consent pero NO clinical ni tax edit", () => {
    const fd = ROLES.find((r) => r.key === "front_desk")!;
    const perms = new Set(fd.permissions);
    expect(perms.has("patient.demographics.edit")).toBe(true);
    expect(perms.has("patient.guardian.edit")).toBe(true);
    expect(perms.has("patient.emergency_contact.edit")).toBe(true);
    expect(perms.has("patient.consent.manage")).toBe(true);
    expect(perms.has("patient.clinical_profile.edit")).toBe(false);
    expect(perms.has("patient.tax.edit")).toBe(false);
  });

  it("clinician tiene clinical_profile.edit pero NO demographics/guardian/emergency/consent/tax edit", () => {
    const cl = ROLES.find((r) => r.key === "clinician")!;
    const perms = new Set(cl.permissions);
    expect(perms.has("patient.clinical_profile.edit")).toBe(true);
    expect(perms.has("patient.demographics.edit")).toBe(false);
    expect(perms.has("patient.guardian.edit")).toBe(false);
    expect(perms.has("patient.emergency_contact.edit")).toBe(false);
    expect(perms.has("patient.consent.manage")).toBe(false);
    expect(perms.has("patient.tax.edit")).toBe(false);
  });

  it("billing tiene tax.edit pero NO clinical/demographics/guardian/emergency/consent edit", () => {
    const bl = ROLES.find((r) => r.key === "billing")!;
    const perms = new Set(bl.permissions);
    expect(perms.has("patient.tax.edit")).toBe(true);
    expect(perms.has("patient.clinical_profile.edit")).toBe(false);
    expect(perms.has("patient.demographics.edit")).toBe(false);
    expect(perms.has("patient.guardian.edit")).toBe(false);
    expect(perms.has("patient.emergency_contact.edit")).toBe(false);
    expect(perms.has("patient.consent.manage")).toBe(false);
  });

  it("accountant tiene tax.edit pero NO clinical/demographics/guardian/emergency/consent edit", () => {
    const ac = ROLES.find((r) => r.key === "accountant")!;
    const perms = new Set(ac.permissions);
    expect(perms.has("patient.tax.edit")).toBe(true);
    expect(perms.has("patient.clinical_profile.edit")).toBe(false);
    expect(perms.has("patient.demographics.edit")).toBe(false);
    expect(perms.has("patient.guardian.edit")).toBe(false);
    expect(perms.has("patient.emergency_contact.edit")).toBe(false);
    expect(perms.has("patient.consent.manage")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. RLS — sigue activo tras los ALTER TABLE
// ══════════════════════════════════════════════════════════════════════

describe("RLS — activo en patient_emergency_contact y patient_guardian", () => {
  const checkRls = async (table: string) => {
    const { rows } = await adminPool.query(
      `SELECT relrowsecurity, relforcerowsecurity
       FROM pg_class WHERE relname=$1`,
      [table],
    );
    return rows[0];
  };

  it("patient_emergency_contact tiene RLS ENABLE y FORCE", async () => {
    const r = await checkRls("patient_emergency_contact");
    expect(r.relrowsecurity).toBe(true);
    expect(r.relforcerowsecurity).toBe(true);
  });

  it("patient_guardian tiene RLS ENABLE y FORCE", async () => {
    const r = await checkRls("patient_guardian");
    expect(r.relrowsecurity).toBe(true);
    expect(r.relforcerowsecurity).toBe(true);
  });

  it("actor de orgB no ve contactos de emergencia de orgA (RLS filtra)", async () => {
    // orgB con tenant distinto no debe ver las filas de patientEcId (orgA)
    const orgB = (
      await adminPool.query(
        `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
        ["OrgB-FVO1A-" + rnd(), "fvo1a-b-" + rnd()],
      )
    ).rows[0].id;

    const { rows } = await forTenantPg(orgB, (client) =>
      client.query(
        `SELECT * FROM "patient_emergency_contact" WHERE "patientId"=$1`,
        [patientEcId],
      ),
    );
    expect(rows.length).toBe(0);
  });

  it("actor de orgA ve sus propios contactos de emergencia (RLS permite)", async () => {
    const { rows } = await forTenantPg(orgId, (client) =>
      client.query(
        `SELECT * FROM "patient_emergency_contact" WHERE "patientId"=$1`,
        [patientEcId],
      ),
    );
    expect(rows.length).toBe(2);
  });
});
