// NELZZON — Pruebas Fase 6B (Cobros/Pagos). Postgres real + motor puro + concurrencia.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { createQuote, setQuoteStatus } from "../src/server/domain/billing/quotes.js";
import {
  recordPayment, reversePayment, getQuoteBalance, listPaymentsForQuote,
  OrgRefError, QuoteNotAcceptedError, OverpayError, AlreadyReversedError, NotReversibleError,
} from "../src/server/domain/billing/payments.js";
import { computeBalance } from "../src/server/domain/billing/payments-calc.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let billingCtxA: ActorContext, frontCtxA: ActorContext, accountantCtxA: ActorContext, clinicianCtxA: ActorContext;
let patA: string;

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

// Crea un quote ACCEPTED con total = totalCents (una línea sin impuesto), vía billing.
async function acceptedQuote(totalCents: number, patientId = patA): Promise<string> {
  const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId, lines: [{ description: "Tratamiento", quantity: 1, unitPriceCents: totalCents, discountCents: 0, taxRateBps: 0 }] }));
  await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "PROPOSED"));
  await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "ACCEPTED"));
  return quoteId;
}

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  billingCtxA = await member(orgA, "billing");
  frontCtxA = await member(orgA, "front_desk");
  accountantCtxA = await member(orgA, "accountant");
  clinicianCtxA = await member(orgA, "clinician");
  patA = await mkPatient(orgA);
});
afterAll(async () => { await closePools(); });

describe("Motor de saldo (puro)", () => {
  it("pagos suman, reversa resta, liquidado", () => {
    const b1 = computeBalance(100000, [{ entryKind: "PAYMENT", amountCents: 40000 }]);
    expect(b1).toEqual({ paidCents: 40000, balanceCents: 60000, liquidado: false });
    const b2 = computeBalance(100000, [{ entryKind: "PAYMENT", amountCents: 100000 }]);
    expect(b2.liquidado).toBe(true);
    const b3 = computeBalance(100000, [{ entryKind: "PAYMENT", amountCents: 40000 }, { entryKind: "REVERSAL", amountCents: 40000 }]);
    expect(b3).toEqual({ paidCents: 0, balanceCents: 100000, liquidado: false });
  });
});

describe("Pagos / saldo / sobrepago / estado del quote", () => {
  it("pago parcial baja saldo; getQuoteBalance refleja", async () => {
    const q = await acceptedQuote(100000);
    const r = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 40000, method: "CASH" }));
    expect(r.balanceAfterCents).toBe(60000);
    const bal = await runA((e) => getQuoteBalance(e, billingCtxA, q));
    expect(bal.balanceCents).toBe(60000);
    expect(bal.paidCents).toBe(40000);
  });
  it("pago exacto → liquidado (balance 0)", async () => {
    const q = await acceptedQuote(50000);
    await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 50000, method: "CARD" }));
    const bal = await runA((e) => getQuoteBalance(e, billingCtxA, q));
    expect(bal.balanceCents).toBe(0);
    expect(bal.liquidado).toBe(true);
  });
  it("pago mayor al saldo → OverpayError", async () => {
    const q = await acceptedQuote(30000);
    await expect(runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 30001, method: "CASH" }))).rejects.toBeInstanceOf(OverpayError);
  });
  it("pago sobre quote NO ACCEPTED → QuoteNotAcceptedError", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [{ description: "x", quantity: 1, unitPriceCents: 1000, discountCents: 0, taxRateBps: 0 }] }));
    await expect(runA((e) => recordPayment(e, billingCtxA, { quoteId, amountCents: 500, method: "CASH" }))).rejects.toBeInstanceOf(QuoteNotAcceptedError);
  });
});

describe("Reversa / inmutabilidad", () => {
  it("reversa sube saldo; doble reversa rechazada; revertir un REVERSAL rechazado", async () => {
    const q = await acceptedQuote(100000);
    const p = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 40000, method: "CASH" }));
    const rev = await runA((e) => reversePayment(e, billingCtxA, { paymentId: p.paymentId }));
    expect(rev.balanceAfterCents).toBe(100000);
    await expect(runA((e) => reversePayment(e, billingCtxA, { paymentId: p.paymentId }))).rejects.toBeInstanceOf(AlreadyReversedError);
    await expect(runA((e) => reversePayment(e, billingCtxA, { paymentId: rev.paymentId }))).rejects.toBeInstanceOf(NotReversibleError);
  });
  it("append-only: UPDATE/DELETE de payments rechazados por grants", async () => {
    const q = await acceptedQuote(10000);
    const p = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 5000, method: "CASH" }));
    await expect(runA((e) => e(`UPDATE "payments" SET "amountCents"=1 WHERE "id"=$1`, [p.paymentId]))).rejects.toBeTruthy();
    await expect(runA((e) => e(`DELETE FROM "payments" WHERE "id"=$1`, [p.paymentId]))).rejects.toBeTruthy();
  });
});

describe("Concurrencia (anti sobrepago)", () => {
  it("dos pagos simultáneos que juntos exceden el saldo: solo uno pasa, sin sobrepago", async () => {
    const q = await acceptedQuote(100000);
    const results = await Promise.allSettled([
      runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 60000, method: "CASH" })),
      runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 60000, method: "CARD" })),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(1); // el lock impide el segundo
    const bal = await runA((e) => getQuoteBalance(e, billingCtxA, q));
    expect(bal.paidCents).toBeLessThanOrEqual(100000); // nunca sobrepago
    expect(bal.paidCents).toBe(60000);
  });
});

describe("Permisos / eventos / auditoría / same-org / RLS / anti-PAN", () => {
  it("clinician y accountant NO registran (durable); front_desk y billing sí", async () => {
    const q = await acceptedQuote(20000);
    for (const ctx of [clinicianCtxA, accountantCtxA]) {
      await expect(guardConfigOperation(runA, ctx, "payment.record", (e) => recordPayment(e, ctx, { quoteId: q, amountCents: 1000, method: "CASH" }))).rejects.toBeInstanceOf(PermissionDeniedError);
    }
    const f = await runA((e) => recordPayment(e, frontCtxA, { quoteId: q, amountCents: 1000, method: "CASH" }));
    expect(f.paymentId).toBeTruthy();
    const denied = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied' AND "actorUserId"=$1`, [clinicianCtxA.userId]))[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });
  it("front_desk NO puede revertir (sin payment.reverse)", async () => {
    const q = await acceptedQuote(20000);
    const p = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 5000, method: "CASH" }));
    await expect(guardConfigOperation(runA, frontCtxA, "payment.reverse", (e) => reversePayment(e, frontCtxA, { paymentId: p.paymentId }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });
  it("eventos NO llevan montos", async () => {
    const q = await acceptedQuote(77777);
    const p = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 77777, method: "CASH" }));
    await runA((e) => reversePayment(e, billingCtxA, { paymentId: p.paymentId }));
    const evs = await runA(async (e) => (await e(`SELECT payload FROM "events" WHERE type LIKE 'payment.%'`, [])));
    expect(JSON.stringify(evs)).not.toMatch(/77777|amountCents|balance/);
  });
  it("auditoría registra amount+balance, sin texto libre", async () => {
    const q = await acceptedQuote(10000);
    await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 10000, method: "TRANSFER", reference: "folio-interno-9" }));
    const rows = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='payment.recorded' AND metadata->>'quoteId'=$1`, [q])));
    const blob = JSON.stringify(rows);
    expect(blob).toMatch(/amountCents/);
    expect(blob).toMatch(/balanceAfterCents/);
    expect(blob).not.toMatch(/folio-interno-9/); // reference no va a auditoría
  });
  it("patientId derivado del quote (coincide)", async () => {
    const q = await acceptedQuote(5000);
    const p = await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 5000, method: "CASH" }));
    const row = await runA(async (e) => (await e(`SELECT "patientId" FROM "payments" WHERE "id"=$1`, [p.paymentId]))[0]);
    expect(row.patientId).toBe(patA);
  });
  it("anti-PAN: reference con 16 dígitos seguidos → rechazado (Zod)", async () => {
    const q = await acceptedQuote(5000);
    await expect(runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 1000, method: "CARD", reference: "4111111111111111" }))).rejects.toThrow(/Validación 6B/);
  });
  it("quote de otra org → OrgRefError", async () => {
    const patB = await mkPatient(orgB);
    const qB = (await adminPool.query(`INSERT INTO "quotes"("organizationId","patientId","status","currency","totalCents","createdBy") VALUES ($1,$2,'ACCEPTED','MXN',10000,$3) RETURNING id`, [orgB, patB, billingCtxA.userId])).rows[0].id;
    await expect(runA((e) => recordPayment(e, billingCtxA, { quoteId: qB, amountCents: 1000, method: "CASH" }))).rejects.toBeInstanceOf(OrgRefError);
  });
  it("org B no ve payments de A", async () => {
    const q = await acceptedQuote(5000);
    await runA((e) => recordPayment(e, billingCtxA, { quoteId: q, amountCents: 5000, method: "CASH" }));
    const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "payments" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(seen.length).toBe(0);
  });
});
