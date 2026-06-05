// LOOLO — Pruebas Fase FVO-1c (capa de escritura del dominio patient-record).
// Verifica:
// - Sin migración 0018+ (FVO-1c no requiere schema changes).
// - Gates de permiso fail-closed por función de escritura.
// - Upsert idempotente: demographics, address, commercial_origin, clinical_profile, tax_profile.
// - Validación Zod falla antes de BD: sex inválido, CURP inválido, RFC inválido, etc.
// - createMedicalAlert + deactivateMedicalAlert.
// - addGuardian y addEmergencyContact como 1:N (INSERT, preserva historia).
// - grantConsent/revokeConsent cycle idempotente.
// - Auditoría sin texto clínico libre, sin RFC, sin CURP en metadata.
// - Aislamiento RLS: actor de orgA no afecta datos de orgB.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import type { Exec } from "../src/server/domain/identity/authorize.js";
import {
  upsertDemographics,
  upsertAddress,
  upsertCommercialOrigin,
  upsertClinicalProfile,
  createMedicalAlert,
  deactivateMedicalAlert,
  upsertTaxProfile,
  addGuardian,
  addEmergencyContact,
  grantConsent,
  revokeConsent,
} from "../src/server/domain/patient-record/fvo-write.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

// ── Helpers ───────────────────────────────────────────────────────────────────

let orgA: string;
let orgB: string;

// Actores por rol
let ownerA:     ActorContext;
let clinicianA: ActorContext;
let frontDeskA: ActorContext;
let billingA:   ActorContext;
let ownerB:     ActorContext;

// Pacientes
let patientA: string;  // paciente de orgA para pruebas principales
let patientB: string;  // paciente de orgB para pruebas de aislamiento

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
      [`${roleKey}-${rnd()}@fvo1c.test`],
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

async function mkPatient(orgId: string, name: string): Promise<string> {
  const cid = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, name, "+521" + rnd() + rnd()],
    )
  ).rows[0].id;
  return (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgId, cid],
    )
  ).rows[0].id;
}

function makeExec(orgId: string): Exec {
  return (text, params) =>
    forTenantPg(orgId, async (client) => {
      const { rows } = await client.query(text, params as any[]);
      return rows;
    });
}

beforeAll(async () => {
  await ensureRbac();

  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["Org-FVO1C-A-" + rnd(), "fvo1c-a-" + rnd()],
    )
  ).rows[0].id;

  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["Org-FVO1C-B-" + rnd(), "fvo1c-b-" + rnd()],
    )
  ).rows[0].id;

  [ownerA, clinicianA, frontDeskA, billingA] = await Promise.all([
    member(orgA, "owner"),
    member(orgA, "clinician"),
    member(orgA, "front_desk"),
    member(orgA, "billing"),
  ]);
  ownerB = await member(orgB, "owner");

  patientA = await mkPatient(orgA, "Paciente FVO1C-A");
  patientB = await mkPatient(orgB, "Paciente FVO1C-B");
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. Integridad
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — integridad de archivos y schema", () => {
  it("no existe migración 0018 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 18)).toBe(false);
  });

  it("fvo-write.ts existe", () => {
    expect(existsSync(resolve("src/server/domain/patient-record/fvo-write.ts"))).toBe(true);
  });

  it("fvo-write-schemas.ts existe", () => {
    expect(existsSync(resolve("src/server/domain/patient-record/fvo-write-schemas.ts"))).toBe(true);
  });

  it("PHASE_FVO-1C_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_FVO-1C_DELIVERY_MARKER.txt"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Gates de permisos — fail-closed
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — permission gates fail-closed", () => {
  it("upsertDemographics falla para clinician (sin patient.demographics.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertDemographics(exec, clinicianA, patientA, { sex: "M" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("upsertClinicalProfile falla para front_desk (sin patient.clinical_profile.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertClinicalProfile(exec, frontDeskA, patientA, { knownAllergies: [] }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("upsertTaxProfile falla para front_desk (sin patient.tax.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertTaxProfile(exec, frontDeskA, patientA, {}),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("addGuardian falla para clinician (sin patient.guardian.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      addGuardian(exec, clinicianA, patientA, { name: "Tutor" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("addEmergencyContact falla para clinician (sin patient.emergency_contact.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      addEmergencyContact(exec, clinicianA, patientA, { name: "Contacto" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("grantConsent falla para clinician (sin patient.consent.manage)", async () => {
    const exec = makeExec(orgA);
    await expect(
      grantConsent(exec, clinicianA, patientA, { method: "DIGITAL" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("createMedicalAlert falla para front_desk (sin patient.clinical_profile.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      createMedicalAlert(exec, frontDeskA, patientA, {
        alertType: "ALLERGY", severity: "LOW", description: "Test",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Datos demográficos — upsert idempotente + validación Zod
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — upsertDemographics", () => {
  it("inserta desde vacío y retorna demographicsId", async () => {
    const pid = await mkPatient(orgA, "Pac-Demo-Insert");
    const exec = makeExec(orgA);
    const result = await upsertDemographics(exec, ownerA, pid, {
      dateOfBirth: "1990-06-20", sex: "F", bloodType: "A+",
      occupation: "Diseñadora", maritalStatus: "SINGLE",
    });
    expect(result.demographicsId).toBeTruthy();
    const { rows } = await adminPool.query(
      `SELECT "sex","bloodType" FROM "patient_demographics" WHERE "patientId"=$1`, [pid],
    );
    expect(rows[0].sex).toBe("F");
    expect(rows[0].bloodType).toBe("A+");
  });

  it("segunda llamada actualiza sin duplicar (1 fila)", async () => {
    const pid = await mkPatient(orgA, "Pac-Demo-Upsert");
    const exec = makeExec(orgA);
    await upsertDemographics(exec, ownerA, pid, { sex: "M" });
    await upsertDemographics(exec, ownerA, pid, { sex: "F", occupation: "Médico" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt, MAX("sex") AS sex FROM "patient_demographics" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
    expect(rows[0].sex).toBe("F");
  });

  it("sex inválido lanza Zod antes de tocar BD", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertDemographics(exec, ownerA, patientA, { sex: "X" as any }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });

  it("CURP nulo es aceptado (nullable)", async () => {
    const pid = await mkPatient(orgA, "Pac-Demo-CurpNull");
    const exec = makeExec(orgA);
    await expect(
      upsertDemographics(exec, ownerA, pid, { curp: null }),
    ).resolves.toBeTruthy();
  });

  it("CURP inválido (texto libre) lanza Zod", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertDemographics(exec, ownerA, patientA, { curp: "NO-ES-CURP" }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });

  it("CURP válido (18 chars formato SEP) es aceptado", async () => {
    const pid = await mkPatient(orgA, "Pac-Demo-CurpOK");
    const exec = makeExec(orgA);
    const result = await upsertDemographics(exec, ownerA, pid, {
      curp: "MAPL900620MDFLPR09",
    });
    expect(result.demographicsId).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Domicilio — upsert idempotente
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — upsertAddress", () => {
  it("inserta desde vacío y retorna addressId", async () => {
    const pid = await mkPatient(orgA, "Pac-Addr-Insert");
    const exec = makeExec(orgA);
    const result = await upsertAddress(exec, ownerA, pid, {
      street: "Calle Maple", extNumber: "45", neighborhood: "Polanco",
      municipality: "Miguel Hidalgo", state: "CDMX", postalCode: "11560",
    });
    expect(result.addressId).toBeTruthy();
  });

  it("segunda llamada actualiza sin duplicar (1 fila)", async () => {
    const pid = await mkPatient(orgA, "Pac-Addr-Upsert");
    const exec = makeExec(orgA);
    await upsertAddress(exec, ownerA, pid, { street: "Av. Primera" });
    await upsertAddress(exec, ownerA, pid, { street: "Av. Segunda" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt, MAX("street") AS street FROM "patient_address" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
    expect(rows[0].street).toBe("Av. Segunda");
  });

  it("falla para billing (sin patient.demographics.edit)", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertAddress(exec, billingA, patientA, { street: "Calle Test" }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Origen comercial — upsert idempotente
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — upsertCommercialOrigin", () => {
  it("inserta y actualiza correctamente (1 fila)", async () => {
    const pid = await mkPatient(orgA, "Pac-Comm-Upsert");
    const exec = makeExec(orgA);
    await upsertCommercialOrigin(exec, ownerA, pid, { channel: "REFERRAL", campaign: "Campaign1" });
    await upsertCommercialOrigin(exec, ownerA, pid, { channel: "WEB", campaign: "Campaign2" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt, MAX("channel") AS channel FROM "patient_commercial_origin" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
    expect(rows[0].channel).toBe("WEB");
  });

  it("channel inválido lanza Zod", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertCommercialOrigin(exec, ownerA, patientA, { channel: "TIKTOK" as any }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Perfil clínico — upsert + arrays
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — upsertClinicalProfile", () => {
  it("inserta desde vacío con arrays y retorna clinicalProfileId", async () => {
    const pid = await mkPatient(orgA, "Pac-Clinical-Insert");
    const exec = makeExec(orgA);
    const result = await upsertClinicalProfile(exec, clinicianA, pid, {
      knownAllergies: ["Aspirina", "Penicilina"],
      currentMedications: ["Enalapril 10mg"],
      relevantHistory: "Hipertensión leve.",
      safetyNotes: "Monitorear presión.",
    });
    expect(result.clinicalProfileId).toBeTruthy();
    const { rows } = await adminPool.query(
      `SELECT "knownAllergies" FROM "patient_clinical_profile" WHERE "patientId"=$1`, [pid],
    );
    expect(rows[0].knownAllergies).toEqual(["Aspirina", "Penicilina"]);
  });

  it("segunda llamada actualiza sin duplicar (1 fila)", async () => {
    const pid = await mkPatient(orgA, "Pac-Clinical-Upsert");
    const exec = makeExec(orgA);
    await upsertClinicalProfile(exec, clinicianA, pid, { knownAllergies: ["Ibuprofeno"] });
    await upsertClinicalProfile(exec, clinicianA, pid, { knownAllergies: ["Ibuprofeno", "Aspirina"] });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_clinical_profile" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it("arrays vacíos son aceptados (nullables con default [])", async () => {
    const pid = await mkPatient(orgA, "Pac-Clinical-Empty");
    const exec = makeExec(orgA);
    await expect(
      upsertClinicalProfile(exec, clinicianA, pid, {}),
    ).resolves.toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Alertas médicas — create + deactivate
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — createMedicalAlert + deactivateMedicalAlert", () => {
  it("crea alerta y retorna alertId", async () => {
    const pid = await mkPatient(orgA, "Pac-Alert-Create");
    const exec = makeExec(orgA);
    const result = await createMedicalAlert(exec, clinicianA, pid, {
      alertType: "ALLERGY", severity: "HIGH", description: "Alergia documentada.",
    });
    expect(result.alertId).toBeTruthy();
    const { rows } = await adminPool.query(
      `SELECT "active","alertType","severity" FROM "patient_medical_alert" WHERE "id"=$1`, [result.alertId],
    );
    expect(rows[0].active).toBe(true);
    expect(rows[0].alertType).toBe("ALLERGY");
    expect(rows[0].severity).toBe("HIGH");
  });

  it("severity inválida lanza Zod antes de BD", async () => {
    const exec = makeExec(orgA);
    await expect(
      createMedicalAlert(exec, clinicianA, patientA, {
        alertType: "ALLERGY", severity: "EXTREME" as any, description: "Test",
      }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });

  it("alertType inválido lanza Zod antes de BD", async () => {
    const exec = makeExec(orgA);
    await expect(
      createMedicalAlert(exec, clinicianA, patientA, {
        alertType: "FOOD" as any, severity: "LOW", description: "Test",
      }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });

  it("deactivateMedicalAlert pone active=false", async () => {
    const pid = await mkPatient(orgA, "Pac-Alert-Deactivate");
    const exec = makeExec(orgA);
    const { alertId } = await createMedicalAlert(exec, clinicianA, pid, {
      alertType: "CONDITION", severity: "MEDIUM", description: "Condición crónica.",
    });
    await expect(deactivateMedicalAlert(exec, clinicianA, alertId)).resolves.toBeUndefined();
    const { rows } = await adminPool.query(
      `SELECT "active" FROM "patient_medical_alert" WHERE "id"=$1`, [alertId],
    );
    expect(rows[0].active).toBe(false);
  });

  it("deactivateMedicalAlert con alertId de otro org lanza error (RLS)", async () => {
    const pidB = await mkPatient(orgB, "Pac-Alert-OrgB");
    const execB = makeExec(orgB);
    const { alertId } = await createMedicalAlert(execB, ownerB, pidB, {
      alertType: "MEDICATION", severity: "LOW", description: "Medicamento.",
    });
    // Actor de orgA intenta desactivar alerta de orgB → no encontrada
    const execA = makeExec(orgA);
    await expect(
      deactivateMedicalAlert(execA, ownerA, alertId),
    ).rejects.toThrow("Alerta médica no encontrada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. Datos fiscales del paciente — upsert
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — upsertTaxProfile", () => {
  it("inserta desde vacío y retorna taxProfileId", async () => {
    const pid = await mkPatient(orgA, "Pac-Tax-Insert");
    const exec = makeExec(orgA);
    const result = await upsertTaxProfile(exec, billingA, pid, {
      rfc: "MAPL900620HDF",
      legalName: "María López",
      taxRegime: "605",
      cfdiUse: "G03",
      taxPostalCode: "11560",
    });
    expect(result.taxProfileId).toBeTruthy();
  });

  it("segunda llamada actualiza sin duplicar (1 fila)", async () => {
    const pid = await mkPatient(orgA, "Pac-Tax-Upsert");
    const exec = makeExec(orgA);
    await upsertTaxProfile(exec, billingA, pid, { legalName: "Nombre Uno" });
    await upsertTaxProfile(exec, billingA, pid, { legalName: "Nombre Dos" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt, MAX("legalName") AS "legalName" FROM "patient_tax_profile" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
    expect(rows[0].legalName).toBe("Nombre Dos");
  });

  it("RFC inválido lanza Zod antes de BD", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertTaxProfile(exec, billingA, patientA, { rfc: "RFC-INVALIDO" }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });

  it("taxPostalCode con letras lanza Zod", async () => {
    const exec = makeExec(orgA);
    await expect(
      upsertTaxProfile(exec, billingA, patientA, { taxPostalCode: "ABCDE" }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. Tutor (1:N) — solo INSERT, historia preservada
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — addGuardian (1:N)", () => {
  it("inserta tutor y retorna guardianId", async () => {
    const pid = await mkPatient(orgA, "Pac-Guardian-Insert");
    const exec = makeExec(orgA);
    const result = await addGuardian(exec, frontDeskA, pid, {
      name: "Tutor Principal", relationship: "PARENT", phone: "+5215551234567",
    });
    expect(result.guardianId).toBeTruthy();
  });

  it("dos llamadas generan 2 filas (historia preservada)", async () => {
    const pid = await mkPatient(orgA, "Pac-Guardian-1N");
    const exec = makeExec(orgA);
    await addGuardian(exec, frontDeskA, pid, { name: "Tutor Antiguo", relationship: "PARENT" });
    await addGuardian(exec, frontDeskA, pid, { name: "Tutor Nuevo", relationship: "SIBLING" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_guardian" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(2);
  });

  it("relationship inválida lanza Zod", async () => {
    const exec = makeExec(orgA);
    await expect(
      addGuardian(exec, frontDeskA, patientA, { relationship: "COUSIN" as any }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. Contacto de emergencia (1:N) — solo INSERT, historia preservada
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — addEmergencyContact (1:N)", () => {
  it("inserta contacto de emergencia y retorna contactId", async () => {
    const pid = await mkPatient(orgA, "Pac-EC-Insert");
    const exec = makeExec(orgA);
    const result = await addEmergencyContact(exec, frontDeskA, pid, {
      name: "Contacto Emergencia", relationship: "Hermana", phone: "+5215557654321",
    });
    expect(result.contactId).toBeTruthy();
  });

  it("dos llamadas generan 2 filas (historia preservada)", async () => {
    const pid = await mkPatient(orgA, "Pac-EC-1N");
    const exec = makeExec(orgA);
    await addEmergencyContact(exec, frontDeskA, pid, { name: "EC-1" });
    await addEmergencyContact(exec, frontDeskA, pid, { name: "EC-2" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_emergency_contact" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. Consentimiento — ciclo GRANTED / REVOKED
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — grantConsent / revokeConsent", () => {
  it("grantConsent inserta con status=GRANTED y retorna consentId", async () => {
    const pid = await mkPatient(orgA, "Pac-Consent-Grant");
    const exec = makeExec(orgA);
    const result = await grantConsent(exec, frontDeskA, pid, {
      method: "DIGITAL", version: "v1.0",
    });
    expect(result.consentId).toBeTruthy();
    const { rows } = await adminPool.query(
      `SELECT "status","method" FROM "patient_data_consent" WHERE "id"=$1`, [result.consentId],
    );
    expect(rows[0].status).toBe("GRANTED");
    expect(rows[0].method).toBe("DIGITAL");
  });

  it("segunda grantConsent actualiza sin duplicar (1 fila, UPSERT idempotente)", async () => {
    const pid = await mkPatient(orgA, "Pac-Consent-Idem");
    const exec = makeExec(orgA);
    await grantConsent(exec, frontDeskA, pid, { method: "VERBAL" });
    await grantConsent(exec, frontDeskA, pid, { method: "SIGNATURE" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt, MAX("method") AS method FROM "patient_data_consent" WHERE "patientId"=$1`, [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
    expect(rows[0].method).toBe("SIGNATURE");
  });

  it("revokeConsent pone status=REVOKED y grantedAt se preserva", async () => {
    const pid = await mkPatient(orgA, "Pac-Consent-Revoke");
    const exec = makeExec(orgA);
    await grantConsent(exec, frontDeskA, pid, { method: "DIGITAL", version: "v1.0" });
    const { consentId } = await revokeConsent(exec, frontDeskA, pid, {});
    const { rows } = await adminPool.query(
      `SELECT "status","grantedAt","revokedAt" FROM "patient_data_consent" WHERE "id"=$1`, [consentId],
    );
    expect(rows[0].status).toBe("REVOKED");
    expect(rows[0].revokedAt).not.toBeNull();
    expect(rows[0].grantedAt).not.toBeNull();
  });

  it("grantConsent después de revoke vuelve a GRANTED (ciclo completo)", async () => {
    const pid = await mkPatient(orgA, "Pac-Consent-Cycle");
    const exec = makeExec(orgA);
    await grantConsent(exec, frontDeskA, pid, { method: "VERBAL" });
    await revokeConsent(exec, frontDeskA, pid, {});
    const { consentId } = await grantConsent(exec, frontDeskA, pid, { method: "SIGNATURE" });
    const { rows } = await adminPool.query(
      `SELECT "status","revokedAt" FROM "patient_data_consent" WHERE "id"=$1`, [consentId],
    );
    expect(rows[0].status).toBe("GRANTED");
    expect(rows[0].revokedAt).toBeNull();
  });

  it("revokeConsent sin consentimiento previo lanza error", async () => {
    const pid = await mkPatient(orgA, "Pac-Consent-NoExist");
    const exec = makeExec(orgA);
    await expect(revokeConsent(exec, frontDeskA, pid, {})).rejects.toThrow(
      "Consentimiento no encontrado para revocar",
    );
  });

  it("method inválido en grantConsent lanza Zod", async () => {
    const exec = makeExec(orgA);
    await expect(
      grantConsent(exec, frontDeskA, patientA, { method: "FAX" as any }),
    ).rejects.toThrow("Validación FVO-1c falló");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. Auditoría sin datos sensibles
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — auditoría sin contenido sensible", () => {
  it("upsertClinicalProfile: audit_log no contiene texto clínico libre", async () => {
    const pid = await mkPatient(orgA, "Pac-Audit-Clinical");
    const exec = makeExec(orgA);
    await upsertClinicalProfile(exec, clinicianA, pid, {
      knownAllergies: ["Aspirina"],
      relevantHistory: "Historial secreto",
      safetyNotes: "Nota secreta",
    });
    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient.clinical_profile.updated' AND "entityId"=$1
       ORDER BY "id" DESC LIMIT 1`,
      [pid],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).not.toContain("Aspirina");
    expect(meta).not.toContain("Historial secreto");
    expect(meta).not.toContain("Nota secreta");
    expect(meta).not.toContain("knownAllergies");
    expect(meta).not.toContain("relevantHistory");
  });

  it("upsertTaxProfile: audit_log no contiene RFC", async () => {
    const pid = await mkPatient(orgA, "Pac-Audit-Tax");
    const exec = makeExec(orgA);
    await upsertTaxProfile(exec, billingA, pid, {
      rfc: "MAPL900620HDF", legalName: "Nombre Fiscal",
    });
    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient.tax_profile.updated' AND "entityId"=$1
       ORDER BY "id" DESC LIMIT 1`,
      [pid],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).not.toContain("MAPL900620HDF");
    expect(meta).not.toContain("rfc");
    expect(meta).not.toContain("Nombre Fiscal");
  });

  it("upsertDemographics: audit_log no contiene CURP", async () => {
    const pid = await mkPatient(orgA, "Pac-Audit-CURP");
    const exec = makeExec(orgA);
    await upsertDemographics(exec, ownerA, pid, { curp: "MAPL900620MDFLPR09" });
    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient.demographics.updated' AND "entityId"=$1
       ORDER BY "id" DESC LIMIT 1`,
      [pid],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).not.toContain("MAPL900620MDFLPR09");
    expect(meta).not.toContain("curp");
  });

  it("createMedicalAlert: audit_log contiene alertType y severity pero NO description", async () => {
    const pid = await mkPatient(orgA, "Pac-Audit-Alert");
    const exec = makeExec(orgA);
    const { alertId } = await createMedicalAlert(exec, clinicianA, pid, {
      alertType: "ALLERGY", severity: "CRITICAL",
      description: "Texto libre sensible de la alergia",
    });
    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient.medical_alert.created' AND "entityId"=$1
       ORDER BY "id" DESC LIMIT 1`,
      [alertId],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).toContain("ALLERGY");
    expect(meta).toContain("CRITICAL");
    expect(meta).not.toContain("Texto libre sensible");
    expect(meta).not.toContain("description");
  });

  it("cada operación exitosa genera exactamente 1 entrada en audit_logs", async () => {
    const pid = await mkPatient(orgA, "Pac-Audit-Count");
    const exec = makeExec(orgA);
    await upsertAddress(exec, ownerA, pid, { street: "Calle Auditoría" });
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "audit_logs"
       WHERE "action"='patient.address.updated' AND "entityId"=$1`,
      [pid],
    );
    expect(Number(rows[0].cnt)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. Aislamiento RLS multi-tenant
// ══════════════════════════════════════════════════════════════════════════════

describe("FVO-1c — aislamiento RLS multi-tenant", () => {
  it("actor de orgA no puede leer datos FVO que orgB escribió en su paciente", async () => {
    const execB = makeExec(orgB);
    await upsertDemographics(execB, ownerB, patientB, { occupation: "Secreto de OrgB" });

    // execA scoped a orgA: RLS filtra → 0 filas de patientB en orgA
    const execA = makeExec(orgA);
    const rows = await execA(
      `SELECT * FROM "patient_demographics" WHERE "patientId"=$1`,
      [patientB],
    );
    expect(rows.length).toBe(0);
  });

  it("actor de orgA no puede revocar consentimiento de paciente de orgB", async () => {
    const execB = makeExec(orgB);
    await grantConsent(execB, ownerB, patientB, { method: "DIGITAL" });

    const execA = makeExec(orgA);
    await expect(
      revokeConsent(execA, ownerA, patientB, {}),
    ).rejects.toThrow("Consentimiento no encontrado para revocar");
  });
});
