// NELZZON — Operaciones de Plan de tratamiento (Fase 5C). Tenant-scoped (app_user/RLS).
// Mutable por estado con transiciones controladas (ajustes A/B). Sin texto clínico en eventos/auditoría (D).
// Same-org fail-closed (E). Un plan ACTIVE por paciente (índice único parcial). Completar sin ítems vivos (C).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import {
  parseOrThrow, CreatePlanInputZ, AddItemInputZ, UpdateItemInputZ,
  canPlanTransition, canItemTransition, PLAN_TERMINAL, ITEM_TERMINAL, ITEM_LIVE,
} from "./treatment-schemas.js";

export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }
export class CoherenceError extends Error { constructor(m: string) { super(m); this.name = "CoherenceError"; } }
export class TransitionError extends Error { constructor(m: string) { super(m); this.name = "TransitionError"; } }
export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = "NotFoundError"; } }
export class ItemsStillOpenError extends Error { constructor(m: string) { super(m); this.name = "ItemsStillOpenError"; } }
export class PlanActiveConflictError extends Error { constructor(m = "Ya existe un plan ACTIVE para el paciente.") { super(m); this.name = "PlanActiveConflictError"; } }

// Estados de hallazgo que pueden vincularse a un nuevo ítem de plan (1G-A).
const LINKABLE_FINDING_STATUS = new Set(["ACTIVE", "OBSERVATION"]);

// Permiso requerido según estado destino (plan e ítem).
const PLAN_PERM: Record<string, string> = { PROPOSED: "treatment.propose", ACCEPTED: "treatment.accept", REJECTED: "treatment.accept", ACTIVE: "treatment.accept", COMPLETED: "treatment.complete", CANCELED: "treatment.cancel" };
const ITEM_PERM: Record<string, string> = { ACCEPTED: "treatment.accept", REJECTED: "treatment.accept", IN_PROGRESS: "treatment.edit", COMPLETED: "treatment.complete", CANCELED: "treatment.cancel" };
const PLAN_TS: Record<string, string> = { PROPOSED: "proposedAt", ACCEPTED: "acceptedAt", ACTIVE: "activatedAt", COMPLETED: "completedAt", REJECTED: "rejectedAt", CANCELED: "canceledAt" };

async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}
async function audit(exec: Exec, ctx: ActorContext, action: string, entityType: string, entityId: string, extra: Record<string, unknown> = {}) {
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER", action, entityType, entityId, metadata: extra });
}
async function existsInOrg(exec: Exec, table: string, id: string | undefined, label: string) {
  if (!id) return;
  if ((await exec(`SELECT 1 FROM "${table}" WHERE "id"=$1`, [id])).length === 0) throw new OrgRefError(`${label} no pertenece a la organización (fail-closed).`);
}
async function loadPlan(exec: Exec, organizationId: string, id: string) {
  const p = (await exec(`SELECT * FROM "treatment_plans" WHERE "id"=$1 AND "organizationId"=$2`, [id, organizationId]))[0];
  if (!p) throw new NotFoundError(`Plan no encontrado: ${id}`);
  return p;
}
async function loadItem(exec: Exec, organizationId: string, id: string) {
  const it = (await exec(`SELECT * FROM "treatment_plan_items" WHERE "id"=$1 AND "organizationId"=$2`, [id, organizationId]))[0];
  if (!it) throw new NotFoundError(`Ítem no encontrado: ${id}`);
  return it;
}

export async function createPlan(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "treatment.create");
  const input = parseOrThrow(CreatePlanInputZ, raw);
  await existsInOrg(exec, "patients", input.patientId, "patientId");
  if (input.encounterId) {
    const enc = (await exec(`SELECT "patientId" FROM "clinical_encounters" WHERE "id"=$1`, [input.encounterId]))[0];
    if (!enc) throw new OrgRefError("encounterId no pertenece a la organización (fail-closed).");
    if (enc.patientId !== input.patientId) throw new CoherenceError("La consulta no corresponde al mismo paciente.");
  }
  await existsInOrg(exec, "resources", input.professionalResourceId, "professionalResourceId");
  const id = (await exec(
    `INSERT INTO "treatment_plans"("organizationId","patientId","encounterId","professionalResourceId","status","title","notes","createdBy")
     VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,$7) RETURNING "id"`,
    [ctx.organizationId, input.patientId, input.encounterId ?? null, input.professionalResourceId ?? null, input.title ?? null, input.notes ?? null, ctx.userId],
  ))[0].id;
  await emit(exec, ctx.organizationId, "treatment.plan_created", { planId: id, patientId: input.patientId });
  await audit(exec, ctx, "treatment.plan_created", "treatment_plan", id, { patientId: input.patientId });
  return { planId: id };
}

export async function addItem(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "treatment.create");
  const input = parseOrThrow(AddItemInputZ, raw);
  const plan = await loadPlan(exec, ctx.organizationId, input.planId);
  if (PLAN_TERMINAL.has(plan.status)) throw new TransitionError(`No se agregan ítems a un plan ${plan.status}.`);
  await existsInOrg(exec, "resources", input.professionalResourceId, "professionalResourceId");
  // Coherencia linkedFindingId↔pieza (ajuste 6/E)
  if (input.linkedFindingId) {
    const fnd = (await exec(`SELECT "patientId","toothFdi","surface","lifecycleStatus" FROM "odontogram_findings" WHERE "id"=$1`, [input.linkedFindingId]))[0];
    if (!fnd) throw new OrgRefError("linkedFindingId no pertenece a la organización (fail-closed).");
    if (fnd.patientId !== plan.patientId) throw new CoherenceError("El hallazgo no corresponde al paciente del plan.");
    if (input.toothFdi !== undefined && input.toothFdi !== fnd.toothFdi) throw new CoherenceError("toothFdi del ítem no coincide con el hallazgo.");
    if (input.toothFdi === undefined) throw new CoherenceError("Un ítem con linkedFindingId debe declarar toothFdi coincidente.");
    if (input.surface !== undefined && (input.surface ?? null) !== (fnd.surface ?? null)) throw new CoherenceError("surface del ítem no coincide con el hallazgo.");
    // Solo hallazgos vigentes (1G-A) — un hallazgo ya tratado/resuelto/controlado/anulado
    // no debe poder vincularse a un nuevo ítem de plan.
    if (!LINKABLE_FINDING_STATUS.has(fnd.lifecycleStatus)) throw new CoherenceError("El hallazgo no está en un estado vinculable a un tratamiento (debe estar ACTIVE u OBSERVATION).");
  }
  const id = (await exec(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","surface","procedureType","status","priority","sequence","note","professionalResourceId","linkedFindingId","createdBy")
     VALUES ($1,$2,$3,$4,$5,'PROPOSED',$6,$7,$8,$9,$10,$11) RETURNING "id"`,
    [ctx.organizationId, input.planId, input.toothFdi ?? null, input.surface ?? null, input.procedureType,
      input.priority ?? "NORMAL", input.sequence ?? 0, input.note ?? null, input.professionalResourceId ?? null, input.linkedFindingId ?? null, ctx.userId],
  ))[0].id;
  await emit(exec, ctx.organizationId, "treatment.item_added", { itemId: id, planId: input.planId, procedureType: input.procedureType, ...(input.toothFdi !== undefined ? { toothFdi: input.toothFdi } : {}) });
  await audit(exec, ctx, "treatment.item_added", "treatment_plan_item", id, { planId: input.planId, procedureType: input.procedureType });
  return { itemId: id };
}

export async function updateItem(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "treatment.edit");
  const input = parseOrThrow(UpdateItemInputZ, raw);
  const it = await loadItem(exec, ctx.organizationId, input.itemId);
  if (ITEM_TERMINAL.has(it.status)) throw new TransitionError(`Ítem terminal (${it.status}) no editable.`);
  // Si el ítem liga un hallazgo, conservar coherencia de pieza/superficie
  if (it.linkedFindingId) {
    const newFdi = input.toothFdi ?? it.toothFdi;
    const fnd = (await exec(`SELECT "toothFdi","surface" FROM "odontogram_findings" WHERE "id"=$1`, [it.linkedFindingId]))[0];
    if (fnd && newFdi !== fnd.toothFdi) throw new CoherenceError("toothFdi no puede divergir del hallazgo ligado.");
    if (fnd && input.surface !== undefined && (input.surface ?? null) !== (fnd.surface ?? null)) throw new CoherenceError("surface no puede divergir del hallazgo ligado.");
  }
  await exec(
    `UPDATE "treatment_plan_items" SET
       "procedureType"=COALESCE($2,"procedureType"),
       "toothFdi"=COALESCE($3,"toothFdi"),
       "surface"=COALESCE($4,"surface"),
       "priority"=COALESCE($5,"priority"),
       "sequence"=COALESCE($6,"sequence"),
       "note"=COALESCE($7,"note"),
       "updatedAt"=now()
     WHERE "id"=$1`,
    [input.itemId, input.procedureType ?? null, input.toothFdi ?? null, input.surface ?? null, input.priority ?? null, input.sequence ?? null, input.note ?? null],
  );
  await audit(exec, ctx, "treatment.item_edited", "treatment_plan_item", input.itemId, {});
  return { itemId: input.itemId };
}

export async function setPlanStatus(exec: Exec, ctx: ActorContext, planId: string, to: string) {
  const perm = PLAN_PERM[to];
  if (!perm) throw new TransitionError(`Estado de plan inválido: ${to}.`);
  authorize(ctx, perm);
  const plan = await loadPlan(exec, ctx.organizationId, planId);
  if (!canPlanTransition(plan.status, to)) throw new TransitionError(`Transición de plan no permitida: ${plan.status}→${to}.`);
  if (to === "COMPLETED") {
    const live = Number((await exec(`SELECT count(*) FROM "treatment_plan_items" WHERE "planId"=$1 AND "status"=ANY($2)`, [planId, Array.from(ITEM_LIVE)]))[0].count);
    if (live > 0) throw new ItemsStillOpenError("No se completa el plan: existen ítems vivos (PROPOSED/ACCEPTED/IN_PROGRESS).");
  }
  const tsCol = PLAN_TS[to];
  try {
    await exec(`UPDATE "treatment_plans" SET "status"=$2, "${tsCol}"=now(), "updatedAt"=now() WHERE "id"=$1`, [planId, to]);
  } catch (e: any) {
    if (e && e.code === "23505") throw new PlanActiveConflictError();
    throw e;
  }
  await emit(exec, ctx.organizationId, "treatment.plan_status_changed", { planId, status: to });
  await audit(exec, ctx, "treatment.plan_status_changed", "treatment_plan", planId, { status: to });
}

export async function setItemStatus(exec: Exec, ctx: ActorContext, itemId: string, to: string) {
  const perm = ITEM_PERM[to];
  if (!perm) throw new TransitionError(`Estado de ítem inválido: ${to}.`);
  authorize(ctx, perm);
  const it = await loadItem(exec, ctx.organizationId, itemId);
  const plan = await loadPlan(exec, ctx.organizationId, it.planId);
  if (PLAN_TERMINAL.has(plan.status)) throw new TransitionError(`Plan ${plan.status}: no se cambian ítems.`);
  if (!canItemTransition(it.status, to)) throw new TransitionError(`Transición de ítem no permitida: ${it.status}→${to}.`);
  const tsCol = to === "COMPLETED" ? "completedAt" : to === "CANCELED" ? "canceledAt" : null;
  if (tsCol) await exec(`UPDATE "treatment_plan_items" SET "status"=$2, "${tsCol}"=now(), "updatedAt"=now() WHERE "id"=$1`, [itemId, to]);
  else await exec(`UPDATE "treatment_plan_items" SET "status"=$2, "updatedAt"=now() WHERE "id"=$1`, [itemId, to]);
  await emit(exec, ctx.organizationId, "treatment.item_status_changed", { itemId, status: to });
  await audit(exec, ctx, "treatment.item_status_changed", "treatment_plan_item", itemId, { status: to });
}

// Lecturas: exigen treatment.view y AUDITAN treatment.viewed SIN contenido (ajuste D).
export async function getPlan(exec: Exec, ctx: ActorContext, planId: string) {
  authorize(ctx, "treatment.view");
  const plan = await loadPlan(exec, ctx.organizationId, planId);
  const items = await exec(`SELECT * FROM "treatment_plan_items" WHERE "planId"=$1 ORDER BY "sequence" ASC, "createdAt" ASC`, [planId]);
  await audit(exec, ctx, "treatment.viewed", "treatment_plan", planId, { patientId: plan.patientId, accessType: "getPlan" });
  return { plan, items };
}

export async function listPlansForPatient(exec: Exec, ctx: ActorContext, patientId: string) {
  authorize(ctx, "treatment.view");
  const rows = await exec(`SELECT "id","status","title","createdAt" FROM "treatment_plans" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`, [patientId]);
  await audit(exec, ctx, "treatment.viewed", "patient", patientId, { accessType: "listPlansForPatient", count: rows.length });
  return rows;
}
