// LOOLO — Pruebas Fase 5B (Odontograma). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { createEncounter, finalizeEncounter, cancelEncounter } from "../src/server/domain/clinical/encounters.js";
import {
  recordFinding, supersedeFinding, getOdontogram, listFindingsForEncounter,
  OrgRefError, CoherenceError, EncounterStateError,
} from "../src/server/domain/clinical/odontogram.js";
import { resolveOdontogram } from "../src/server/domain/clinical/odontogram-resolver.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let clinicianCtxA: ActorContext, frontCtxA: ActorContext, billingCtxA: ActorContext;
let patA: string, patB: string;

async function ensureRbac() {
  for (const p of PERMISSIONS) await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  for (const r of ROLES) {
    const id = (await adminPool.query(`INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`, [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions) await adminPool.query(`INSERT INTO "role_permissions"("roleId","permissionId") SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`, [id, pk]);
  }
}
async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (await adminPool.query(`INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`, [`${roleKey}-${rnd()}@t.test`])).rows[0].id;
  const memberId = (await adminPool.query(`INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`, [orgId, userId, roleKey])).rows[0].id;
  await adminPool.query(`INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`, [memberId, roleKey]);
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId" WHERE mr."memberId"=$1`, [memberId]);
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r) => r.key)) };
}
async function mkPatient(orgId: string) {
  const c = (await adminPool.query(`INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'P') RETURNING id`, [orgId])).rows[0].id;
  return (await adminPool.query(`INSERT INTO "patients"("organizationId","contactId") VALUES ($1,$2) RETURNING id`, [orgId, c])).rows[0].id;
}
const runA = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgA, async (c) => work(execOf(c)));
const mkEncA = (patientId = patA) => runA((e) => createEncounter(e, clinicianCtxA, { patientId, chiefComplaint: "rev" }));

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  clinicianCtxA = await member(orgA, "clinician");
  frontCtxA = await member(orgA, "front_desk");
  billingCtxA = await member(orgA, "billing");
  patA = await mkPatient(orgA); patB = await mkPatient(orgB);
});
afterAll(async () => { await closePools(); });

describe("Registro / FDI / same-org / coherencia", () => {
  it("registra hallazgo válido (caries oclusal)", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 16, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" }));
    expect(findingId).toBeTruthy();
  });

  it("FDI inválido → rechazado (Zod)", async () => {
    const { encounterId } = await mkEncA();
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 49, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" }))).rejects.toThrow(/Validación 5B/);
  });

  it("paciente de otra org → OrgRefError", async () => {
    const { encounterId } = await mkEncA();
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patB, encounterId, toothFdi: 16, findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toBeInstanceOf(OrgRefError);
  });

  it("encounter de otro paciente → CoherenceError", async () => {
    const { encounterId } = await mkEncA(); // de patA
    const otherPat = await mkPatient(orgA);
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: otherPat, encounterId, toothFdi: 16, findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toBeInstanceOf(CoherenceError);
  });
});

describe("Matriz surface↔type / estado de consulta", () => {
  it("CARIES exige surface; MISSING prohíbe surface", async () => {
    const { encounterId } = await mkEncA();
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 21, findingType: "CARIES", toothStatus: "PRESENT" }))).rejects.toThrow(/exige surface/);
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 21, surface: "MESIAL", findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toThrow(/no admite surface/);
  });

  it("no se registra en consulta FINALIZED ni CANCELED (decisión 9)", async () => {
    const fin = await mkEncA(); await runA((e) => finalizeEncounter(e, clinicianCtxA, fin.encounterId));
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId: fin.encounterId, toothFdi: 36, findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toBeInstanceOf(EncounterStateError);
    const can = await mkEncA(); await runA((e) => cancelEncounter(e, clinicianCtxA, can.encounterId));
    await expect(runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId: can.encounterId, toothFdi: 36, findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toBeInstanceOf(EncounterStateError);
  });
});

describe("Append-only / supersede / resolver", () => {
  it("append-only: UPDATE/DELETE rechazados por grants", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 24, findingType: "CROWN", toothStatus: "PRESENT" }));
    await expect(runA((e) => e(`UPDATE "odontogram_findings" SET "note"='x' WHERE "id"=$1`, [findingId]))).rejects.toBeTruthy();
    await expect(runA((e) => e(`DELETE FROM "odontogram_findings" WHERE "id"=$1`, [findingId]))).rejects.toBeTruthy();
  });

  it("supersede encadena y resolver devuelve solo el vigente", async () => {
    const { encounterId } = await mkEncA();
    const first = await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 26, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" }));
    const second = await runA((e) => supersedeFinding(e, clinicianCtxA, { supersedesFindingId: first.findingId, encounterId, toothFdi: 26, surface: "OCCLUSAL", findingType: "RESTORATION", toothStatus: "PRESENT" }));
    const vig = await runA((e) => getOdontogram(e, clinicianCtxA, patA));
    const t26 = vig.filter((f: any) => f.toothFdi === 26 && f.surface === "OCCLUSAL");
    expect(t26.length).toBe(1);
    expect(t26[0].id).toBe(second.findingId);
    expect(t26[0].findingType).toBe("RESTORATION");
  });

  it("supersede en pieza distinta → CoherenceError", async () => {
    const { encounterId } = await mkEncA();
    const f = await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 27, surface: "MESIAL", findingType: "CARIES", toothStatus: "PRESENT" }));
    await expect(runA((e) => supersedeFinding(e, clinicianCtxA, { supersedesFindingId: f.findingId, encounterId, toothFdi: 28, surface: "MESIAL", findingType: "RESTORATION", toothStatus: "PRESENT" }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("resolveOdontogram (puro) colapsa cadena A←B←C", () => {
    const vig = resolveOdontogram([
      { id: "A", toothFdi: 11, surface: null, findingType: "CARIES", toothStatus: "PRESENT", supersedesFindingId: null },
      { id: "B", toothFdi: 11, surface: null, findingType: "RESTORATION", toothStatus: "PRESENT", supersedesFindingId: "A" },
      { id: "C", toothFdi: 11, surface: null, findingType: "CROWN", toothStatus: "PRESENT", supersedesFindingId: "B" },
      { id: "D", toothFdi: 12, surface: null, findingType: "MISSING", toothStatus: "ABSENT", supersedesFindingId: null },
    ]);
    expect(vig.map((f) => f.id).sort()).toEqual(["C", "D"]);
  });
});

describe("Auditoría / eventos / enforcement / RLS", () => {
  it("getOdontogram audita odontogram.viewed sin note", async () => {
    const { encounterId } = await mkEncA();
    await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 31, surface: "VESTIBULAR", findingType: "RESTORATION", toothStatus: "PRESENT", note: "secreto-odo" }));
    await runA((e) => getOdontogram(e, clinicianCtxA, patA));
    const rows = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='odontogram.viewed' AND "entityType"='patient' AND "entityId"=$1`, [patA])));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(rows)).not.toMatch(/secreto-odo/);
  });

  it("eventos odontograma NO llevan note", async () => {
    const { encounterId } = await mkEncA();
    await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 41, surface: "INCISAL", findingType: "CARIES", toothStatus: "PRESENT", note: "nota-secreta-evt" }));
    const evs = await runA(async (e) => (await e(`SELECT payload FROM "events" WHERE type LIKE 'odontogram.%'`, [])));
    expect(JSON.stringify(evs)).not.toMatch(/nota-secreta-evt/);
  });

  it("front_desk NO registra (durable, sin cambios); billing NO ve", async () => {
    const { encounterId } = await mkEncA();
    const before = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "odontogram_findings"`, []))[0].count));
    await expect(guardConfigOperation(runA, frontCtxA, "odontogram.record", (e) => recordFinding(e, frontCtxA, { patientId: patA, encounterId, toothFdi: 16, findingType: "MISSING", toothStatus: "ABSENT" }))).rejects.toBeInstanceOf(PermissionDeniedError);
    const after = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "odontogram_findings"`, []))[0].count));
    expect(after).toBe(before);
    await expect(guardConfigOperation(runA, billingCtxA, "odontogram.view", (e) => getOdontogram(e, billingCtxA, patA))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("org B no ve hallazgos de A", async () => {
    const { encounterId } = await mkEncA();
    await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId, toothFdi: 46, findingType: "IMPLANT", toothStatus: "PRESENT" }));
    const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "odontogram_findings" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(seen.length).toBe(0);
  });
});
