// LOOLO — Pruebas Fase FVO-1b (estabilización: seed idempotente + lecturas deterministas).
// Verifica:
// - No existe migración 0018 ni superior.
// - INSERT sin ON CONFLICT en patient_guardian y patient_emergency_contact (1:N post-0017).
// - DELETE + INSERT es idempotente en ambas tablas.
// - fetchGuardianSection retorna el más reciente cuando existen 2 filas.
// - fetchEmergencyContactSection retorna el más reciente cuando existen 2 filas.
// - Ambas funciones retornan null cuando no hay filas.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import {
  fetchGuardianSection,
  fetchEmergencyContactSection,
} from "../src/server/domain/patient-record/fvo-sections.js";
import type { Exec } from "../src/server/domain/identity/authorize.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgId: string;
let patientGuId: string;  // para tests de guardian
let patientEcId: string;  // para tests de emergencyContact

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

function makeExec(orgId: string): (text: string, params: unknown[]) => Promise<any[]> {
  return async (text, params) => {
    return forTenantPg(orgId, async (client) => {
      const { rows } = await client.query(text, params as any[]);
      return rows;
    });
  };
}

beforeAll(async () => {
  orgId = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["Org-FVO1B-" + rnd(), "fvo1b-" + rnd()],
    )
  ).rows[0].id;

  patientGuId = await mkPatient(orgId, "Paciente FVO1B-GU");
  patientEcId = await mkPatient(orgId, "Paciente FVO1B-EC");
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Integridad — sin migración 0018+
// ══════════════════════════════════════════════════════════════════════

describe("integridad de archivos FVO-1b", () => {
  it("no existe migración 0018 ni superior", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 18)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Compatibilidad seed — INSERT sin ON CONFLICT en tablas 1:N post-0017
// ══════════════════════════════════════════════════════════════════════

describe("seed compatibility — INSERT en tablas 1:N post-0017", () => {
  it("INSERT en patient_guardian (sin ON CONFLICT) no lanza error", async () => {
    await adminPool.query(
      `DELETE FROM "patient_guardian" WHERE "patientId"=$1`,
      [patientGuId],
    );
    await expect(
      adminPool.query(
        `INSERT INTO "patient_guardian"
           ("organizationId","patientId","name","relationship","phone","email")
         VALUES ($1,$2,NULL,NULL,NULL,NULL)`,
        [orgId, patientGuId],
      ),
    ).resolves.toBeDefined();
  });

  it("INSERT en patient_emergency_contact (sin ON CONFLICT) no lanza error", async () => {
    await adminPool.query(
      `DELETE FROM "patient_emergency_contact" WHERE "patientId"=$1`,
      [patientEcId],
    );
    await expect(
      adminPool.query(
        `INSERT INTO "patient_emergency_contact"
           ("organizationId","patientId","name","relationship","phone")
         VALUES ($1,$2,'Contacto Seed','Hermano','+5215551234567')`,
        [orgId, patientEcId],
      ),
    ).resolves.toBeDefined();
  });

  it("DELETE + INSERT en patient_guardian es idempotente (1 fila tras 2 ejecuciones)", async () => {
    for (let i = 0; i < 2; i++) {
      await adminPool.query(
        `DELETE FROM "patient_guardian" WHERE "patientId"=$1`,
        [patientGuId],
      );
      await adminPool.query(
        `INSERT INTO "patient_guardian"
           ("organizationId","patientId","name","relationship","phone","email")
         VALUES ($1,$2,NULL,NULL,NULL,NULL)`,
        [orgId, patientGuId],
      );
    }
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_guardian" WHERE "patientId"=$1`,
      [patientGuId],
    );
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it("DELETE + INSERT en patient_emergency_contact es idempotente (1 fila tras 2 ejecuciones)", async () => {
    for (let i = 0; i < 2; i++) {
      await adminPool.query(
        `DELETE FROM "patient_emergency_contact" WHERE "patientId"=$1`,
        [patientEcId],
      );
      await adminPool.query(
        `INSERT INTO "patient_emergency_contact"
           ("organizationId","patientId","name","relationship","phone")
         VALUES ($1,$2,'Contacto Seed','Hermano','+5215551234567')`,
        [orgId, patientEcId],
      );
    }
    const { rows } = await adminPool.query(
      `SELECT COUNT(*) AS cnt FROM "patient_emergency_contact" WHERE "patientId"=$1`,
      [patientEcId],
    );
    expect(Number(rows[0].cnt)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. fetchGuardianSection — lectura determinista con 1:N
// ══════════════════════════════════════════════════════════════════════

describe("fetchGuardianSection — determinista con múltiples filas", () => {
  it("retorna el tutor más reciente cuando existen 2 filas", async () => {
    const pid = await mkPatient(orgId, "Paciente FVO1B-GU-Det");

    await adminPool.query(
      `INSERT INTO "patient_guardian"
         ("organizationId","patientId","name","relationship","phone","email","createdAt")
       VALUES ($1,$2,'Tutor Antiguo','Padre','+5215550001111',NULL,'2020-01-01T00:00:00Z')`,
      [orgId, pid],
    );
    await adminPool.query(
      `INSERT INTO "patient_guardian"
         ("organizationId","patientId","name","relationship","phone","email","createdAt")
       VALUES ($1,$2,'Tutor Reciente','Madre','+5215550002222',NULL,'2025-01-01T00:00:00Z')`,
      [orgId, pid],
    );

    const exec = makeExec(orgId);
    const result = await fetchGuardianSection(exec, pid);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Tutor Reciente");
  });

  it("retorna null cuando no hay tutor registrado", async () => {
    const pid = await mkPatient(orgId, "Paciente FVO1B-GU-Vacio");

    const exec = makeExec(orgId);
    const result = await fetchGuardianSection(exec, pid);

    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. fetchEmergencyContactSection — lectura determinista con 1:N
// ══════════════════════════════════════════════════════════════════════

describe("fetchEmergencyContactSection — determinista con múltiples filas", () => {
  it("retorna el contacto más reciente cuando existen 2 filas", async () => {
    const pid = await mkPatient(orgId, "Paciente FVO1B-EC-Det");

    await adminPool.query(
      `INSERT INTO "patient_emergency_contact"
         ("organizationId","patientId","name","relationship","phone","createdAt")
       VALUES ($1,$2,'Contacto Antiguo','Hermano','+5215551111111','2020-01-01T00:00:00Z')`,
      [orgId, pid],
    );
    await adminPool.query(
      `INSERT INTO "patient_emergency_contact"
         ("organizationId","patientId","name","relationship","phone","createdAt")
       VALUES ($1,$2,'Contacto Reciente','Madre','+5215552222222','2025-01-01T00:00:00Z')`,
      [orgId, pid],
    );

    const exec = makeExec(orgId);
    const result = await fetchEmergencyContactSection(exec, pid);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Contacto Reciente");
    expect(result?.relationship).toBe("Madre");
  });

  it("retorna null cuando no hay contacto de emergencia registrado", async () => {
    const pid = await mkPatient(orgId, "Paciente FVO1B-EC-Vacio");

    const exec = makeExec(orgId);
    const result = await fetchEmergencyContactSection(exec, pid);

    expect(result).toBeNull();
  });
});
