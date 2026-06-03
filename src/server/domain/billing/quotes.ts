// LOOLO — Operaciones de Presupuestos (Fase 6A). Tenant-scoped (app_user/RLS).
// Dinero recalculado SIEMPRE en servidor (motor puro). Editable solo en DRAFT.
// Snapshot por línea. Eventos sin montos; auditoría con totalCents+status (sin texto libre).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { computeLine, computeTotals, type LineAmounts } from "./calc.js";
import {
  parseOrThrow, CreateQuoteInputZ, AddLineInputZ, UpdateLineInputZ,
  canQuoteTransition,
} from "./schemas.js";

export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }
export class CoherenceError extends Error { constructor(m: string) { super(m); this.name = "CoherenceError"; } }
export class TransitionError extends Error { constructor(m: string) { super(m); this.name = "TransitionError"; } }
export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = "NotFoundError"; } }
export class FrozenError extends Error { constructor(m = "El presupuesto no es editable fuera de DRAFT.") { super(m); this.name = "FrozenError"; } }

const STATUS_PERM: Record<string, string> = { PROPOSED: "quote.propose", ACCEPTED: "quote.accept", REJECTED: "quote.accept", EXPIRED: "quote.cancel", CANCELED: "quote.cancel" };
const STATUS_TS: Record<string, string> = { PROPOSED: "proposedAt", ACCEPTED: "acceptedAt", REJECTED: "rejectedAt", EXPIRED: "expiredAt", CANCELED: "canceledAt" };
const STATUS_EVENT: Record<string, string> = { PROPOSED: "quote.proposed", ACCEPTED: "quote.accepted", REJECTED: "quote.rejected", EXPIRED: "quote.expired", CANCELED: "quote.canceled" };

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
async function loadQuote(exec: Exec, organizationId: string, id: string) {
  const q = (await exec(`SELECT * FROM "quotes" WHERE "id"=$1 AND "organizationId"=$2`, [id, organizationId]))[0];
  if (!q) throw new NotFoundError(`Presupuesto no encontrado: ${id}`);
  return q;
}

// Recalcula y persiste totales del encabezado desde sus líneas (fuente única de verdad).
async function recalcAndPersist(exec: Exec, quoteId: string) {
  const rows = await exec(`SELECT "subtotalCents","discountCents","taxCents","totalCents" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]);
  const totals = computeTotals(rows.map((r: any) => ({
    subtotalCents: Number(r.subtotalCents), discountCents: Number(r.discountCents), taxCents: Number(r.taxCents), totalCents: Number(r.totalCents),
  })));
  await exec(`UPDATE "quotes" SET "subtotalCents"=$2,"discountTotalCents"=$3,"taxTotalCents"=$4,"totalCents"=$5,"updatedAt"=now() WHERE "id"=$1`,
    [quoteId, totals.subtotalCents, totals.discountTotalCents, totals.taxTotalCents, totals.totalCents]);
  return totals;
}

// Valida coherencia de ítem de plan (mismo plan/paciente/org) y devuelve snapshot del ítem.
async function resolvePlanItemSnapshot(exec: Exec, treatmentPlanItemId: string | undefined, quotePlanId: string | null, patientId: string) {
  if (!treatmentPlanItemId) return null;
  const it = (await exec(`SELECT "planId","toothFdi","surface","procedureType" FROM "treatment_plan_items" WHERE "id"=$1`, [treatmentPlanItemId]))[0];
  if (!it) throw new OrgRefError("treatmentPlanItemId no pertenece a la organización (fail-closed).");
  const plan = (await exec(`SELECT "patientId" FROM "treatment_plans" WHERE "id"=$1`, [it.planId]))[0];
  if (!plan || plan.patientId !== patientId) throw new CoherenceError("El ítem de plan no corresponde al paciente del presupuesto.");
  if (quotePlanId && it.planId !== quotePlanId) throw new CoherenceError("El ítem no pertenece al treatmentPlanId del presupuesto.");
  return it;
}

async function insertLine(exec: Exec, ctx: ActorContext, quote: any, line: any) {
  const snap = await resolvePlanItemSnapshot(exec, line.treatmentPlanItemId, quote.treatmentPlanId, quote.patientId);
  const amounts: LineAmounts = computeLine({ quantity: line.quantity, unitPriceCents: line.unitPriceCents, discountCents: line.discountCents ?? 0, taxRateBps: line.taxRateBps ?? 0 });
  const id = (await exec(
    `INSERT INTO "quote_lines"
       ("organizationId","quoteId","treatmentPlanItemId","description","procedureType","toothFdi","surface",
        "quantity","unitPriceCents","discountCents","taxRateBps","subtotalCents","taxCents","totalCents","currency","sortOrder")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'MXN',$15) RETURNING "id"`,
    [ctx.organizationId, quote.id, line.treatmentPlanItemId ?? null, line.description,
      line.procedureType ?? snap?.procedureType ?? null, line.toothFdi ?? snap?.toothFdi ?? null, line.surface ?? snap?.surface ?? null,
      line.quantity, line.unitPriceCents, line.discountCents ?? 0, line.taxRateBps ?? 0,
      amounts.subtotalCents, amounts.taxCents, amounts.totalCents, line.sortOrder ?? 0],
  ))[0].id;
  return id;
}

export async function createQuote(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "quote.create");
  const input = parseOrThrow(CreateQuoteInputZ, raw);
  await existsInOrg(exec, "patients", input.patientId, "patientId");
  if (input.treatmentPlanId) {
    const plan = (await exec(`SELECT "patientId" FROM "treatment_plans" WHERE "id"=$1`, [input.treatmentPlanId]))[0];
    if (!plan) throw new OrgRefError("treatmentPlanId no pertenece a la organización (fail-closed).");
    if (plan.patientId !== input.patientId) throw new CoherenceError("El plan no corresponde al mismo paciente.");
  }
  const quote = (await exec(
    `INSERT INTO "quotes"("organizationId","patientId","treatmentPlanId","status","currency","quoteNumber","validUntil","notes","createdBy")
     VALUES ($1,$2,$3,'DRAFT','MXN',$4,$5,$6,$7) RETURNING *`,
    [ctx.organizationId, input.patientId, input.treatmentPlanId ?? null, input.quoteNumber ?? null, input.validUntil ?? null, input.notes ?? null, ctx.userId],
  ))[0];
  for (const line of input.lines ?? []) await insertLine(exec, ctx, quote, line);
  const totals = await recalcAndPersist(exec, quote.id);
  await emit(exec, ctx.organizationId, "quote.created", { quoteId: quote.id, patientId: input.patientId });
  await audit(exec, ctx, "quote.created", "quote", quote.id, { patientId: input.patientId, totalCents: totals.totalCents, status: "DRAFT" });
  return { quoteId: quote.id, totals };
}

export async function addLine(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "quote.edit");
  const input = parseOrThrow(AddLineInputZ, raw);
  const quote = await loadQuote(exec, ctx.organizationId, input.quoteId);
  if (quote.status !== "DRAFT") throw new FrozenError();
  const id = await insertLine(exec, ctx, quote, input);
  const totals = await recalcAndPersist(exec, quote.id);
  await audit(exec, ctx, "quote.line_edited", "quote", quote.id, { lineId: id, action: "add", totalCents: totals.totalCents });
  return { lineId: id, totals };
}

export async function updateLine(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "quote.edit");
  const input = parseOrThrow(UpdateLineInputZ, raw);
  const line = (await exec(`SELECT * FROM "quote_lines" WHERE "id"=$1 AND "organizationId"=$2`, [input.lineId, ctx.organizationId]))[0];
  if (!line) throw new NotFoundError("Línea no encontrada.");
  const quote = await loadQuote(exec, ctx.organizationId, line.quoteId);
  if (quote.status !== "DRAFT") throw new FrozenError();
  const merged = {
    quantity: input.quantity ?? Number(line.quantity),
    unitPriceCents: input.unitPriceCents ?? Number(line.unitPriceCents),
    discountCents: input.discountCents ?? Number(line.discountCents),
    taxRateBps: input.taxRateBps ?? Number(line.taxRateBps),
  };
  const a = computeLine(merged);
  await exec(
    `UPDATE "quote_lines" SET
       "description"=COALESCE($2,"description"), "quantity"=$3, "unitPriceCents"=$4, "discountCents"=$5, "taxRateBps"=$6,
       "subtotalCents"=$7, "taxCents"=$8, "totalCents"=$9, "sortOrder"=COALESCE($10,"sortOrder")
     WHERE "id"=$1`,
    [input.lineId, input.description ?? null, merged.quantity, merged.unitPriceCents, merged.discountCents, merged.taxRateBps,
      a.subtotalCents, a.taxCents, a.totalCents, input.sortOrder ?? null],
  );
  const totals = await recalcAndPersist(exec, quote.id);
  await audit(exec, ctx, "quote.line_edited", "quote", quote.id, { lineId: input.lineId, action: "update", totalCents: totals.totalCents });
  return { lineId: input.lineId, totals };
}

export async function removeLine(exec: Exec, ctx: ActorContext, lineId: string) {
  authorize(ctx, "quote.edit");
  const line = (await exec(`SELECT * FROM "quote_lines" WHERE "id"=$1 AND "organizationId"=$2`, [lineId, ctx.organizationId]))[0];
  if (!line) throw new NotFoundError("Línea no encontrada.");
  const quote = await loadQuote(exec, ctx.organizationId, line.quoteId);
  if (quote.status !== "DRAFT") throw new FrozenError();
  await exec(`DELETE FROM "quote_lines" WHERE "id"=$1`, [lineId]);
  const totals = await recalcAndPersist(exec, quote.id);
  await audit(exec, ctx, "quote.line_edited", "quote", quote.id, { lineId, action: "remove", totalCents: totals.totalCents });
  return { totals };
}

export async function setQuoteStatus(exec: Exec, ctx: ActorContext, quoteId: string, to: string) {
  const perm = STATUS_PERM[to];
  if (!perm) throw new TransitionError(`Estado de presupuesto inválido: ${to}.`);
  authorize(ctx, perm);
  const quote = await loadQuote(exec, ctx.organizationId, quoteId);
  if (!canQuoteTransition(quote.status, to)) throw new TransitionError(`Transición no permitida: ${quote.status}→${to}.`);
  const tsCol = STATUS_TS[to];
  await exec(`UPDATE "quotes" SET "status"=$2, "${tsCol}"=now(), "updatedAt"=now() WHERE "id"=$1`, [quoteId, to]);
  await emit(exec, ctx.organizationId, STATUS_EVENT[to], { quoteId });
  await audit(exec, ctx, `quote.${to.toLowerCase()}`, "quote", quoteId, { status: to, totalCents: Number(quote.totalCents) });
}

// Lecturas: exigen quote.view y AUDITAN quote.viewed (sin texto libre; con totalCents).
export async function getQuote(exec: Exec, ctx: ActorContext, quoteId: string) {
  authorize(ctx, "quote.view");
  const quote = await loadQuote(exec, ctx.organizationId, quoteId);
  const lines = await exec(`SELECT * FROM "quote_lines" WHERE "quoteId"=$1 ORDER BY "sortOrder" ASC, "createdAt" ASC`, [quoteId]);
  await audit(exec, ctx, "quote.viewed", "quote", quoteId, { patientId: quote.patientId, totalCents: Number(quote.totalCents), accessType: "getQuote" });
  return { quote, lines };
}

export async function listQuotesForPatient(exec: Exec, ctx: ActorContext, patientId: string) {
  authorize(ctx, "quote.view");
  const rows = await exec(`SELECT "id","status","totalCents","currency","createdAt" FROM "quotes" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`, [patientId]);
  await audit(exec, ctx, "quote.viewed", "patient", patientId, { accessType: "listQuotesForPatient", count: rows.length });
  return rows;
}
