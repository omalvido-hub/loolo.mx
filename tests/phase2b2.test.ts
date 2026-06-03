// LOOLO — Pruebas Fase 2B-2 (dashboard/widgets/preferencias/resolver). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, forTenantPgAsUser, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { seedDashboardWidgets } from "../prisma/seed-dashboard.js";
import { enableOrganizationWidget, updateOrganizationWidgetConfig, updateUserPreference } from "../src/server/domain/dashboard/configure.js";
import { resolveNavigationAndWidgets } from "../src/server/domain/dashboard/resolver.js";
import { listEventTypes } from "../src/server/domain/events/schemas.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let ownerCtxA: ActorContext, frontCtxA: ActorContext;
let userX: string, userY: string;

async function ensureRbac() {
  for (const p of PERMISSIONS) await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  for (const r of ROLES) {
    const id = (await adminPool.query(`INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`, [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    for (const pk of r.permissions) await adminPool.query(`INSERT INTO "role_permissions"("roleId","permissionId") SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`, [id, pk]);
  }
}
async function memberWithRole(orgId: string, roleKey: string) {
  const userId = (await adminPool.query(`INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`, [`${roleKey}-${rnd()}@t.test`])).rows[0].id;
  const memberId = (await adminPool.query(`INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`, [orgId, userId, roleKey])).rows[0].id;
  await adminPool.query(`INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`, [memberId, roleKey]);
  return { userId, memberId };
}
async function resolvePerms(memberId: string): Promise<Set<string>> {
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId"
      WHERE mr."memberId"=$1`, [memberId]);
  return new Set(rows.map((r) => r.key));
}

beforeAll(async () => {
  await ensureRbac();
  await seedDashboardWidgets();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  const o = await memberWithRole(orgA, "owner");
  const f = await memberWithRole(orgA, "front_desk");
  const y = await memberWithRole(orgA, "front_desk");
  userX = f.userId; userY = y.userId;
  ownerCtxA = { organizationId: orgA, userId: o.userId, permissions: await resolvePerms(o.memberId) };
  frontCtxA = { organizationId: orgA, userId: f.userId, permissions: await resolvePerms(f.memberId) };
});
afterAll(async () => { await closePools(); });

describe("RLS widgets y preferencias", () => {
  it("RLS: org B no ve organization_dashboard_widgets de A", async () => {
    await forTenantPg(orgA, async (c) => enableOrganizationWidget(execOf(c), ownerCtxA, "pending_followups_placeholder"));
    const seen = await forTenantPg(orgB, async (c) =>
      (await c.query(`SELECT id FROM "organization_dashboard_widgets" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(seen.length).toBe(0);
  });

  it("user_preferences: sin app.current_user_id falla cerrado (0 filas)", async () => {
    await forTenantPgAsUser(orgA, userX, async (c) =>
      updateUserPreference(execOf(c), { ...frontCtxA, userId: userX }, "ui.density", { value: "compact" }));
    // Leer con SOLO tenant GUC (sin user GUC) → fail-closed
    const rows = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT id FROM "user_preferences"`)).rows);
    expect(rows.length).toBe(0);
  });

  it("user X no ve las preferencias de user Y (mismo org)", async () => {
    await forTenantPgAsUser(orgA, userY, async (c) =>
      updateUserPreference(execOf(c), { organizationId: orgA, userId: userY, permissions: frontCtxA.permissions }, "dock.collapsed", { value: true }));
    const xSees = await forTenantPgAsUser(orgA, userX, async (c) =>
      (await c.query(`SELECT "userId" FROM "user_preferences"`)).rows);
    expect(xSees.every((r) => r.userId === userX)).toBe(true);
    expect(xSees.some((r) => r.userId === userY)).toBe(false);
  });
});

describe("Validadores Zod", () => {
  it("configJson inválido se rechaza", async () => {
    await expect(forTenantPg(orgA, async (c) =>
      updateOrganizationWidgetConfig(execOf(c), ownerCtxA, "pending_followups_placeholder", { foo: 123 })))
      .rejects.toThrow(/configJson inválido/i);
    // válido pasa
    await forTenantPg(orgA, async (c) =>
      updateOrganizationWidgetConfig(execOf(c), ownerCtxA, "pending_followups_placeholder", { title: "Pendientes" }));
  });

  it("preferenceValueJson inválido se rechaza (clave y valor)", async () => {
    await expect(forTenantPgAsUser(orgA, userX, async (c) =>
      updateUserPreference(execOf(c), { organizationId: orgA, userId: userX, permissions: frontCtxA.permissions }, "ui.density", { value: "huge" })))
      .rejects.toThrow(/inválido/i);
    await expect(forTenantPgAsUser(orgA, userX, async (c) =>
      updateUserPreference(execOf(c), { organizationId: orgA, userId: userX, permissions: frontCtxA.permissions }, "clave.inexistente", { value: 1 })))
      .rejects.toThrow(/desconocida/i);
  });
});

describe("Resolver (permisos → org → preferencia)", () => {
  const widgets = [
    { widgetKey: "executive_summary_placeholder", enabled: true, visible: true, requiredPermissions: ["audit.view"], sortOrder: 1, size: "lg" },
    { widgetKey: "pending_followups_placeholder", enabled: true, visible: true, requiredPermissions: ["dashboard.view"], sortOrder: 2, size: "md" },
    { widgetKey: "disabled_widget", enabled: false, visible: false, requiredPermissions: ["dashboard.view"], sortOrder: 3, size: "md" },
  ];
  const modules = [
    { moduleKey: "agenda", enabled: true, visible: true, showInMenu: true, showInDock: false, menuSortOrder: 40, dockSortOrder: null, labelOverride: "Agenda" },
  ];

  it("widget sin permiso no aparece", () => {
    const r = resolveNavigationAndWidgets({ modules, widgets, prefs: {}, permissions: new Set(["dashboard.view"]) });
    const keys = r.dashboardWidgets.map((w) => w.key);
    expect(keys).not.toContain("executive_summary_placeholder"); // requiere audit.view
    expect(keys).toContain("pending_followups_placeholder");
  });

  it("widget negado por org o permiso NO aparece aunque la preferencia lo pida", () => {
    const prefs = { widgetOrder: ["disabled_widget", "executive_summary_placeholder", "pending_followups_placeholder"] };
    const r = resolveNavigationAndWidgets({ modules, widgets, prefs, permissions: new Set(["dashboard.view"]) });
    const keys = r.dashboardWidgets.map((w) => w.key);
    expect(keys).not.toContain("disabled_widget");              // negado por org (enabled=false)
    expect(keys).not.toContain("executive_summary_placeholder"); // negado por permiso
    expect(keys).toEqual(["pending_followups_placeholder"]);
  });

  it("la preferencia reordena y oculta lo permitido", () => {
    const withPerm = new Set(["dashboard.view", "audit.view"]);
    const r1 = resolveNavigationAndWidgets({ modules, widgets, prefs: { widgetOrder: ["pending_followups_placeholder", "executive_summary_placeholder"] }, permissions: withPerm });
    expect(r1.dashboardWidgets.map((w) => w.key)).toEqual(["pending_followups_placeholder", "executive_summary_placeholder"]);
    const r2 = resolveNavigationAndWidgets({ modules, widgets, prefs: { hiddenWidgets: ["executive_summary_placeholder"] }, permissions: withPerm });
    expect(r2.dashboardWidgets.map((w) => w.key)).not.toContain("executive_summary_placeholder");
  });
});

describe("Enforcement y eventos", () => {
  it("front_desk NO puede configure_org (rechazo + audit durable + sin cambios)", async () => {
    const runA = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgA, async (c) => work(execOf(c)));
    const before = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT "enabled" FROM "organization_dashboard_widgets" WHERE "widgetKey"='upcoming_appointments_placeholder'`)).rows[0]);
    expect(before).toBeUndefined(); // no existe aun

    await expect(guardConfigOperation(runA, frontCtxA, "dashboard.configure_org",
      (exec) => enableOrganizationWidget(exec, frontCtxA, "upcoming_appointments_placeholder")))
      .rejects.toBeInstanceOf(PermissionDeniedError);

    const after = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT "enabled" FROM "organization_dashboard_widgets" WHERE "widgetKey"='upcoming_appointments_placeholder'`)).rows[0]);
    expect(after).toBeUndefined(); // NO se creo
    const denied = await forTenantPg(orgA, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`)).rows[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });

  it("widget_enabled solo con accion permitida (owner) y se emite evento", async () => {
    await forTenantPg(orgA, async (c) => enableOrganizationWidget(execOf(c), ownerCtxA, "upcoming_appointments_placeholder"));
    const types = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT DISTINCT type FROM "events" WHERE type='dashboard.widget_enabled'`)).rows.map((r) => r.type));
    expect(types).toContain("dashboard.widget_enabled");
  });

  it("preferencia personal NO genera evento", async () => {
    const before = await forTenantPg(orgA, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "events"`)).rows[0].count));
    await forTenantPgAsUser(orgA, userX, async (c) =>
      updateUserPreference(execOf(c), { organizationId: orgA, userId: userX, permissions: frontCtxA.permissions }, "nav.left_sidebar_collapsed", { value: true }));
    const after = await forTenantPg(orgA, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "events"`)).rows[0].count));
    expect(after).toBe(before); // sin eventos nuevos
    // y no existe tipo de evento de preferencia
    expect(listEventTypes().some((e) => e.type.includes("preference"))).toBe(false);
  });
});
