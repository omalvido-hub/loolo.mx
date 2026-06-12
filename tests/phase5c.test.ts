// NELZZON — Pruebas Fase 5C (Plan de tratamiento). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { createEncounter } from "../src/server/domain/clinical/encounters.js";
import { recordFinding, voidFinding, treatFinding, resolveFinding } from "../src/server/domain/clinical/odontogram.js";
import {
  createPlan, addItem, updateItem, setPlanStatus, setItemStatus, getPlan, listPlansForPatient,
  OrgRefError, CoherenceError, TransitionError, ItemsStillOpenError, PlanActiveConflictError,
} from "../src/server/domain/clinical/treatment.js";
import { canPlanTransition, canItemTransition } from "../src/server/domain/clinical/treatment-schemas.js";

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
const mkPlan = (patientId = patA, over: Record<string, unknown> = {}) => runA((e) => createPlan(e, clinicianCtxA, { patientId, ...over }));
async function activate(planId: string) {
  await runA((e) => setPlanStatus(e, clinicianCtxA, planId, "PROPOSED"));
  await runA((e) => setPlanStatus(e, clinicianCtxA, planId, "ACCEPTED"));
  await runA((e) => setPlanStatus(e, clinicianCtxA, planId, "ACTIVE"));
}

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

describe("Crear / same-org / coherencia", () => {
  it("crea plan con paciente válido", async () => {
    const { planId } = await mkPlan();
    expect(planId).toBeTruthy();
  });
  it("paciente de otra org → OrgRefError", async () => {
    await expect(runA((e) => createPlan(e, clinicianCtxA, { patientId: patB }))).rejects.toBeInstanceOf(OrgRefError);
  });
  it("encounter de otro paciente → CoherenceError", async () => {
    const otherPat = await mkPatient(orgA);
    const enc = await runA((e) => createEncounter(e, clinicianCtxA, { patientId: otherPat, chiefComplaint: "x" }));
    await expect(runA((e) => createPlan(e, clinicianCtxA, { patientId: patA, encounterId: enc.encounterId }))).rejects.toBeInstanceOf(CoherenceError);
  });
  it("ítem con linkedFindingId exige coherencia de pieza", async () => {
    const enc = await runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "x" }));
    const fnd = await runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId: enc.encounterId, toothFdi: 16, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" }));
    const { planId } = await mkPlan();
    // pieza distinta → CoherenceError
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 17, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }))).rejects.toBeInstanceOf(CoherenceError);
    // coincidente → ok
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 16, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it.itemId).toBeTruthy();
  });
});

describe("addItem — vinculación con hallazgo según lifecycleStatus (1G-A)", () => {
  async function newFinding(toothFdi: number) {
    const enc = await runA((e) => createEncounter(e, clinicianCtxA, { patientId: patA, chiefComplaint: "x" }));
    return runA((e) => recordFinding(e, clinicianCtxA, { patientId: patA, encounterId: enc.encounterId, toothFdi, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" }));
  }

  it("hallazgo ACTIVE → vinculación permitida", async () => {
    const fnd = await newFinding(24);
    const { planId } = await mkPlan();
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 24, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it.itemId).toBeTruthy();
  });

  it("hallazgo OBSERVATION → vinculación permitida", async () => {
    const fnd = await newFinding(25);
    const obs = await runA((e) => resolveFinding(e, clinicianCtxA, { findingId: fnd.findingId, targetStatus: "OBSERVATION" }));
    const { planId } = await mkPlan();
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 25, surface: "OCCLUSAL", linkedFindingId: obs.findingId }));
    expect(it.itemId).toBeTruthy();
  });

  it("hallazgo TREATED → CoherenceError", async () => {
    const fnd = await newFinding(26);
    const treated = await runA((e) => treatFinding(e, clinicianCtxA, { findingId: fnd.findingId, lifecycleReason: "ya tratado" }));
    const { planId } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 26, surface: "OCCLUSAL", linkedFindingId: treated.findingId }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("hallazgo RESOLVED → CoherenceError", async () => {
    const fnd = await newFinding(27);
    const resolved = await runA((e) => resolveFinding(e, clinicianCtxA, { findingId: fnd.findingId, targetStatus: "RESOLVED" }));
    const { planId } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 27, surface: "OCCLUSAL", linkedFindingId: resolved.findingId }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("hallazgo CONTROLLED → CoherenceError", async () => {
    const fnd = await newFinding(28);
    const controlled = await runA((e) => resolveFinding(e, clinicianCtxA, { findingId: fnd.findingId, targetStatus: "CONTROLLED" }));
    const { planId } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 28, surface: "OCCLUSAL", linkedFindingId: controlled.findingId }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("hallazgo VOIDED → CoherenceError", async () => {
    const fnd = await newFinding(18);
    const voided = await runA((e) => voidFinding(e, clinicianCtxA, { findingId: fnd.findingId, lifecycleReason: "error de registro" }));
    const { planId } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 18, surface: "OCCLUSAL", linkedFindingId: voided.findingId }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("mismo linkedFindingId en un segundo ítem abierto → CoherenceError", async () => {
    const fnd = await newFinding(31);
    const { planId: plan1 } = await mkPlan();
    const it1 = await runA((e) => addItem(e, clinicianCtxA, { planId: plan1, procedureType: "RESTORATION", toothFdi: 31, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it1.itemId).toBeTruthy();

    const { planId: plan2 } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId: plan2, procedureType: "RESTORATION", toothFdi: 31, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }))).rejects.toBeInstanceOf(CoherenceError);
  });

  it("linkedFindingId liberado tras cancelar el ítem previo → permite replanificar", async () => {
    const fnd = await newFinding(32);
    const { planId: plan1 } = await mkPlan();
    const it1 = await runA((e) => addItem(e, clinicianCtxA, { planId: plan1, procedureType: "RESTORATION", toothFdi: 32, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    await runA((e) => setItemStatus(e, clinicianCtxA, it1.itemId, "CANCELED"));

    const { planId: plan2 } = await mkPlan();
    const it2 = await runA((e) => addItem(e, clinicianCtxA, { planId: plan2, procedureType: "RESTORATION", toothFdi: 32, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it2.itemId).toBeTruthy();
  });

  it("linkedFindingId liberado tras cancelar el plan previo → permite replanificar", async () => {
    const fnd = await newFinding(33);
    const { planId: plan1 } = await mkPlan();
    const it1 = await runA((e) => addItem(e, clinicianCtxA, { planId: plan1, procedureType: "RESTORATION", toothFdi: 33, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it1.itemId).toBeTruthy();
    await runA((e) => setPlanStatus(e, clinicianCtxA, plan1, "CANCELED"));

    const { planId: plan2 } = await mkPlan();
    const it2 = await runA((e) => addItem(e, clinicianCtxA, { planId: plan2, procedureType: "RESTORATION", toothFdi: 33, surface: "OCCLUSAL", linkedFindingId: fnd.findingId }));
    expect(it2.itemId).toBeTruthy();
  });

  it("hallazgo de otro paciente/tenant → OrgRefError", async () => {
    const encB = await forTenantPg(orgB, async (c) => {
      const ctxB = await member(orgB, "clinician");
      const e = execOf(c);
      const enc = await createEncounter(e, ctxB, { patientId: patB, chiefComplaint: "x" });
      const fnd = await recordFinding(e, ctxB, { patientId: patB, encounterId: enc.encounterId, toothFdi: 17, surface: "OCCLUSAL", findingType: "CARIES", toothStatus: "PRESENT" });
      return fnd;
    });
    const { planId } = await mkPlan();
    await expect(runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 17, surface: "OCCLUSAL", linkedFindingId: encB.findingId }))).rejects.toBeInstanceOf(OrgRefError);
  });
});

describe("Transiciones plan / ítem", () => {
  it("transición de plan inválida (DRAFT→ACTIVE) rechazada", async () => {
    const { planId } = await mkPlan();
    await expect(runA((e) => setPlanStatus(e, clinicianCtxA, planId, "ACTIVE"))).rejects.toBeInstanceOf(TransitionError);
  });
  it("flujo de plan válido DRAFT→PROPOSED→ACCEPTED→ACTIVE→COMPLETED", async () => {
    const { planId } = await mkPlan();
    await activate(planId);
    await runA((e) => setPlanStatus(e, clinicianCtxA, planId, "COMPLETED"));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "treatment_plans" WHERE "id"=$1`, [planId]))[0].status);
    expect(st).toBe("COMPLETED");
  });
  it("ítem: transición inválida (PROPOSED→COMPLETED) y editar terminal", async () => {
    const { planId } = await mkPlan();
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "EXAM" }));
    await expect(runA((e) => setItemStatus(e, clinicianCtxA, it.itemId, "COMPLETED"))).rejects.toBeInstanceOf(TransitionError);
    await runA((e) => setItemStatus(e, clinicianCtxA, it.itemId, "CANCELED"));
    await expect(runA((e) => updateItem(e, clinicianCtxA, { itemId: it.itemId, note: "x" }))).rejects.toBeInstanceOf(TransitionError);
  });
  it("transiciones puras (matrices)", () => {
    expect(canPlanTransition("DRAFT", "PROPOSED")).toBe(true);
    expect(canPlanTransition("DRAFT", "ACTIVE")).toBe(false);
    expect(canPlanTransition("COMPLETED", "ACTIVE")).toBe(false);
    expect(canItemTransition("ACCEPTED", "IN_PROGRESS")).toBe(true);
    expect(canItemTransition("PROPOSED", "COMPLETED")).toBe(false);
  });
});

describe("Reglas de negocio", () => {
  it("un solo plan ACTIVE por paciente (índice único parcial)", async () => {
    const pat = await mkPatient(orgA);
    const p1 = (await mkPlan(pat)).planId; await activate(p1);
    const p2 = (await mkPlan(pat)).planId;
    await runA((e) => setPlanStatus(e, clinicianCtxA, p2, "PROPOSED"));
    await runA((e) => setPlanStatus(e, clinicianCtxA, p2, "ACCEPTED"));
    await expect(runA((e) => setPlanStatus(e, clinicianCtxA, p2, "ACTIVE"))).rejects.toBeInstanceOf(PlanActiveConflictError);
  });
  it("completar plan con ítems vivos → ItemsStillOpenError", async () => {
    const pat = await mkPatient(orgA);
    const { planId } = await mkPlan(pat);
    await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "EXAM" }));
    await activate(planId);
    await expect(runA((e) => setPlanStatus(e, clinicianCtxA, planId, "COMPLETED"))).rejects.toBeInstanceOf(ItemsStillOpenError);
  });
});

describe("Enforcement / eventos / auditoría / RLS", () => {
  it("front_desk NO crea (durable, sin cambios); billing NO ve", async () => {
    const before = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "treatment_plans"`, []))[0].count));
    await expect(guardConfigOperation(runA, frontCtxA, "treatment.create", (e) => createPlan(e, frontCtxA, { patientId: patA }))).rejects.toBeInstanceOf(PermissionDeniedError);
    const after = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "treatment_plans"`, []))[0].count));
    expect(after).toBe(before);
    const { planId } = await mkPlan();
    await expect(guardConfigOperation(runA, billingCtxA, "treatment.view", (e) => getPlan(e, billingCtxA, planId))).rejects.toBeInstanceOf(PermissionDeniedError);
  });
  it("eventos NO llevan title/notes/note", async () => {
    const { planId } = await mkPlan(patA, { title: "plan-secreto", notes: "notas-secretas-plan" });
    await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "CROWN", note: "nota-secreta-item" }));
    const evs = await runA(async (e) => (await e(`SELECT payload FROM "events" WHERE type LIKE 'treatment.%'`, [])));
    const blob = JSON.stringify(evs);
    expect(blob).not.toMatch(/secreto|secreta/);
  });
  it("getPlan audita treatment.viewed sin contenido", async () => {
    const { planId } = await mkPlan(patA, { notes: "confidencial-xyz" });
    await runA((e) => getPlan(e, clinicianCtxA, planId));
    const rows = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='treatment.viewed' AND "entityId"=$1`, [planId])));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(rows)).not.toMatch(/confidencial-xyz/);
  });
  it("org B no ve planes/ítems de A", async () => {
    const { planId } = await mkPlan();
    await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "EXAM" }));
    for (const t of ["treatment_plans", "treatment_plan_items"]) {
      const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "${t}" WHERE "organizationId"=$1`, [orgA])).rows);
      expect(seen.length).toBe(0);
    }
  });
});
