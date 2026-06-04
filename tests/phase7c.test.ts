// LOOLO — Pruebas Fase 7C-A (capa segura dominio → request).
// Cubre: getActorContext, makeTenantRunner, integración end-to-end, mapRecordResult.
// NO requiere servidor Next. Usa Postgres real + RLS.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";

import { getActorContext } from "../src/server/auth/context.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import { resolvePatientLiveRecord } from "../src/server/domain/patient-record/resolver.js";
import { mapRecordResult } from "../src/server/domain/patient-record/response.js";
import { ok, fail } from "../src/server/domain/shared/status.js";
import { can } from "../src/server/domain/identity/permissions.js";
import { adminDb } from "../src/server/db/admin.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let ownerCtx: ActorContext;
let clinicianCtx: ActorContext;
let patientAId: string;
let contactAId: string;
let ownerUserId: string;
let clinicianUserId: string;

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
      [`${roleKey}-${rnd()}@7c.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role")
       VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId")
     SELECT $1, id FROM "roles" WHERE "key"=$2`,
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

  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('Clinica7C','clinica7c-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('OtraOrg7C','otra7c-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerCtx = await member(orgA, "owner");
  clinicianCtx = await member(orgA, "clinician");
  ownerUserId = ownerCtx.userId;
  clinicianUserId = clinicianCtx.userId;

  // Semilla: contacto + paciente mínimo en orgA
  contactAId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone")
       VALUES ($1,'Prueba 7C','+5255000001') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  patientAId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactAId],
    )
  ).rows[0].id;

  // Presupuesto ACCEPTED + pago para probar sección financial
  const qId = (
    await adminPool.query(
      `INSERT INTO "quotes"
         ("organizationId","patientId","status","currency","totalCents",
          "subtotalCents","discountTotalCents","taxTotalCents","createdBy","acceptedAt")
       VALUES ($1,$2,'ACCEPTED','MXN',200000,200000,0,0,$3,now()) RETURNING id`,
      [orgA, patientAId, ownerUserId],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "payments"
       ("organizationId","quoteId","patientId","entryKind","amountCents","method","status","recordedByUserId")
     VALUES ($1,$2,$3,'PAYMENT',100000,'CASH','CONFIRMED',$4)`,
    [orgA, qId, patientAId, ownerUserId],
  );
});

afterAll(async () => {
  await adminDb.$disconnect();
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. getActorContext
// ══════════════════════════════════════════════════════════════════════

describe("getActorContext", () => {
  it("owner → devuelve ActorContext con patients.view y todos sus permisos", async () => {
    const ctx = await getActorContext(ownerUserId, orgA);
    expect(ctx.organizationId).toBe(orgA);
    expect(ctx.userId).toBe(ownerUserId);
    expect(can(ctx.permissions, "patients.view")).toBe(true);
    expect(can(ctx.permissions, "clinical.view")).toBe(true);
    expect(can(ctx.permissions, "payment.view")).toBe(true);
    expect(can(ctx.permissions, "odontogram.view")).toBe(true);
  });

  it("clinician → tiene patients.view y clinical.view, pero NO payment.view", async () => {
    const ctx = await getActorContext(clinicianUserId, orgA);
    expect(can(ctx.permissions, "patients.view")).toBe(true);
    expect(can(ctx.permissions, "clinical.view")).toBe(true);
    expect(can(ctx.permissions, "payment.view")).toBe(false);
  });

  it("usuario sin membresía en la org → permisos vacíos (fail-closed)", async () => {
    const noMemberUserId = (
      await adminPool.query(
        `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
        [`nomember-${rnd()}@7c.test`],
      )
    ).rows[0].id;
    const ctx = await getActorContext(noMemberUserId, orgA);
    expect(can(ctx.permissions, "patients.view")).toBe(false);
    expect(can(ctx.permissions, "app_shell.view")).toBe(false);
  });

  it("mismo userId en org distinta → permisos vacíos (no es miembro de orgB)", async () => {
    const ctx = await getActorContext(ownerUserId, orgB);
    expect(can(ctx.permissions, "patients.view")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. makeTenantRunner
// ══════════════════════════════════════════════════════════════════════

describe("makeTenantRunner", () => {
  it("ejecuta query tenant-scoped y devuelve el paciente de la org correcta", async () => {
    const run = makeTenantRunner(orgA);
    const rows = await run((exec) =>
      exec(`SELECT "id" FROM "patients" WHERE "id"=$1`, [patientAId]),
    );
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(patientAId);
  });

  it("RLS: mismo patientId con runner de orgB → vacío (paciente no pertenece a orgB)", async () => {
    const runB = makeTenantRunner(orgB);
    const rows = await runB((exec) =>
      exec(`SELECT "id" FROM "patients" WHERE "id"=$1`, [patientAId]),
    );
    expect(rows.length).toBe(0);
  });

  it("orgId vacío → lanza fail-closed", async () => {
    await expect(makeTenantRunner("")((exec) => exec("SELECT 1", []))).rejects.toThrow(
      "forTenant: orgId requerido",
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Integración context → runner → resolvePatientLiveRecord
// ══════════════════════════════════════════════════════════════════════

describe("integración getActorContext + makeTenantRunner + resolvePatientLiveRecord", () => {
  it("owner: resolve devuelve ok con secciones identity y operative", async () => {
    const ctx = await getActorContext(ownerUserId, orgA);
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ctx, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity.patientId).toBe(patientAId);
    expect(result.value._meta.visibleSections).toContain("identity");
    expect(result.value._meta.visibleSections).toContain("operative");
  });

  it("owner: sección financial presente (tiene quote.view + payment.view)", async () => {
    const ctx = await getActorContext(ownerUserId, orgA);
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ctx, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.financial).toBeDefined();
    expect(result.value.financial!.totalAcceptedCents).toBe(200000);
    expect(result.value.financial!.paidCents).toBe(100000);
    expect(result.value.financial!.balanceCents).toBe(100000);
  });

  it("clinician: sin sección financial (no tiene payment.view)", async () => {
    const ctx = await getActorContext(clinicianUserId, orgA);
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ctx, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.financial).toBeUndefined();
    expect(result.value._meta.visibleSections).not.toContain("financial");
  });

  it("paciente de otra organización → NOT_FOUND (RLS)", async () => {
    const contactBId = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'OtroOrg7C') RETURNING id`,
        [orgB],
      )
    ).rows[0].id;
    const patBId = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state")
         VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgB, contactBId],
      )
    ).rows[0].id;

    // ownerCtx de orgA intenta leer paciente de orgB
    const ctx = await getActorContext(ownerUserId, orgA);
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ctx, patBId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("usuario sin patients.view → FORBIDDEN + auditado", async () => {
    const noPermsCtx: ActorContext = {
      organizationId: orgA,
      userId: ownerUserId,
      permissions: new Set(["app_shell.view"]),
    };
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, noPermsCtx, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. mapRecordResult — función pura, sin DB
// ══════════════════════════════════════════════════════════════════════

describe("mapRecordResult (comportamiento HTTP)", () => {
  const fakeRecord = { identity: {}, _meta: { visibleSections: [] } } as any;

  it("ok → status 200 con el value", () => {
    const { status, body } = mapRecordResult(ok(fakeRecord));
    expect(status).toBe(200);
    expect(body).toBe(fakeRecord);
  });

  it("FORBIDDEN → status 403", () => {
    const { status, body } = mapRecordResult(fail("FORBIDDEN", "sin permiso"));
    expect(status).toBe(403);
    expect((body as any).error).toBeDefined();
  });

  it("NOT_FOUND → status 404", () => {
    const { status } = mapRecordResult(fail("NOT_FOUND"));
    expect(status).toBe(404);
  });

  it("ARCHIVED → status 404 (mismo que NOT_FOUND para el cliente)", () => {
    const { status } = mapRecordResult(fail("ARCHIVED"));
    expect(status).toBe(404);
  });

  it("INVALID → status 400 con detail", () => {
    const { status, body } = mapRecordResult(fail("INVALID", "uuid inválido"));
    expect(status).toBe(400);
    expect((body as any).error).toBe("uuid inválido");
  });
});
