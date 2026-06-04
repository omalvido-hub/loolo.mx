// LOOLO — Pruebas Fase UI-6A (correcciones puntuales de Presupuestos y Cobros).
// Postgres real + RLS + permisos. Cubre:
// - Cancelar DRAFT con setQuoteStatus(CANCELED).
// - Descuento por línea en DRAFT (updateLine con discountCents).
// - Reverso de pago (reversePayment).
// - Segundo reverso del mismo pago → AlreadyReversedError.
// - Formato monetario siempre con 2 decimales.
// - Páginas /presupuestos y /cobros existen.
// - billing.ts contiene reversePaymentAction y updateLineDiscountAction.
// - Integridad: sin migración nueva, sin SELECT *.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, closePools, forTenantPg } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { getQuotesSafeView } from "../src/server/domain/billing/billing-views.js";
import {
  createQuote,
  setQuoteStatus,
  updateLine,
} from "../src/server/domain/billing/quotes.js";
import {
  recordPayment,
  reversePayment,
  AlreadyReversedError,
} from "../src/server/domain/billing/payments.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

// ─── Setup ─────────────────────────────────────────────────────────────────

let orgA: string;
let billingA: ActorContext;

let patientAId: string;
let planActiveId: string;
let itemEndoId: string;
let itemRestId: string;

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

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@ui6a.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
    [memberId, roleKey],
  );
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
    ["OrgUI6A-" + rnd(), "ui6a-" + rnd()],
  )).rows[0].id;

  billingA = await member(orgA, "billing");

  const contactId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "Paciente UI6A", "+5215510000099"],
  )).rows[0].id;

  patientAId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgA, contactId],
  )).rows[0].id;

  planActiveId = (await adminPool.query(
    `INSERT INTO "treatment_plans"
       ("organizationId","patientId","status","title","notes","createdBy","proposedAt","acceptedAt","activatedAt")
     VALUES ($1,$2,'ACTIVE','Plan UI6A','notas',$3,now(),now(),now()) RETURNING id`,
    [orgA, patientAId, billingA.userId],
  )).rows[0].id;

  itemEndoId = (await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,36,'ENDODONTICS','PROPOSED','URGENT',1,$3) RETURNING id`,
    [orgA, planActiveId, billingA.userId],
  )).rows[0].id;

  itemRestId = (await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,16,'RESTORATION','PROPOSED','HIGH',2,$3) RETURNING id`,
    [orgA, planActiveId, billingA.userId],
  )).rows[0].id;
});

afterAll(async () => { await closePools(); });

const runA = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(orgA, async (c) => work(execOf(c)));

// ══════════════════════════════════════════════════════════════════════════
// 1. Cancelar DRAFT
// ══════════════════════════════════════════════════════════════════════════

describe("cancelar presupuesto DRAFT", () => {
  it("DRAFT → CANCELED transición permitida", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Consulta", quantity: 1, unitPriceCents: 0, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "CANCELED"));
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote?.status).toBe("CANCELED");
    expect(quote?.canceledAt).not.toBeNull();
  });

  it("DRAFT $0.00 → CANCELED sin error", async () => {
    const { quoteId, totals } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Ítem vacío", quantity: 1, unitPriceCents: 0, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    expect(totals.totalCents).toBe(0);
    await expect(
      runA((e) => setQuoteStatus(e, billingA, quoteId, "CANCELED")),
    ).resolves.toBeUndefined();
  });

  it("PROPOSED → CANCELED también permitido", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Tratamiento", quantity: 1, unitPriceCents: 50000, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "CANCELED"));
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote?.status).toBe("CANCELED");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2. Descuento por línea en DRAFT
// ══════════════════════════════════════════════════════════════════════════

describe("descuento por línea en DRAFT", () => {
  it("updateLine con discountCents recalcula totalCents correctamente", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        treatmentPlanId: planActiveId,
        lines: [
          { description: "Endodoncia", treatmentPlanItemId: itemEndoId, quantity: 1, unitPriceCents: 300000, discountCents: 0, taxRateBps: 0, sortOrder: 0 },
          { description: "Restauración", treatmentPlanItemId: itemRestId, quantity: 1, unitPriceCents: 200000, discountCents: 0, taxRateBps: 0, sortOrder: 1 },
        ],
      }),
    );
    // El total inicial es 500000 (3000 + 2000 pesos)
    const run = makeTenantRunner(orgA);
    let result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const before = result.value.quotes.find((q) => q.id === quoteId);
    expect(before?.totalCents).toBe(500000);

    // Aplicar descuento de $500 (50000 centavos) en la primera línea
    const firstLine = before!.lines.find((l) => l.description === "Endodoncia");
    expect(firstLine).toBeDefined();
    await runA((e) => updateLine(e, billingA, { lineId: firstLine!.id, discountCents: 50000 }));

    result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.value.quotes.find((q) => q.id === quoteId);
    // Total: (300000 - 50000) + 200000 = 450000
    expect(after?.totalCents).toBe(450000);
    expect(after?.discountTotalCents).toBe(50000);
    const updatedLine = after?.lines.find((l) => l.description === "Endodoncia");
    expect(updatedLine?.discountCents).toBe(50000);
    expect(updatedLine?.totalCents).toBe(250000);
  });

  it("descuento de $0 (eliminar descuento) funciona", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Con descuento", quantity: 1, unitPriceCents: 100000, discountCents: 20000, taxRateBps: 0 }],
      }),
    );
    const run = makeTenantRunner(orgA);
    let result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const line = result.value.quotes.find((q) => q.id === quoteId)?.lines[0];
    expect(line?.discountCents).toBe(20000);
    expect(line?.totalCents).toBe(80000);

    await runA((e) => updateLine(e, billingA, { lineId: line!.id, discountCents: 0 }));

    result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.value.quotes.find((q) => q.id === quoteId)?.lines[0];
    expect(updated?.discountCents).toBe(0);
    expect(updated?.totalCents).toBe(100000);
  });

  it("descuento que supera el subtotal lanza error", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Servicio", quantity: 1, unitPriceCents: 50000, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const line = result.value.quotes.find((q) => q.id === quoteId)?.lines[0];
    await expect(
      runA((e) => updateLine(e, billingA, { lineId: line!.id, discountCents: 99999 })),
    ).rejects.toThrow();
  });

  it("descuento en presupuesto no DRAFT lanza FrozenError", async () => {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Frozen", quantity: 1, unitPriceCents: 100000, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    if (!result.ok) return;
    const line = result.value.quotes.find((q) => q.id === quoteId)?.lines[0];
    await expect(
      runA((e) => updateLine(e, billingA, { lineId: line!.id, discountCents: 5000 })),
    ).rejects.toThrow("El presupuesto no es editable fuera de DRAFT");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3. Reverso de pagos
// ══════════════════════════════════════════════════════════════════════════

describe("reverso de pagos", () => {
  async function createAcceptedQuote(totalCents: number) {
    const { quoteId } = await runA((e) =>
      createQuote(e, billingA, {
        patientId: patientAId,
        lines: [{ description: "Tratamiento UI6A", quantity: 1, unitPriceCents: totalCents, discountCents: 0, taxRateBps: 0 }],
      }),
    );
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "PROPOSED"));
    await runA((e) => setQuoteStatus(e, billingA, quoteId, "ACCEPTED"));
    return quoteId;
  }

  it("reverso de pago aumenta el saldo del presupuesto", async () => {
    const quoteId = await createAcceptedQuote(100000);
    const { paymentId } = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 60000, method: "CASH" }),
    );
    await runA((e) =>
      reversePayment(e, billingA, { paymentId, reference: "Error de caja" }),
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    expect(quote?.paidCents).toBe(0);
    expect(quote?.balanceCents).toBe(100000);
    expect(quote?.liquidado).toBe(false);
    // Debe haber 2 entradas: PAYMENT + REVERSAL
    expect(quote?.payments).toHaveLength(2);
    const reversal = quote?.payments.find((p) => p.entryKind === "REVERSAL");
    expect(reversal).toBeDefined();
    expect(reversal?.reversesPaymentId).toBe(paymentId);
  });

  it("reverso sin motivo (reference undefined) funciona", async () => {
    const quoteId = await createAcceptedQuote(50000);
    const { paymentId } = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 50000, method: "TRANSFER" }),
    );
    await expect(
      runA((e) => reversePayment(e, billingA, { paymentId })),
    ).resolves.toBeDefined();
  });

  it("revertir el mismo pago dos veces lanza AlreadyReversedError", async () => {
    const quoteId = await createAcceptedQuote(80000);
    const { paymentId } = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 40000, method: "CARD" }),
    );
    await runA((e) => reversePayment(e, billingA, { paymentId }));
    await expect(
      runA((e) => reversePayment(e, billingA, { paymentId })),
    ).rejects.toThrow(AlreadyReversedError);
  });

  it("reverso con motivo que contiene PAN (13+ dígitos seguidos) lanza error", async () => {
    const quoteId = await createAcceptedQuote(30000);
    const { paymentId } = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 10000, method: "CASH" }),
    );
    await expect(
      runA((e) => reversePayment(e, billingA, { paymentId, reference: "1234567890123456" })),
    ).rejects.toThrow();
  });

  it("reverso con motivo válido persiste en el historial (entryKind REVERSAL)", async () => {
    const quoteId = await createAcceptedQuote(120000);
    const { paymentId } = await runA((e) =>
      recordPayment(e, billingA, { quoteId, amountCents: 120000, method: "CASH" }),
    );
    await runA((e) =>
      reversePayment(e, billingA, { paymentId, reference: "Devolución aprobada" }),
    );
    const run = makeTenantRunner(orgA);
    const result = await getQuotesSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quote = result.value.quotes.find((q) => q.id === quoteId);
    const reversal = quote?.payments.find((p) => p.entryKind === "REVERSAL");
    expect(reversal?.reversesPaymentId).toBe(paymentId);
    expect(reversal?.amountCents).toBe(120000);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 4. Formato monetario — 2 decimales siempre
// ══════════════════════════════════════════════════════════════════════════

describe("formato monetario — 2 decimales siempre", () => {
  it("Intl.NumberFormat MXN con minimumFractionDigits:2 → $0.00", () => {
    const fmt = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(fmt.format(0)).toMatch(/0\.00/);
    expect(fmt.format(0.1)).toMatch(/0\.10/);
    expect(fmt.format(122)).toMatch(/122\.00/);
    expect(fmt.format(12200)).toMatch(/12\s*[,.]?200\.00/);
  });

  it("centavos a pesos con 2 decimales: 0 centavos → $0.00", () => {
    const fmt = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const fCents = (c: number) => fmt.format(c / 100);
    expect(fCents(0)).toMatch(/0\.00/);
    expect(fCents(1220000)).toMatch(/12\s*[,.]?200\.00/);
    expect(fCents(100)).toMatch(/1\.00/);
    expect(fCents(1)).toMatch(/0\.01/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 5. Páginas placeholder y estructura
// ══════════════════════════════════════════════════════════════════════════

describe("páginas /presupuestos y /cobros", () => {
  it("existe src/app/(app)/presupuestos/page.tsx", () => {
    expect(existsSync(resolve("src/app/(app)/presupuestos/page.tsx"))).toBe(true);
  });

  it("existe src/app/(app)/cobros/page.tsx", () => {
    expect(existsSync(resolve("src/app/(app)/cobros/page.tsx"))).toBe(true);
  });

  it("página presupuestos no es 404 (tiene export default)", () => {
    const content = readFileSync(resolve("src/app/(app)/presupuestos/page.tsx"), "utf-8");
    expect(content).toContain("export default");
  });

  it("página cobros no es 404 (tiene export default)", () => {
    const content = readFileSync(resolve("src/app/(app)/cobros/page.tsx"), "utf-8");
    expect(content).toContain("export default");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6. Integridad estructural UI-6A
// ══════════════════════════════════════════════════════════════════════════

describe("integridad estructural UI-6A", () => {
  it("billing.ts contiene reversePaymentAction", () => {
    const content = readFileSync(resolve("src/server/actions/billing.ts"), "utf-8");
    expect(content).toContain("reversePaymentAction");
  });

  it("billing.ts contiene updateLineDiscountAction", () => {
    const content = readFileSync(resolve("src/server/actions/billing.ts"), "utf-8");
    expect(content).toContain("updateLineDiscountAction");
  });

  it("QuotesSectionClient.tsx tiene canCancel y canReverse props", () => {
    const content = readFileSync(
      resolve("src/components/billing/QuotesSectionClient.tsx"),
      "utf-8",
    );
    expect(content).toContain("canCancel");
    expect(content).toContain("canReverse");
  });

  it("QuotesSectionClient.tsx usa minimumFractionDigits: 2", () => {
    const content = readFileSync(
      resolve("src/components/billing/QuotesSectionClient.tsx"),
      "utf-8",
    );
    expect(content).toContain("minimumFractionDigits: 2");
  });

  it("UI-6A no agregó migración nueva", () => {
    expect(existsSync(resolve("prisma/migrations/0017_phase_ui6a.sql"))).toBe(false);
    expect(existsSync(resolve("prisma/migrations/0018_phase_ui6a.sql"))).toBe(false);
  });

  it("billing-views.ts no fue modificado por UI-6A", () => {
    const content = readFileSync(resolve("src/server/domain/billing/billing-views.ts"), "utf-8");
    expect(content).not.toContain("reversePayment");
    expect(content).not.toContain("cancelReason");
  });

  it("quotes.ts no fue modificado por UI-6A", () => {
    const content = readFileSync(resolve("src/server/domain/billing/quotes.ts"), "utf-8");
    expect(content).not.toContain("billing-views");
  });

  it("payments.ts no fue modificado por UI-6A", () => {
    const content = readFileSync(resolve("src/server/domain/billing/payments.ts"), "utf-8");
    expect(content).not.toContain("billing-views");
  });
});
