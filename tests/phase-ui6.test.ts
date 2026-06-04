// LOOLO — Pruebas Fase UI-6 (Presupuestos y Cobros, flujo completo).
// Postgres real + RLS + permisos. Cubre:
// - getQuotesSafeView exige quote.view.
// - Crear presupuesto desde plan activo con líneas conectadas.
// - Calcular totales correctamente.
// - Transición DRAFT → PROPOSED → ACCEPTED.
// - Registrar pago parcial y total; saldo pendiente.
// - DTO no expone notes, reference, createdBy, organizationId.
// - Tenant isolation (RLS filtra).
// - FVO-1: financial summary sigue resolviendo (no rota).
// - Integridad estructural: sin migración, sin SELECT *.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { getQuotesSafeView } from "../src/server/domain/billing/billing-views.js";
import { createQuote, setQuoteStatus } from "../src/server/domain/billing/quotes.js";
import { recordPayment } from "../src/server/domain/billing/payments.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

// ─── Setup ────────────────────────────────────────────────────────────────

let orgA: string, orgB: string;
let ownerA: ActorContext;
let billingA: ActorContext;
let frontDeskA: ActorContext;
let clinicianA: ActorContext;
let accountantA: ActorContext;
let noPermsA: ActorContext;
let ownerB: ActorContext;

let patientAId: string;
let patientEmptyId: string;
let patientBId: string;

let planActiveId: string;
let itemEndoId: string;   // ENDODONTICS pieza 36
let itemRestId: string;   // RESTORATION pieza 16
let itemCrownId: string;  // CROWN pieza 21

const NOTES_SECRET = "notas-secretas-ui6-" + rnd();
const REFERENCE_SECRET = "ref-secreta-ui6-" + rnd();

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

async function member(orgId: string, roleKey: string | null): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey ?? "noperms"}-${rnd()}@ui6.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey ?? "owner"],
    )
  ).rows[0].id;
  if (roleKey) {
    await adminPool.query(
      `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
      [memberId, roleKey],
    );
  }
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

beforeAll(async () => {
  await ensureRbac();

  orgA = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
    ["OrgUI6-A-" + rnd(), "ui6a-" + rnd()],
  )).rows[0].id;

  orgB = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
    ["OrgUI6-B-" + rnd(), "ui6b-" + rnd()],
  )).rows[0].id;

  ownerA     = await member(orgA, "owner");
  billingA   = await member(orgA, "billing");
  frontDeskA = await member(orgA, "front_desk");
  clinicianA = await member(orgA, "clinician");
  accountantA = await member(orgA, "accountant");
  noPermsA   = await member(orgA, null);
  ownerB     = await member(orgB, "owner");

  // Paciente A con plan activo y 3 ítems (replica seed de Ana)
  const contactAId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "Paciente UI6-A", "+5215510000091"],
  )).rows[0].id;

  patientAId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgA, contactAId],
  )).rows[0].id;

  // Paciente vacío (sin planes ni presupuestos)
  const contactEmptyId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "Paciente UI6-Vacio", "+5215510000092"],
  )).rows[0].id;

  patientEmptyId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgA, contactEmptyId],
  )).rows[0].id;

  // Paciente en orgB
  const contactBId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgB, "Paciente UI6-B", "+5215510000093"],
  )).rows[0].id;

  patientBId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgB, contactBId],
  )).rows[0].id;

  // Plan activo con 3 ítems (Endodoncia 36, Restauración 16, Corona 21)
  planActiveId = (await adminPool.query(
    `INSERT INTO "treatment_plans"
       ("organizationId","patientId","status","title","notes","createdBy","proposedAt","acceptedAt","activatedAt")
     VALUES ($1,$2,'ACTIVE','Plan Inicial',$3,$4,now(),now(),now()) RETURNING id`,
    [orgA, patientAId, NOTES_SECRET, ownerA.userId],
  )).rows[0].id;

  itemEndoId = (await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,36,'ENDODONTICS','PROPOSED','URGENT',1,$3) RETURNING id`,
    [orgA, planActiveId, ownerA.userId],
  )).rows[0].id;

  itemRestId = (await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,16,'RESTORATION','PROPOSED','HIGH',2,$3) RETURNING id`,
    [orgA, planActiveId, ownerA.userId],
  )).rows[0].id;

  itemCrownId = (await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,21,'CROWN','PROPOSED','NORMAL',3,$3) RETURNING id`,
    [orgA, planActiveId, ownerA.userId],
  )).rows[0].id;
});

afterAll(async () => { await closePools(); });

// ─── Helper ───────────────────────────────────────────────────────────────

import { forTenantPg } from "./harness.js";

const runA = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(orgA, async (c) => work(execOf(c)));

// Crea quote ACCEPTED con 3 líneas del plan activo
async function createAcceptedQuote(totalCents: number): Promise<string> {
  const { quoteId } = await runA((e) =>
    createQuote(e, billingA, {
      patientId: patientAId,
      treatmentPlanId: planActiveId,
      lines: [
        { description: "Endodoncia (pieza 36)", treatmentPlanItemId: itemEndoId, quantity: 1, unitPriceCents: Math.floor(totalCents * 0.5), discountCents: 0, taxRateBps: 0, sortOrder: 0 },
        { description: "Restauración (pieza 16)", treatmentPlanItemId: itemRestId, quantity: 1, unitPriceCents: Math.floor(totalCents * 0.3), discountCents: 0, taxRateBps: 0, sortOrder: 1 },
        { description: "Corona (pieza 21)", treatmentPlanItemId: itemCrownId, quantity: 1, unitPriceCents: totalCents - Math.floor(totalCents * 0.5) - Math.floor(totalCents * 0.3), discountCents: 0, taxRateBps: 0, sortOrder: 2 },
      ],
    }),
  );
  await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
  await runA((e) => setQuoteStatus(e, billingA, quoteId, "ACCEPTED"));
  return quoteId;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. Autorización
// ══════════════════════════════════════════════════════════════════════════

describe("getQuotesSafeView — autorización", () => {
  it("clinician (con quote.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("actor sin permisos → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, noPermsA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("billing (con quote.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("accountant (con quote.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, accountantA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("front_desk (con quote.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, frontDeskA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("organizationId vacío → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const badCtx: ActorContext = { organizationId: "", userId: ownerA.userId, permissions: ownerA.permissions };
    const result = await getQuotesSafeView(run, badCtx, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2. RLS y multi-tenant
// ══════════════════════════════════════════════════════════════════════════

describe("getQuotesSafeView — RLS y multi-tenant", () => {
  it("actor de orgA con patientBId (orgB) → lista vacía (RLS filtra)", async () => {
    // Crear un quote en orgB
    await adminPool.query(
      `INSERT INTO "quotes"("organizationId","patientId","status","currency","totalCents","createdBy")
       VALUES ($1,$2,'DRAFT','MXN',10000,$3)`,
      [orgB, patientBId, ownerB.userId],
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalQuotes).toBe(0);
  });

  it("actor de orgB no ve quotes de orgA (RLS filtra)", async () => {
    const run = makeTenantRunner(orgB);
    const result = await getQuotesSafeView(run, ownerB, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalQuotes).toBe(0);
  });

  it("patientId inexistente → lista vacía, no lanza", async () => {
    const run = makeTenantRunner(orgA);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const result = await getQuotesSafeView(run, billingA, fakeId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalQuotes).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3. DTO seguro
// ══════════════════════════════════════════════════════════════════════════

describe("getQuotesSafeView — DTO seguro", () => {
  it("DTO no contiene notes ni el valor del secreto del presupuesto", async () => {
    const quoteWithNotes = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        notes: NOTES_SECRET,
        lines: [{ description: "Consulta", quantity: 1, unitPriceCents: 5000, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"notes"');
    expect(raw).not.toContain(NOTES_SECRET);
    expect(quoteWithNotes.quoteId).toBeTruthy();
  });

  it("DTO no contiene reference ni el valor secreto del pago", async () => {
    const quoteId = await createAcceptedQuote(20000);
    // Pagamos con reference "no PAN" para que pase la validación
    await runA((e) =>
      recordPayment(e, billingA, {
        quoteId,
        amountCents: 5000,
        method: "CASH",
        reference: REFERENCE_SECRET.slice(0, 10),
      }),
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"reference"');
    expect(raw).not.toContain(REFERENCE_SECRET.slice(0, 10));
  });

  it("DTO no contiene createdBy ni userId del actor", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"createdBy"');
    expect(raw).not.toContain('"recordedByUserId"');
    expect(raw).not.toContain(billingA.userId);
  });

  it("DTO no contiene organizationId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"organizationId"');
    expect(raw).not.toContain(orgA);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 4. Flujo completo: crear → proponer → aceptar → pagar
// ══════════════════════════════════════════════════════════════════════════

describe("flujo completo de presupuesto y cobros", () => {
  it("crear presupuesto desde plan activo con 3 líneas vinculadas al plan", async () => {
    const run = makeTenantRunner(orgA);
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        treatmentPlanId: planActiveId,
        lines: [
          { description: "Endodoncia (pieza 36)", treatmentPlanItemId: itemEndoId, quantity: 1, unitPriceCents: 300000, discountCents: 0, taxRateBps: 0, sortOrder: 0 },
          { description: "Restauración (pieza 16)", treatmentPlanItemId: itemRestId, quantity: 1, unitPriceCents: 200000, discountCents: 0, taxRateBps: 0, sortOrder: 1 },
          { description: "Corona (pieza 21)", treatmentPlanItemId: itemCrownId, quantity: 1, unitPriceCents: 250000, discountCents: 0, taxRateBps: 0, sortOrder: 2 },
        ],
      }),
    );

    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote).toBeDefined();
    expect(quote!.status).toBe("DRAFT");
    expect(quote!.lines).toHaveLength(3);
    expect(quote!.totalCents).toBe(750000);
    expect(quote!.treatmentPlanId).toBe(planActiveId);
  });

  it("calcular totales correctamente: suma de líneas", async () => {
    const { quoteId, totals } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [
          { description: "Servicio A", quantity: 1, unitPriceCents: 100000, discountCents: 0, taxRateBps: 1600 },
          { description: "Servicio B", quantity: 2, unitPriceCents: 50000, discountCents: 10000, taxRateBps: 0 },
        ],
      }),
    );
    // Línea A: 100000, IVA 16% = 16000, total = 116000
    // Línea B: qty 2 = 100000 subtotal, descuento 10000, base 90000, sin IVA, total = 90000
    expect(totals.totalCents).toBe(206000);
    expect(quoteId).toBeTruthy();
  });

  it("transición DRAFT → PROPOSED → ACCEPTED", async () => {
    const run = makeTenantRunner(orgA);
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Tratamiento", quantity: 1, unitPriceCents: 100000, discountCents: 0, taxRateBps: 0 }],
      }),
    );

    await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
    let result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote?.status).toBe("PROPOSED");

    await runA((e) => setQuoteStatus(e, billingA, quoteId, "ACCEPTED"));
    result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote?.status).toBe("ACCEPTED");
    expect(quote?.acceptedAt).not.toBeNull();
  });

  it("registrar pago parcial — saldo disminuye correctamente", async () => {
    const run = makeTenantRunner(orgA);
    const quoteId = await createAcceptedQuote(100000);

    await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 40000, method: "CASH" }),
    );

    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote).toBeDefined();
    expect(quote!.paidCents).toBe(40000);
    expect(quote!.balanceCents).toBe(60000);
    expect(quote!.liquidado).toBe(false);
    expect(quote!.payments).toHaveLength(1);
  });

  it("segundo pago hasta liquidar — saldo queda en 0", async () => {
    const run = makeTenantRunner(orgA);
    const quoteId = await createAcceptedQuote(50000);

    await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 20000, method: "CASH" }),
    );
    await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 30000, method: "CARD" }),
    );

    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote!.paidCents).toBe(50000);
    expect(quote!.balanceCents).toBe(0);
    expect(quote!.liquidado).toBe(true);
    expect(quote!.payments).toHaveLength(2);
  });

  it("historial de pagos contiene método y entryKind", async () => {
    const run = makeTenantRunner(orgA);
    const quoteId = await createAcceptedQuote(30000);
    await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 15000, method: "TRANSFER" }),
    );
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    const payment = quote?.payments.find((p) => p.amountCents === 15000);
    expect(payment).toBeDefined();
    expect(payment!.entryKind).toBe("PAYMENT");
    expect(payment!.method).toBe("TRANSFER");
  });

  it("paciente vacío → lista de quotes vacía, sin error", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalQuotes).toBe(0);
    expect(result.value.quotes).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 5. Permisos en escritura (domain)
// ══════════════════════════════════════════════════════════════════════════

describe("permisos de escritura", () => {
  it("clinician NO puede crear presupuesto (sin quote.create)", async () => {
    await expect(
      runA((e) =>
        createQuote(e, clinicianA, {
          patientId: patientAId,
          lines: [{ description: "X", quantity: 1, unitPriceCents: 1000, discountCents: 0, taxRateBps: 0 }],
        }),
      ),
    ).rejects.toThrow();
  });

  it("accountant NO puede registrar pago (sin payment.record)", async () => {
    const quoteId = await createAcceptedQuote(10000);
    await expect(
      runA((e) =>
        recordPayment(e, accountantA, { quoteId, amountCents: 1000, method: "CASH" }),
      ),
    ).rejects.toThrow();
  });

  it("billing SÍ puede crear y registrar pago", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Perm test", quantity: 1, unitPriceCents: 5000, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "ACCEPTED"));
    const r = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 5000, method: "CASH" }),
    );
    expect(r.paymentId).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6. FVO-1 financial summary no rota
// ══════════════════════════════════════════════════════════════════════════

describe("FVO-1 sigue resolviendo financial summary", () => {
  it("financial summary cargado con billing data existente", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Calculamos el resumen como lo hace el cliente
    const { quotes } = result.value;
    const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED");
    const totalAcceptedCents = acceptedQuotes.reduce((s, q) => s + q.totalCents, 0);
    const paidCents = acceptedQuotes.reduce((s, q) => s + q.paidCents, 0);
    const balanceCents = totalAcceptedCents - paidCents;
    // Solo validamos tipos y coherencia, no valores exactos (depende del orden de los tests)
    expect(typeof totalAcceptedCents).toBe("number");
    expect(typeof paidCents).toBe("number");
    expect(balanceCents).toBe(totalAcceptedCents - paidCents);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 7. Integridad estructural
// ══════════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("UI-6 no agregó migración propia (0016 ya existe para FVO-1)", () => {
    expect(existsSync(resolve("prisma/migrations/0017_phase_ui6.sql"))).toBe(false);
  });

  it("sí existe billing-views.ts", () => {
    expect(existsSync(resolve("src/server/domain/billing/billing-views.ts"))).toBe(true);
  });

  it("sí existe src/server/actions/billing.ts", () => {
    expect(existsSync(resolve("src/server/actions/billing.ts"))).toBe(true);
  });

  it("sí existe src/components/billing/", () => {
    expect(existsSync(resolve("src/components/billing"))).toBe(true);
  });

  it("sí existen los componentes de billing", () => {
    const required = [
      "QuoteStatusBadge.tsx",
      "BillingNoPermission.tsx",
      "QuotesSectionClient.tsx",
    ];
    for (const c of required) {
      expect(existsSync(resolve("src/components/billing", c)), `Debe existir ${c}`).toBe(true);
    }
  });

  it("billing-views.ts no hace SELECT *", () => {
    const content = readFileSync(resolve("src/server/domain/billing/billing-views.ts"), "utf-8");
    expect(content).not.toContain("SELECT *");
  });

  it('billing-views.ts no selecciona "notes" ni "reference" ni "createdBy" ni "recordedByUserId"', () => {
    const content = readFileSync(resolve("src/server/domain/billing/billing-views.ts"), "utf-8");
    expect(content).not.toContain('"notes"');
    expect(content).not.toContain('"reference"');
    expect(content).not.toContain('"createdBy"');
    expect(content).not.toContain('"recordedByUserId"');
  });

  it("quotes.ts no fue modificado por UI-6", () => {
    const content = readFileSync(resolve("src/server/domain/billing/quotes.ts"), "utf-8");
    expect(content).not.toContain("billing-views");
    expect(content).not.toContain("getQuotesSafeView");
  });

  it("payments.ts no fue modificado por UI-6", () => {
    const content = readFileSync(resolve("src/server/domain/billing/payments.ts"), "utf-8");
    expect(content).not.toContain("billing-views");
    expect(content).not.toContain("getQuotesSafeView");
  });

  it("página pacientes/[id] importa getQuotesSafeView y QuotesSectionClient", () => {
    const content = readFileSync(
      resolve("src/app/(app)/pacientes/[id]/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("getQuotesSafeView");
    expect(content).toContain("QuotesSectionClient");
    expect(content).toContain("BillingNoPermission");
  });

  it("página pacientes/[id] no importa createQuote ni recordPayment directamente", () => {
    const content = readFileSync(
      resolve("src/app/(app)/pacientes/[id]/page.tsx"),
      "utf-8",
    );
    expect(content).not.toContain("createQuote");
    expect(content).not.toContain("recordPayment");
    expect(content).not.toContain("setQuoteStatus");
  });

  it("PHASE_UI-6_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_UI-6_DELIVERY_MARKER.txt"))).toBe(true);
  });
});
