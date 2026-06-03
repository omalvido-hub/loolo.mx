// LOOLO — Pruebas Fase 5A (Consulta clínica). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import {
  createEncounter, startEncounter, updateEncounter, addClinicalNote,
  finalizeEncounter, cancelEncounter, getEncounter, listEncountersForPatient,
  ClinicalTransitionError, OrgRefError, CoherenceError,
} from "../src/server/domain/clinical/encounters.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let ownerCtxA: ActorContext, clinicianCtxA: ActorContext, frontCtxA: ActorContext, billingCtxA: ActorContext;
let patA: string, patB: string, profA: string, profB: string;

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
const mkEnc = (ctx: ActorContext, over: Record<string, unknown> = {}) =>
  runA((e) => createEncounter(e, ctx, { patientId: patA, chiefComplaint: "dolor molar", ...over }));

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  ownerCtxA = await member(orgA, "owner");
  clinicianCtxA = await member(orgA, "clinician");
  frontCtxA = await member(orgA, "front_desk");
  billingCtxA = await member(orgA, "billing");
  patA = await mkPatient(orgA); patB = await mkPatient(orgB);
  profA = (await adminPool.query(`INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,'PROFESSIONAL','Dra A') RETURNING id`, [orgA])).rows[0].id;
  profB = (await adminPool.query(`INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,'PROFESSIONAL','Dra B') RETURNING id`, [orgB])).rows[0].id;
});
afterAll(async () => { await closePools(); });

describe("Crear / same-org / coherencia", () => {
  it("crea consulta con paciente válido (clinician)", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA, { professionalResourceId: profA });
    expect(encounterId).toBeTruthy();
  });

  it("Zod: chiefComplaint vacío → rechazado", async () => {
    await expect(runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "" }))).rejects.toThrow(/Validación 5A/);
  });

  it("paciente de otra org → OrgRefError (fail-closed)", async () => {
    await expect(runA((e) => createEncounter(e, clinicianCtxA, { patientId: patB, chiefComplaint: "x" }))).rejects.toBeInstanceOf(OrgRefError);
  });

  it("profesional de otra org → OrgRefError (ajuste E)", async () => {
    await expect(runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "x", professionalResourceId: profB }))).rejects.toBeInstanceOf(OrgRefError);
  });

  it("coherencia appointment↔paciente (ajuste D)", async () => {
    const apptSame = (await adminPool.query(`INSERT INTO "appointments"("organizationId","patientId","startAt","endAt","status","source","createdBy") VALUES ($1,$2, now(), now()+interval '30 min','SCHEDULED','MANUAL',$3) RETURNING id`, [orgA, patA, ownerCtxA.userId])).rows[0].id;
    const otherPat = await mkPatient(orgA);
    const apptOther = (await adminPool.query(`INSERT INTO "appointments"("organizationId","patientId","startAt","endAt","status","source","createdBy") VALUES ($1,$2, now(), now()+interval '30 min','SCHEDULED','MANUAL',$3) RETURNING id`, [orgA, otherPat, ownerCtxA.userId])).rows[0].id;
    const ok = await runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "ok", appointmentId: apptSame }));
    expect(ok.encounterId).toBeTruthy();
    await expect(runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "x", appointmentId: apptOther }))).rejects.toBeInstanceOf(CoherenceError);
  });
});

describe("Estados / inmutabilidad / notas", () => {
  it("editar solo DRAFT/IN_PROGRESS; FINALIZED inmutable", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA);
    await runA((e) => startEncounter(e, clinicianCtxA, encounterId));
    await runA((e) => updateEncounter(e, clinicianCtxA, { encounterId, preliminaryDiagnosis: "caries" }));
    await runA((e) => finalizeEncounter(e, clinicianCtxA, encounterId));
    await expect(runA((e) => updateEncounter(e, clinicianCtxA, { encounterId, observations: "no" }))).rejects.toBeInstanceOf(ClinicalTransitionError);
    await expect(runA((e) => addClinicalNote(e, clinicianCtxA, { encounterId, body: "tardía" }))).rejects.toBeInstanceOf(ClinicalTransitionError);
  });

  it("cancelar bloquea finalizar", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA);
    await runA((e) => cancelEncounter(e, clinicianCtxA, encounterId));
    await expect(runA((e) => finalizeEncounter(e, clinicianCtxA, encounterId))).rejects.toBeInstanceOf(ClinicalTransitionError);
  });

  it("notas append-only: UPDATE/DELETE rechazados por grants", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA);
    const { noteId } = await runA((e) => addClinicalNote(e, clinicianCtxA, { encounterId, body: "primera nota" }));
    await expect(runA((e) => e(`UPDATE "clinical_notes" SET "body"='editada' WHERE "id"=$1`, [noteId]))).rejects.toBeTruthy();
    await expect(runA((e) => e(`DELETE FROM "clinical_notes" WHERE "id"=$1`, [noteId]))).rejects.toBeTruthy();
  });
});

describe("Enforcement clínico (acceso estrecho)", () => {
  it("front_desk NO crea consulta (durable + sin cambios)", async () => {
    const before = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "clinical_encounters"`, []))[0].count));
    await expect(guardConfigOperation(runA, frontCtxA, "clinical.create", (e) => createEncounter(e, frontCtxA, { patientId: patA, chiefComplaint: "x" }))).rejects.toBeInstanceOf(PermissionDeniedError);
    const after = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "clinical_encounters"`, []))[0].count));
    expect(after).toBe(before);
    const denied = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied' AND "actorUserId"=$1`, [frontCtxA.userId]))[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });

  it("front_desk NO ve consulta; billing tampoco", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA);
    await expect(guardConfigOperation(runA, frontCtxA, "clinical.view", (e) => getEncounter(e, frontCtxA, encounterId))).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(guardConfigOperation(runA, billingCtxA, "clinical.view", (e) => getEncounter(e, billingCtxA, encounterId))).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});

describe("Lectura auditada / eventos sin contenido / RLS", () => {
  it("getEncounter audita clinical.viewed sin contenido", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA, { preliminaryDiagnosis: "secreto", observations: "secreto-obs" });
    await runA((e) => getEncounter(e, clinicianCtxA, encounterId));
    const rows = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='clinical.viewed' AND "entityId"=$1`, [encounterId])));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const meta = JSON.stringify(rows[0].metadata);
    expect(meta).not.toMatch(/secreto/);
  });

  it("listEncountersForPatient audita lectura", async () => {
    await runA((e) => listEncountersForPatient(e, clinicianCtxA, patA));
    const cnt = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='clinical.viewed' AND "entityType"='patient' AND "entityId"=$1`, [patA]))[0].count));
    expect(cnt).toBeGreaterThanOrEqual(1);
  });

  it("eventos clínicos NO llevan contenido clínico", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA, { preliminaryDiagnosis: "diag-secreto", chiefComplaint: "motivo-secreto" });
    await runA((e) => finalizeEncounter(e, clinicianCtxA, encounterId));
    const evs = await runA(async (e) => (await e(`SELECT type, payload FROM "events" WHERE type LIKE 'clinical.%'`, [])));
    const blob = JSON.stringify(evs);
    expect(blob).not.toMatch(/diag-secreto/);
    expect(blob).not.toMatch(/motivo-secreto/);
  });

  it("org B no ve encounters/notes de A", async () => {
    const { encounterId } = await mkEnc(clinicianCtxA);
    await runA((e) => addClinicalNote(e, clinicianCtxA, { encounterId, body: "n" }));
    for (const t of ["clinical_encounters", "clinical_notes"]) {
      const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "${t}" WHERE "organizationId"=$1`, [orgA])).rows);
      expect(seen.length).toBe(0);
    }
  });
});
