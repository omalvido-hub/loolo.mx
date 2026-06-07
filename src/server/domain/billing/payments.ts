// NELZZON — Operaciones de Pagos (Fase 6B). Tenant-scoped (app_user/RLS).
// Ledger append-only. recordPayment con lock pesimista del quote (anti sobrepago concurrente).
// Reversa total, una por pago. Eventos sin montos; auditoría con metadata financiera (sin texto libre).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { computeBalance, type PaymentEntry } from "./payments-calc.js";
import { parseOrThrow, RecordPaymentInputZ, ReversePaymentInputZ } from "./payment-schemas.js";

export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }
export class QuoteNotAcceptedError extends Error { constructor(m = "El presupuesto debe estar ACCEPTED para recibir pagos.") { super(m); this.name = "QuoteNotAcceptedError"; } }
export class OverpayError extends Error { constructor(m = "El pago excede el saldo disponible.") { super(m); this.name = "OverpayError"; } }
export class AlreadyReversedError extends Error { constructor(m = "El pago ya fue revertido.") { super(m); this.name = "AlreadyReversedError"; } }
export class NotReversibleError extends Error { constructor(m: string) { super(m); this.name = "NotReversibleError"; } }
export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = "NotFoundError"; } }

async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}
// Auditoría financiera: metadata estructurada (montos/saldo/método), SIN texto libre ni reference.
async function audit(exec: Exec, ctx: ActorContext, action: string, entityId: string, meta: Record<string, unknown>) {
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER", action, entityType: "payment", entityId, metadata: meta });
}

async function loadEntries(exec: Exec, quoteId: string): Promise<PaymentEntry[]> {
  const rows = await exec(`SELECT "entryKind","amountCents" FROM "payments" WHERE "quoteId"=$1`, [quoteId]);
  return rows.map((r: any) => ({ entryKind: r.entryKind, amountCents: Number(r.amountCents) }));
}

export async function recordPayment(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "payment.record");
  const input = parseOrThrow(RecordPaymentInputZ, raw);
  // Lock pesimista del quote (misma tx) → evita sobrepago concurrente.
  const quote = (await exec(`SELECT "patientId","status","totalCents" FROM "quotes" WHERE "id"=$1 AND "organizationId"=$2 FOR UPDATE`, [input.quoteId, ctx.organizationId]))[0];
  if (!quote) throw new OrgRefError("quoteId no pertenece a la organización (fail-closed).");
  if (quote.status !== "ACCEPTED") throw new QuoteNotAcceptedError();
  const { balanceCents } = computeBalance(Number(quote.totalCents), await loadEntries(exec, input.quoteId));
  if (input.amountCents > balanceCents) throw new OverpayError();
  const id = (await exec(
    `INSERT INTO "payments"("organizationId","quoteId","patientId","entryKind","amountCents","method","status","reference","recordedByUserId")
     VALUES ($1,$2,$3,'PAYMENT',$4,$5,'CONFIRMED',$6,$7) RETURNING "id"`,
    [ctx.organizationId, input.quoteId, quote.patientId, input.amountCents, input.method, input.reference ?? null, ctx.userId],
  ))[0].id;
  const balanceAfterCents = balanceCents - input.amountCents;
  await emit(exec, ctx.organizationId, "payment.recorded", { paymentId: id, quoteId: input.quoteId, patientId: quote.patientId });
  await audit(exec, ctx, "payment.recorded", id, { quoteId: input.quoteId, paymentId: id, entryKind: "PAYMENT", amountCents: input.amountCents, balanceAfterCents, method: input.method });
  return { paymentId: id, balanceAfterCents };
}

export async function reversePayment(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "payment.reverse");
  const input = parseOrThrow(ReversePaymentInputZ, raw);
  const orig = (await exec(`SELECT * FROM "payments" WHERE "id"=$1 AND "organizationId"=$2`, [input.paymentId, ctx.organizationId]))[0];
  if (!orig) throw new OrgRefError("paymentId no pertenece a la organización (fail-closed).");
  if (orig.entryKind !== "PAYMENT") throw new NotReversibleError("Solo se revierte un PAYMENT (no un REVERSAL).");
  // Lock del quote para recomputar saldo de forma consistente.
  const quote = (await exec(`SELECT "totalCents" FROM "quotes" WHERE "id"=$1 AND "organizationId"=$2 FOR UPDATE`, [orig.quoteId, ctx.organizationId]))[0];
  if (!quote) throw new OrgRefError("quote del pago no pertenece a la organización (fail-closed).");
  const already = await exec(`SELECT 1 FROM "payments" WHERE "reversesPaymentId"=$1 AND "entryKind"='REVERSAL'`, [input.paymentId]);
  if (already.length > 0) throw new AlreadyReversedError();
  let id: string;
  try {
    id = (await exec(
      `INSERT INTO "payments"("organizationId","quoteId","patientId","entryKind","amountCents","method","status","reversesPaymentId","voidReason","recordedByUserId")
       VALUES ($1,$2,$3,'REVERSAL',$4,$5,'CONFIRMED',$6,$7,$8) RETURNING "id"`,
      [ctx.organizationId, orig.quoteId, orig.patientId, Number(orig.amountCents), orig.method, input.paymentId, input.reference ?? null, ctx.userId],
    ))[0].id;
  } catch (e: any) {
    if (e && e.code === "23505") throw new AlreadyReversedError(); // índice único parcial
    throw e;
  }
  const { balanceCents } = computeBalance(Number(quote.totalCents), await loadEntries(exec, orig.quoteId));
  await emit(exec, ctx.organizationId, "payment.reversed", { paymentId: id, reversesPaymentId: input.paymentId, quoteId: orig.quoteId, patientId: orig.patientId });
  await audit(exec, ctx, "payment.reversed", id, { quoteId: orig.quoteId, paymentId: id, reversesPaymentId: input.paymentId, entryKind: "REVERSAL", amountCents: Number(orig.amountCents), balanceAfterCents: balanceCents, method: orig.method });
  return { paymentId: id, balanceAfterCents: balanceCents };
}

// Lecturas: exigen payment.view y AUDITAN payment.viewed (con metadata financiera, sin texto libre).
export async function getQuoteBalance(exec: Exec, ctx: ActorContext, quoteId: string) {
  authorize(ctx, "payment.view");
  const quote = (await exec(`SELECT "patientId","totalCents" FROM "quotes" WHERE "id"=$1 AND "organizationId"=$2`, [quoteId, ctx.organizationId]))[0];
  if (!quote) throw new OrgRefError("quoteId no pertenece a la organización (fail-closed).");
  const bal = computeBalance(Number(quote.totalCents), await loadEntries(exec, quoteId));
  await audit(exec, ctx, "payment.viewed", quoteId, { quoteId, balanceAfterCents: bal.balanceCents, paidCents: bal.paidCents, accessType: "getQuoteBalance" });
  return { quoteId, totalCents: Number(quote.totalCents), ...bal };
}

export async function listPaymentsForQuote(exec: Exec, ctx: ActorContext, quoteId: string) {
  authorize(ctx, "payment.view");
  const rows = await exec(`SELECT "id","entryKind","amountCents","method","reversesPaymentId","paidAt" FROM "payments" WHERE "quoteId"=$1 ORDER BY "createdAt" ASC`, [quoteId]);
  await audit(exec, ctx, "payment.viewed", quoteId, { quoteId, accessType: "listPaymentsForQuote", count: rows.length });
  return rows;
}

export async function listPaymentsForPatient(exec: Exec, ctx: ActorContext, patientId: string) {
  authorize(ctx, "payment.view");
  const rows = await exec(`SELECT "id","quoteId","entryKind","amountCents","method","paidAt" FROM "payments" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`, [patientId]);
  await audit(exec, ctx, "payment.viewed", patientId, { accessType: "listPaymentsForPatient", count: rows.length });
  return rows;
}
