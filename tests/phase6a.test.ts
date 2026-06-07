// NELZZON — Pruebas Fase 6A (Presupuestos). Postgres real + motor puro.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { createPlan, addItem, updateItem } from "../src/server/domain/clinical/treatment.js";
import {
  createQuote, addLine, updateLine, removeLine, setQuoteStatus, getQuote, listQuotesForPatient,
  OrgRefError, CoherenceError, TransitionError, FrozenError,
} from "../src/server/domain/billing/quotes.js";
import { computeLine, computeTotals, divRoundHalfUp } from "../src/server/domain/billing/calc.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let billingCtxA: ActorContext, frontCtxA: ActorContext, clinicianCtxA: ActorContext, accountantCtxA: ActorContext;
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
const line = (over: Record<string, unknown> = {}) => ({ description: "Servicio", quantity: 1, unitPriceCents: 50000, discountCents: 0, taxRateBps: 1600, ...over });

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  billingCtxA = await member(orgA, "billing");
  frontCtxA = await member(orgA, "front_desk");
  clinicianCtxA = await member(orgA, "clinician");
  accountantCtxA = await member(orgA, "accountant");
  patA = await mkPatient(orgA); patB = await mkPatient(orgB);
});
afterAll(async () => { await closePools(); });

describe("Motor de cálculo (puro)", () => {
  it("redondeo half-up de impuesto por línea", () => {
    expect(divRoundHalfUp(5000, 10000)).toBe(1);  // 0.5 → 1
    expect(divRoundHalfUp(4500, 10000)).toBe(0);   // 0.45 → 0
    // base 10, 5% → 0.5 → 1 centavo
    expect(computeLine({ quantity: 1, unitPriceCents: 10, discountCents: 0, taxRateBps: 500 }).taxCents).toBe(1);
    // base 9, 5% → 0.45 → 0
    expect(computeLine({ quantity: 1, unitPriceCents: 9, discountCents: 0, taxRateBps: 500 }).taxCents).toBe(0);
  });
  it("línea: subtotal/descuento/impuesto/total", () => {
    const a = computeLine({ quantity: 2, unitPriceCents: 50000, discountCents: 10000, taxRateBps: 1600 });
    expect(a.subtotalCents).toBe(100000);
    // base 90000, iva 16% = 14400, total 104400
    expect(a.taxCents).toBe(14400);
    expect(a.totalCents).toBe(104400);
  });
  it("descuento > subtotal lanza", () => {
    expect(() => computeLine({ quantity: 1, unitPriceCents: 100, discountCents: 200, taxRateBps: 0 })).toThrow();
  });
  it("totales = suma de líneas", () => {
    const l1 = computeLine({ quantity: 1, unitPriceCents: 10000, discountCents: 0, taxRateBps: 1600 });
    const l2 = computeLine({ quantity: 3, unitPriceCents: 5000, discountCents: 1000, taxRateBps: 0 });
    const t = computeTotals([l1, l2]);
    expect(t.subtotalCents).toBe(10000 + 15000);
    expect(t.taxTotalCents).toBe(1600 + 0);
    expect(t.totalCents).toBe(11600 + 14000);
  });
});

describe("Crear / totales persistidos / snapshot / same-org", () => {
  it("crea presupuesto con líneas y persiste totales = suma", async () => {
    const { quoteId, totals } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line(), line({ unitPriceCents: 20000, taxRateBps: 0 })] }));
    expect(quoteId).toBeTruthy();
    const q = await runA(async (e) => (await e(`SELECT "subtotalCents","taxTotalCents","totalCents" FROM "quotes" WHERE "id"=$1`, [quoteId]))[0]);
    expect(Number(q.subtotalCents)).toBe(totals.subtotalCents);
    expect(Number(q.totalCents)).toBe(totals.totalCents);
    // 50000@16% = 58000 ; 20000@0% = 20000 ; total 78000
    expect(Number(q.totalCents)).toBe(78000);
  });
  it("paciente de otra org → OrgRefError", async () => {
    await expect(runA((e) => createQuote(e, billingCtxA, { patientId: patB, lines: [line()] }))).rejects.toBeInstanceOf(OrgRefError);
  });
  it("snapshot: editar el ítem del plan luego NO cambia la línea", async () => {
    const { planId } = await runA((e) => createPlan(e, clinicianCtxA, { patientId: patA }));
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "RESTORATION", toothFdi: 16, surface: "OCCLUSAL" }));
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, treatmentPlanId: planId, lines: [line({ description: "Resina", treatmentPlanItemId: it.itemId })] }));
    // snapshot copiado desde el ítem
    let ln = await runA(async (e) => (await e(`SELECT "procedureType","toothFdi","surface" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]))[0]);
    expect(ln.procedureType).toBe("RESTORATION");
    expect(Number(ln.toothFdi)).toBe(16);
    // cambiar el ítem del plan
    await runA((e) => updateItem(e, clinicianCtxA, { itemId: it.itemId, procedureType: "CROWN" }));
    ln = await runA(async (e) => (await e(`SELECT "procedureType" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]))[0]);
    expect(ln.procedureType).toBe("RESTORATION"); // intacto
  });
  it("línea con ítem de plan de otro paciente → CoherenceError", async () => {
    const otherPat = await mkPatient(orgA);
    const { planId } = await runA((e) => createPlan(e, clinicianCtxA, { patientId: otherPat }));
    const it = await runA((e) => addItem(e, clinicianCtxA, { planId, procedureType: "EXAM" }));
    await expect(runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line({ treatmentPlanItemId: it.itemId })] }))).rejects.toBeInstanceOf(CoherenceError);
  });
});

describe("Inmutabilidad / transiciones", () => {
  it("fuera de DRAFT no se editan líneas (FrozenError)", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "PROPOSED"));
    await expect(runA((e) => addLine(e, billingCtxA, { quoteId, ...line() }))).rejects.toBeInstanceOf(FrozenError);
    const ln = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "quoteId"=$1 LIMIT 1`, [quoteId]))[0]);
    await expect(runA((e) => updateLine(e, billingCtxA, { lineId: ln.id, unitPriceCents: 1 }))).rejects.toBeInstanceOf(FrozenError);
    await expect(runA((e) => removeLine(e, billingCtxA, ln.id))).rejects.toBeInstanceOf(FrozenError);
  });
  it("transición inválida DRAFT→ACCEPTED; válida DRAFT→PROPOSED→ACCEPTED", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    await expect(runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "ACCEPTED"))).rejects.toBeInstanceOf(TransitionError);
    await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "PROPOSED"));
    await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "ACCEPTED"));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "quotes" WHERE "id"=$1`, [quoteId]))[0].status);
    expect(st).toBe("ACCEPTED");
  });
});

describe("Permisos / eventos / auditoría / RLS", () => {
  it("clinician y accountant NO crean (durable); front_desk y billing sí", async () => {
    for (const ctx of [clinicianCtxA, accountantCtxA]) {
      await expect(guardConfigOperation(runA, ctx, "quote.create", (e) => createQuote(e, ctx, { patientId: patA, lines: [line()] }))).rejects.toBeInstanceOf(PermissionDeniedError);
    }
    const f = await runA((e) => createQuote(e, frontCtxA, { patientId: patA, lines: [line()] }));
    expect(f.quoteId).toBeTruthy();
    const denied = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied' AND "actorUserId"=$1`, [clinicianCtxA.userId]))[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });
  it("accountant puede ver (quote.view)", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    const r = await runA((e) => getQuote(e, accountantCtxA, quoteId));
    expect(r.quote.id).toBe(quoteId);
  });
  it("eventos NO llevan montos", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line({ unitPriceCents: 999999 })] }));
    await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "PROPOSED"));
    const evs = await runA(async (e) => (await e(`SELECT payload FROM "events" WHERE type LIKE 'quote.%'`, [])));
    const blob = JSON.stringify(evs);
    expect(blob).not.toMatch(/999999|totalCents|subtotal/);
  });
  it("getQuote audita quote.viewed sin texto libre", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, notes: "nota-confidencial-quote", lines: [line({ description: "desc-secreta" })] }));
    await runA((e) => getQuote(e, billingCtxA, quoteId));
    const rows = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='quote.viewed' AND "entityId"=$1`, [quoteId])));
    const blob = JSON.stringify(rows);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(blob).not.toMatch(/confidencial|desc-secreta/);
  });
  it("org B no ve quotes/lines de A", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    for (const t of ["quotes", "quote_lines"]) {
      const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "${t}" WHERE "organizationId"=$1`, [orgA])).rows);
      expect(seen.length).toBe(0);
    }
    expect(quoteId).toBeTruthy();
  });
});

describe("Refuerzo RLS DELETE de quote_lines (0013)", () => {
  it("removeLine funciona en DRAFT y audita sin description/texto", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line({ description: "desc-secreta-del" })] }));
    const ln = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]))[0]);
    await runA((e) => removeLine(e, billingCtxA, ln.id));
    const left = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId])));
    expect(left.length).toBe(0);
    const aud = await runA(async (e) => (await e(`SELECT metadata FROM "audit_logs" WHERE action='quote.line_edited' AND "entityId"=$1`, [quoteId])));
    expect(JSON.stringify(aud)).not.toMatch(/desc-secreta-del/);
  });

  it("DELETE crudo (app_user) sobre línea de quote PROPOSED NO borra nada; la línea sigue", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    const ln = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]))[0]);
    await runA((e) => setQuoteStatus(e, billingCtxA, quoteId, "PROPOSED"));
    // intento de DELETE crudo, sin pasar por el dominio
    await runA((e) => e(`DELETE FROM "quote_lines" WHERE "id"=$1`, [ln.id]));
    const still = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "id"=$1`, [ln.id])));
    expect(still.length).toBe(1); // RLS impidió el borrado
  });

  it("DELETE crudo en DRAFT sí borra (la policy no rompe el caso permitido)", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));
    const ln = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "quoteId"=$1`, [quoteId]))[0]);
    await runA((e) => e(`DELETE FROM "quote_lines" WHERE "id"=$1`, [ln.id]));
    const left = await runA(async (e) => (await e(`SELECT "id" FROM "quote_lines" WHERE "id"=$1`, [ln.id])));
    expect(left.length).toBe(0);
  });

  it("SELECT/INSERT/UPDATE siguen funcionando igual (policies por comando)", async () => {
    const { quoteId } = await runA((e) => createQuote(e, billingCtxA, { patientId: patA, lines: [line()] }));   // INSERT
    const r = await runA((e) => getQuote(e, billingCtxA, quoteId));                                             // SELECT
    expect(r.lines.length).toBe(1);
    const ln = r.lines[0];
    await runA((e) => updateLine(e, billingCtxA, { lineId: ln.id, unitPriceCents: 12345 }));                    // UPDATE
    const after = await runA(async (e) => (await e(`SELECT "unitPriceCents" FROM "quote_lines" WHERE "id"=$1`, [ln.id]))[0]);
    expect(Number(after.unitPriceCents)).toBe(12345);
  });
});
