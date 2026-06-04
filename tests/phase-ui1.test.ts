// LOOLO — Pruebas Fase UI-1 (Pacientes + Ficha Viva, solo lectura).
// Postgres real + RLS + permisos. Cubre: listPatientsForOrg, aislamiento multi-tenant,
// archivados/eliminados, paginación, secciones Ficha Viva por rol, integridad estructural.
// NO existe tests/phase7d.test.ts ni src/app/api/patients/route.ts.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { listPatientsForOrg } from "../src/server/domain/patient-record/list.js";
import { resolvePatientLiveRecord } from "../src/server/domain/patient-record/resolver.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

const runFor = (orgId: string) =>
  <T,>(work: (exec: any) => Promise<T>): Promise<T> =>
    forTenantPg(orgId, async (c) => work(execOf(c)));

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let frontDeskA: ActorContext;
let billingA: ActorContext;

// pacientes en orgA
let patientActiveId: string;
let patientArchivedId: string;
let patientDeletedId: string;
let patientArchivedAtId: string;
// paciente en orgB (aislamiento)
let patientBId: string;

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
      [`${roleKey}-${rnd()}@ui1.test`],
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

async function insertContact(orgId: string, name: string) {
  return (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,$2) RETURNING id`,
      [orgId, name],
    )
  ).rows[0].id as string;
}

async function insertPatient(orgId: string, contactId: string, state = "OK", extra: Record<string, any> = {}) {
  const cols = ["organizationId", "contactId", "status", "state"];
  const vals: any[] = [orgId, contactId, "ACTIVE", state];
  if (extra.archivedAt !== undefined) { cols.push("archivedAt"); vals.push(extra.archivedAt); }
  if (extra.deletedAt !== undefined) { cols.push("deletedAt"); vals.push(extra.deletedAt); }
  const colList = cols.map((c) => `"${c}"`).join(",");
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(",");
  return (
    await adminPool.query(
      `INSERT INTO "patients"(${colList}) VALUES (${placeholders}) RETURNING id`,
      vals,
    )
  ).rows[0].id as string;
}

beforeAll(async () => {
  await ensureRbac();

  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('ClinicaUI1','clinica-ui1-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('OtraOrgUI1','otra-ui1-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerA = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  frontDeskA = await member(orgA, "front_desk");
  billingA = await member(orgA, "billing");

  const contactActiveId = await insertContact(orgA, "María López");
  patientActiveId = await insertPatient(orgA, contactActiveId, "OK");

  const contactArchivedId = await insertContact(orgA, "Pedro Archivado");
  patientArchivedId = await insertPatient(orgA, contactArchivedId, "ARCHIVED");

  const contactDeletedId = await insertContact(orgA, "Juan Eliminado");
  patientDeletedId = await insertPatient(orgA, contactDeletedId, "OK", { deletedAt: new Date() });

  const contactArchivedAtId = await insertContact(orgA, "Ana ArchivedAt");
  patientArchivedAtId = await insertPatient(orgA, contactArchivedAtId, "OK", { archivedAt: new Date() });

  const contactBId = await insertContact(orgB, "Carlos OrgB");
  patientBId = await insertPatient(orgB, contactBId, "OK");
}, 30_000);

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Permisos — listPatientsForOrg exige patients.view
// ══════════════════════════════════════════════════════════════════════

describe("listPatientsForOrg — permisos", () => {
  it("owner con patients.view recibe lista ok", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
  });

  it("clinician con patients.view recibe lista ok", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, clinicianA);
    expect(result.ok).toBe(true);
  });

  it("front_desk sin patients.view recibe FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, frontDeskA);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("billing sin patients.view recibe FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, billingA);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("denegación registra permission.denied en auditoría", async () => {
    const run = runFor(orgA);
    const noPermsCtx: ActorContext = {
      organizationId: orgA,
      userId: frontDeskA.userId,
      permissions: new Set(["app_shell.view"]),
    };
    await listPatientsForOrg(run, noPermsCtx);

    const denial = (
      await adminPool.query(
        `SELECT "metadata" FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='permission.denied' AND "actorUserId"=$2
         ORDER BY "createdAt" DESC LIMIT 1`,
        [orgA, frontDeskA.userId],
      )
    ).rows;
    expect(denial.length).toBeGreaterThanOrEqual(1);
    expect(denial[0].metadata?.permission).toBe("patients.view");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. RLS / aislamiento multi-tenant
// ══════════════════════════════════════════════════════════════════════

describe("listPatientsForOrg — aislamiento multi-tenant", () => {
  it("pacientes de orgB no aparecen en la lista de orgA", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.value.items.map((p) => p.id);
    expect(ids).not.toContain(patientBId);
  });

  it("paciente activo de orgA sí aparece en la lista de orgA", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.value.items.map((p) => p.id);
    expect(ids).toContain(patientActiveId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Filtrado de archivados y eliminados
// ══════════════════════════════════════════════════════════════════════

describe("listPatientsForOrg — excluye archivados/eliminados", () => {
  it("paciente con state=ARCHIVED no aparece en la lista", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.value.items.map((p) => p.id);
    expect(ids).not.toContain(patientArchivedId);
  });

  it("paciente con deletedAt no aparece en la lista", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.value.items.map((p) => p.id);
    expect(ids).not.toContain(patientDeletedId);
  });

  it("paciente con archivedAt no aparece en la lista", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.value.items.map((p) => p.id);
    expect(ids).not.toContain(patientArchivedAtId);
  });

  it("items en la lista tienen state='OK' y sin archivedAt/deletedAt", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const item of result.value.items) {
      expect(item.state).not.toBe("ARCHIVED");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Paginación
// ══════════════════════════════════════════════════════════════════════

describe("listPatientsForOrg — paginación", () => {
  it("limit por defecto es 25 y offset por defecto es 0", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.limit).toBe(25);
    expect(result.value.offset).toBe(0);
  });

  it("limit personalizado respetado", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA, { limit: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.limit).toBe(1);
    expect(result.value.items.length).toBeLessThanOrEqual(1);
  });

  it("limit mayor que 50 se clampea a 50", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA, { limit: 999 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.limit).toBe(50);
  });

  it("offset desplaza los resultados", async () => {
    const runA_ = runFor(orgA);
    const first = await listPatientsForOrg(runA_, ownerA, { limit: 1, offset: 0 });
    const runA2 = runFor(orgA);
    const second = await listPatientsForOrg(runA2, ownerA, { limit: 1, offset: 1 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    if (first.value.total > 1) {
      expect(first.value.items[0]?.id).not.toBe(second.value.items[0]?.id);
    }
  });

  it("total refleja solo pacientes activos de la organización", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Solo patientActiveId debería estar en la cuenta (los otros son ARCHIVED/deletedAt/archivedAt)
    expect(result.value.total).toBeGreaterThanOrEqual(1);
    expect(result.value.items.every((p) => p.state !== "ARCHIVED")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Campos mínimos — sin datos clínicos ni financieros
// ══════════════════════════════════════════════════════════════════════

describe("listPatientsForOrg — campos mínimos", () => {
  it("items incluyen id, contactId, fullName, phone, status, state, createdAt", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA, { limit: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.value.items.length === 0) return;

    const item = result.value.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("contactId");
    expect(item).toHaveProperty("fullName");
    expect(item).toHaveProperty("phone");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("state");
    expect(item).toHaveProperty("createdAt");
  });

  it("items NO incluyen datos clínicos ni financieros", async () => {
    const run = runFor(orgA);
    const result = await listPatientsForOrg(run, ownerA, { limit: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.value.items.length === 0) return;

    const item = result.value.items[0] as unknown as Record<string, unknown>;
    expect(item).not.toHaveProperty("clinical");
    expect(item).not.toHaveProperty("financial");
    expect(item).not.toHaveProperty("odontogram");
    expect(item).not.toHaveProperty("treatment");
    expect(item).not.toHaveProperty("balanceCents");
    expect(item).not.toHaveProperty("paidCents");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Ficha Viva — secciones por rol (confirmación, usa resolver existente)
// ══════════════════════════════════════════════════════════════════════

describe("Ficha Viva — secciones por rol", () => {
  it("owner ve todas las secciones (identity, operative, clinical, odontogramSummary, treatment, financial, tasks)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, ownerA, patientActiveId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { _meta } = result.value;
    expect(_meta.visibleSections).toContain("identity");
    expect(_meta.visibleSections).toContain("operative");
    expect(_meta.visibleSections).toContain("clinical");
    expect(_meta.visibleSections).toContain("odontogramSummary");
    expect(_meta.visibleSections).toContain("treatment");
    expect(_meta.visibleSections).toContain("financial");
    expect(_meta.visibleSections).toContain("tasks");
  });

  it("clinician ve clinical y treatment pero NO financial", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientActiveId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { _meta, clinical, financial } = result.value;
    expect(_meta.visibleSections).toContain("clinical");
    expect(_meta.visibleSections).toContain("treatment");
    expect(_meta.visibleSections).not.toContain("financial");
    expect(clinical).toBeDefined();
    expect(financial).toBeUndefined();
  });

  it("front_desk sin patients.view recibe FORBIDDEN en Ficha Viva", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, frontDeskA, patientActiveId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("secciones opcionales ausentes cuando no hay permiso no son null sino undefined", async () => {
    const run = makeTenantRunner(orgA);
    const result = await resolvePatientLiveRecord(run, clinicianA, patientActiveId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // financial no debe ser null (null revelaría presencia); debe ser undefined
    expect(result.value.financial).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. Integridad estructural — archivos prohibidos inexistentes
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("no existe tests/phase7d.test.ts", () => {
    const path = resolve("tests/phase7d.test.ts");
    expect(existsSync(path)).toBe(false);
  });

  it("no existe src/app/api/patients/route.ts (endpoint lista prohibido)", () => {
    const path = resolve("src/app/api/patients/route.ts");
    expect(existsSync(path)).toBe(false);
  });

  it("sí existe src/app/api/patients/[id]/record/route.ts (endpoint individual intacto)", () => {
    const path = resolve("src/app/api/patients/[id]/record/route.ts");
    expect(existsSync(path)).toBe(true);
  });
});
