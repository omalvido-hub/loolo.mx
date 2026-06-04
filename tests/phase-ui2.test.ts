// LOOLO — Pruebas Fase UI-2 (Agenda, solo lectura).
// Postgres real + RLS + permisos. Cubre: listAppointmentsByRange, listResources,
// aislamiento multi-tenant, rango acotado, RBAC fail-closed, integridad estructural.
// NO existe tests/phase7d.test.ts. NO existen endpoints REST de agenda.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { listAppointmentsByRange, listResources } from "../src/server/domain/agenda/queries.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

const runFor = (orgId: string) =>
  <T,>(work: (exec: any) => Promise<T>): Promise<T> =>
    forTenantPg(orgId, async (c) => work(execOf(c)));

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let noPermsA: ActorContext; // rol sin appointments.view ni resources.view

let contactAId: string;
let resourceAId: string;
let apptAId: string;

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
      [`${roleKey}-${rnd()}@ui2.test`],
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

  // Crear dos organizaciones para pruebas de aislamiento
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`, [`Clínica UI2-A ${rnd()}`, `ui2a-${rnd()}`])).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`, [`Clínica UI2-B ${rnd()}`, `ui2b-${rnd()}`])).rows[0].id;

  // Crear miembros en orgA
  ownerA = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  billingA = await member(orgA, "billing");

  // Rol sin appointments.view ni resources.view (soporte restringido)
  noPermsA = await member(orgA, "support_restricted");

  // Crear contacto en orgA (app_admin para evitar RLS en seed)
  contactAId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "Paciente UI2 Test", "+5215500000001"],
  )).rows[0].id;

  // Crear recurso en orgA
  resourceAId = (await adminPool.query(
    `INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "PROFESSIONAL", "Dr. Test UI2"],
  )).rows[0].id;

  // Crear cita en orgA (hoy + 1h, para que caiga en el rango por defecto)
  const now = new Date();
  const startAt = new Date(now);
  startAt.setHours(startAt.getHours() + 1, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  apptAId = (await adminPool.query(
    `INSERT INTO "appointments"("organizationId","contactId","professionalResourceId","startAt","endAt","status","source","createdBy")
     VALUES ($1,$2,$3,$4,$5,'SCHEDULED','MANUAL',$6) RETURNING id`,
    [orgA, contactAId, resourceAId, startAt.toISOString(), endAt.toISOString(), ownerA.userId],
  )).rows[0].id;

  // Crear cita en orgB (para prueba de aislamiento)
  const contactBId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgB, "Paciente OrgB", "+5215500000002"],
  )).rows[0].id;
  const resourceBId = (await adminPool.query(
    `INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,$2,$3) RETURNING id`,
    [orgB, "PROFESSIONAL", "Dr. OrgB"],
  )).rows[0].id;
  const ownerB = await member(orgB, "owner");
  await adminPool.query(
    `INSERT INTO "appointments"("organizationId","contactId","professionalResourceId","startAt","endAt","status","source","createdBy")
     VALUES ($1,$2,$3,$4,$5,'SCHEDULED','MANUAL',$6)`,
    [orgB, contactBId, resourceBId, startAt.toISOString(), endAt.toISOString(), ownerB.userId],
  );
}, 60_000);

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. listAppointmentsByRange — RBAC
// ══════════════════════════════════════════════════════════════════════

describe("listAppointmentsByRange — RBAC", () => {
  it("owner (appointments.view) puede listar citas", async () => {
    const run = runFor(orgA);
    const result = await listAppointmentsByRange(run, ownerA);
    expect(result.ok).toBe(true);
  });

  it("clinician (appointments.view) puede listar citas", async () => {
    const run = runFor(orgA);
    const result = await listAppointmentsByRange(run, clinicianA);
    expect(result.ok).toBe(true);
  });

  it("billing (appointments.view) puede listar citas", async () => {
    const run = runFor(orgA);
    const result = await listAppointmentsByRange(run, billingA);
    expect(result.ok).toBe(true);
  });

  it("support_restricted (sin appointments.view) recibe FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listAppointmentsByRange(run, noPermsA);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("fail-closed sin organizationId", async () => {
    const run = runFor(orgA);
    const badCtx: ActorContext = { ...ownerA, organizationId: "" };
    const result = await listAppointmentsByRange(run, badCtx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. listAppointmentsByRange — rango de fechas
// ══════════════════════════════════════════════════════════════════════

describe("listAppointmentsByRange — rango de fechas", () => {
  it("sin opts usa hoy como rango por defecto y devuelve resultado ok", async () => {
    const run = runFor(orgA);
    const result = await listAppointmentsByRange(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveProperty("from");
    expect(result.value).toHaveProperty("to");
    expect(result.value).toHaveProperty("items");
    expect(Array.isArray(result.value.items)).toBe(true);
  });

  it("from >= to devuelve INVALID", async () => {
    const run = runFor(orgA);
    const now = new Date();
    const result = await listAppointmentsByRange(run, ownerA, { from: now, to: now });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("INVALID");
  });

  it("rango se acota a MAX_RANGE_DAYS (31 días)", async () => {
    const run = runFor(orgA);
    const from = new Date();
    const toOriginal = new Date(from.getTime() + 100 * 24 * 60 * 60 * 1000);
    const result = await listAppointmentsByRange(run, ownerA, { from, to: toOriginal });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rangeDays =
      (new Date(result.value.to).getTime() - new Date(result.value.from).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(rangeDays).toBeLessThanOrEqual(31 + 0.01);
  });

  it("cita creada en orgA aparece para el owner con rango amplio", async () => {
    const run = runFor(orgA);
    const from = new Date(Date.now() - 60 * 60 * 1000); // -1h
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
    const result = await listAppointmentsByRange(run, ownerA, { from, to });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((a) => a.id);
    expect(ids).toContain(apptAId);
  });

  it("items tienen los campos mínimos esperados", async () => {
    const run = runFor(orgA);
    const from = new Date(Date.now() - 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await listAppointmentsByRange(run, ownerA, { from, to });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.value.items.find((a) => a.id === apptAId);
    expect(item).toBeDefined();
    if (!item) return;
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("startAt");
    expect(item).toHaveProperty("endAt");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("professionalResourceId");
    expect(item).toHaveProperty("displayName");
    expect(item).toHaveProperty("professionalName");
  });

  it("items NO incluyen datos clínicos ni financieros", async () => {
    const run = runFor(orgA);
    const from = new Date(Date.now() - 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await listAppointmentsByRange(run, ownerA, { from, to });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.value.items.find((a) => a.id === apptAId) as any;
    if (!item) return;
    expect(item).not.toHaveProperty("clinical");
    expect(item).not.toHaveProperty("financial");
    expect(item).not.toHaveProperty("odontogram");
    expect(item).not.toHaveProperty("balanceCents");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. listAppointmentsByRange — aislamiento multi-tenant (RLS)
// ══════════════════════════════════════════════════════════════════════

describe("listAppointmentsByRange — aislamiento multi-tenant (RLS)", () => {
  it("orgA solo ve sus propias citas (no las de orgB)", async () => {
    const run = runFor(orgA);
    const from = new Date(Date.now() - 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await listAppointmentsByRange(run, ownerA, { from, to });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Todas las citas deben ser de orgA (RLS lo garantiza)
    // No hay forma de obtener el organizationId desde el item,
    // pero sí podemos verificar que apptAId está presente y que el total es coherente.
    const ids = result.value.items.map((a) => a.id);
    expect(ids).toContain(apptAId);
    // Ninguna cita de orgB debería aparecer (nombres distintos)
    const names = result.value.items.map((a) => a.displayName);
    expect(names).not.toContain("Paciente OrgB");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. listResources — RBAC
// ══════════════════════════════════════════════════════════════════════

describe("listResources — RBAC", () => {
  it("owner (resources.view) puede listar recursos", async () => {
    const run = runFor(orgA);
    const result = await listResources(run, ownerA);
    expect(result.ok).toBe(true);
  });

  it("clinician (resources.view) puede listar recursos", async () => {
    const run = runFor(orgA);
    const result = await listResources(run, clinicianA);
    expect(result.ok).toBe(true);
  });

  it("support_restricted (sin resources.view) recibe FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listResources(run, noPermsA);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("fail-closed sin organizationId", async () => {
    const run = runFor(orgA);
    const badCtx: ActorContext = { ...ownerA, organizationId: "" };
    const result = await listResources(run, badCtx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("recursos de orgA son visibles y tienen campos mínimos", async () => {
    const run = runFor(orgA);
    const result = await listResources(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const res = result.value.items.find((r) => r.id === resourceAId);
    expect(res).toBeDefined();
    if (!res) return;
    expect(res).toHaveProperty("id");
    expect(res).toHaveProperty("name");
    expect(res).toHaveProperty("kind");
    expect(res).toHaveProperty("active");
    expect(res.name).toBe("Dr. Test UI2");
    expect(res.kind).toBe("PROFESSIONAL");
  });

  it("RLS: recursos de orgA no incluyen los de orgB", async () => {
    const run = runFor(orgA);
    const result = await listResources(run, ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.value.items.map((r) => r.name);
    expect(names).not.toContain("Dr. OrgB");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Integridad estructural — archivos prohibidos / no modificados
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("no existe tests/phase7d.test.ts", () => {
    expect(existsSync(resolve("tests/phase7d.test.ts"))).toBe(false);
  });

  it("no existe src/app/api/appointments/route.ts", () => {
    expect(existsSync(resolve("src/app/api/appointments/route.ts"))).toBe(false);
  });

  it("no existe src/app/api/agenda (directorio)", () => {
    expect(existsSync(resolve("src/app/api/agenda"))).toBe(false);
  });

  it("no existe src/app/api/resources (directorio)", () => {
    expect(existsSync(resolve("src/app/api/resources"))).toBe(false);
  });

  it("appointments.ts no importa funciones de queries.ts (sin acoplamiento inverso)", () => {
    const content = readFileSync(resolve("src/server/domain/agenda/appointments.ts"), "utf-8");
    expect(content).not.toContain("queries");
  });

  it("queries.ts no importa de appointments.ts ni resources.ts", () => {
    const content = readFileSync(resolve("src/server/domain/agenda/queries.ts"), "utf-8");
    // Solo verifica que no hay import de esos archivos; el texto "appointments" puede
    // aparecer en nombres de tipos/variables, lo cual es correcto.
    expect(content).not.toContain('from "./appointments');
    expect(content).not.toContain('from "./resources');
    expect(content).not.toContain('"./appointments"');
    expect(content).not.toContain('"./resources"');
  });

  it("queries.ts no invoca funciones de escritura de agenda", () => {
    const content = readFileSync(resolve("src/server/domain/agenda/queries.ts"), "utf-8");
    const forbidden = [
      "createAppointment",
      "createAppointmentFromConversation",
      "confirmAppointment",
      "rescheduleAppointment",
      "cancelAppointment",
      "markNoShow",
      "completeAppointment",
      "createResource",
      "createResourceWithLinkedUserCheck",
      "setAvailabilityRule",
      "blockSchedule",
    ];
    for (const fn of forbidden) {
      expect(content, `queries.ts no debe invocar ${fn}`).not.toContain(fn);
    }
  });

  it("página de agenda no tiene acciones de escritura", () => {
    const content = readFileSync(resolve("src/app/(app)/agenda/page.tsx"), "utf-8");
    const forbidden = [
      "createAppointment",
      "confirmAppointment",
      "rescheduleAppointment",
      "cancelAppointment",
      "markNoShow",
      "completeAppointment",
      "createResource",
    ];
    for (const fn of forbidden) {
      expect(content, `page.tsx no debe invocar ${fn}`).not.toContain(fn);
    }
  });

  it("no existe migración 0016", () => {
    expect(existsSync(resolve("prisma/migrations/0016_phase_ui2.sql"))).toBe(false);
    // Verifica que no hay ningún archivo 0016* en migrations
    const { readdirSync } = require("node:fs");
    const files: string[] = readdirSync(resolve("prisma/migrations"));
    const has0016 = files.some((f: string) => f.startsWith("0016"));
    expect(has0016).toBe(false);
  });

  it("sí existe src/server/domain/agenda/queries.ts (nuevo archivo de solo lectura)", () => {
    expect(existsSync(resolve("src/server/domain/agenda/queries.ts"))).toBe(true);
  });

  it("sí existe src/app/(app)/agenda/page.tsx", () => {
    expect(existsSync(resolve("src/app/(app)/agenda/page.tsx"))).toBe(true);
  });
});
