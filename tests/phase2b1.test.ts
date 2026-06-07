// NELZZON — Pruebas Fase 2B-1 (configuracion). Contra Postgres real.
// Incluye ENFORCEMENT real: las operaciones rechazan sin permiso ANTES de tocar datos.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { can } from "../src/server/domain/identity/permissions.js";
import { PermissionDeniedError, guardConfigOperation } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { seedModulesAndTemplate } from "../prisma/seed-modules.js";
import { ALL_MODULES } from "../src/server/domain/modules/catalog-data.js";
import { ODONTOLOGIA_TEMPLATE_MODULES } from "../src/server/domain/modules/template-data.js";
import { applyTemplateToOrganization } from "../src/server/domain/modules/apply-template.js";
import { enableModule, disableModule } from "../src/server/domain/modules/configure.js";
import { getOrganizationModules } from "../src/server/domain/modules/queries.js";
import { listEventTypes } from "../src/server/domain/events/schemas.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string, orgC: string;
let ownerUser: string, frontUser: string, frontMember: string, ownerMember: string;
let ownerCtxA: ActorContext, frontCtxA: ActorContext, ownerCtxC: ActorContext, frontCtxC: ActorContext;

async function ensureRbac() {
  for (const p of PERMISSIONS) {
    await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  }
  for (const r of ROLES) {
    const id = (await adminPool.query(
      `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4)
       ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
      [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    for (const pk of r.permissions) {
      await adminPool.query(`INSERT INTO "role_permissions"("roleId","permissionId")
        SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`, [id, pk]);
    }
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
    `SELECT p."key" FROM "membership_roles" mr
       JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id
       JOIN "permissions" p ON p.id=rp."permissionId"
      WHERE mr."memberId"=$1`, [memberId]);
  return new Set(rows.map((r) => r.key));
}

beforeAll(async () => {
  await ensureRbac();
  await seedModulesAndTemplate();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  orgC = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('C','c-${rnd()}') RETURNING id`)).rows[0].id;

  const o = await memberWithRole(orgA, "owner"); ownerUser = o.userId; ownerMember = o.memberId;
  const f = await memberWithRole(orgA, "front_desk"); frontUser = f.userId; frontMember = f.memberId;
  const oc = await memberWithRole(orgC, "owner");
  const fc = await memberWithRole(orgC, "front_desk");

  const ownerPerms = await resolvePerms(ownerMember);
  const frontPerms = await resolvePerms(frontMember);
  ownerCtxA = { organizationId: orgA, userId: ownerUser, permissions: ownerPerms };
  frontCtxA = { organizationId: orgA, userId: frontUser, permissions: frontPerms };
  ownerCtxC = { organizationId: orgC, userId: oc.userId, permissions: await resolvePerms(oc.memberId) };
  frontCtxC = { organizationId: orgC, userId: fc.userId, permissions: await resolvePerms(fc.memberId) };
});

afterAll(async () => { await closePools(); });

describe("Catalogo y plantilla", () => {
  it("module_catalog inicializa maestros y transversales", async () => {
    const n = Number((await adminPool.query(`SELECT count(*) FROM "module_catalog"`)).rows[0].count);
    expect(n).toBeGreaterThanOrEqual(ALL_MODULES.length);
    const ids = (await adminPool.query(`SELECT "key" FROM "module_catalog" WHERE "key" IN ('channels_inbound','support_access','inventory','marketing')`)).rows.map((r) => r.key);
    expect(ids.sort()).toEqual(["channels_inbound", "inventory", "marketing", "support_access"]);
  });

  it("la plantilla odontologia_general existe", async () => {
    const t = (await adminPool.query(`SELECT "templateName" FROM "business_templates" WHERE "key"='odontologia_general'`)).rows[0];
    expect(t.templateName).toContain("Odontología");
  });

  it("template_modules enlaza la plantilla con todos los modulos", async () => {
    const n = Number((await adminPool.query(
      `SELECT count(*) FROM "template_modules" tm JOIN "business_templates" t ON t.id=tm."templateId" WHERE t."key"='odontologia_general'`)).rows[0].count);
    expect(n).toBe(ODONTOLOGIA_TEMPLATE_MODULES.length);
  });

  it("Inventario es opcional y NO visible por defecto", async () => {
    const inv = (await adminPool.query(
      `SELECT tm."isOptional", tm."defaultEnabled", tm."defaultVisible"
         FROM "template_modules" tm JOIN "module_catalog" mc ON mc.id=tm."moduleId" WHERE mc."key"='inventory'`)).rows[0];
    expect(inv.isOptional).toBe(true);
    expect(inv.defaultEnabled).toBe(false);
    expect(inv.defaultVisible).toBe(false);
  });

  it("Marketing existe en la plantilla y es configurable (opcional)", async () => {
    const mk = (await adminPool.query(
      `SELECT tm."isOptional" FROM "template_modules" tm JOIN "module_catalog" mc ON mc.id=tm."moduleId" WHERE mc."key"='marketing'`)).rows[0];
    expect(mk.isOptional).toBe(true);
  });
});

describe("Aplicar plantilla (idempotente, no destructivo)", () => {
  it("applyTemplateToOrganization crea organization_modules", async () => {
    const res = await forTenantPg(orgA, async (c) =>
      applyTemplateToOrganization(execOf(c), ownerCtxA, { templateKey: "odontologia_general" }));
    expect(res.created).toBe(ODONTOLOGIA_TEMPLATE_MODULES.length);
    const n = await forTenantPg(orgA, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "organization_modules"`)).rows[0].count));
    expect(n).toBe(ODONTOLOGIA_TEMPLATE_MODULES.length);
  });

  it("re-aplicar es idempotente (crea 0 la segunda vez)", async () => {
    const res = await forTenantPg(orgA, async (c) =>
      applyTemplateToOrganization(execOf(c), ownerCtxA, { templateKey: "odontologia_general" }));
    expect(res.created).toBe(0);
  });

  it("re-aplicar NO pisa customizaciones", async () => {
    await forTenantPg(orgA, async (c) => enableModule(execOf(c), ownerCtxA, "marketing"));
    await forTenantPg(orgA, async (c) =>
      applyTemplateToOrganization(execOf(c), ownerCtxA, { templateKey: "odontologia_general" }));
    const row = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT om."enabled", om."customized" FROM "organization_modules" om JOIN "module_catalog" mc ON mc.id=om."moduleId" WHERE mc."key"='marketing'`)).rows[0]);
    expect(row.enabled).toBe(true);
    expect(row.customized).toBe(true);
  });

  it("un modulo REQUERIDO no se puede deshabilitar", async () => {
    await expect(forTenantPg(orgA, async (c) =>
      disableModule(execOf(c), ownerCtxA, "agenda"))).rejects.toThrow(/requerido/i);
  });
});

describe("ENFORCEMENT real: operaciones rechazan sin permiso ANTES de escribir", () => {
  it("front_desk NO puede aplicar plantilla (rechazo antes de crear filas) y se audita", async () => {
    const before = await forTenantPg(orgC, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "organization_modules"`)).rows[0].count));
    expect(before).toBe(0);

    // runner tenant-scoped (igual que forTenant en produccion)
    const runC = <T,>(work: (exec: any) => Promise<T>) =>
      forTenantPg(orgC, async (c) => work(execOf(c)));

    await expect(
      guardConfigOperation(runC, frontCtxC, "templates.apply", (exec) =>
        applyTemplateToOrganization(exec, frontCtxC, { templateKey: "odontologia_general" })),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    const after = await forTenantPg(orgC, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "organization_modules"`)).rows[0].count));
    expect(after).toBe(0); // NO se creo nada

    const denied = await forTenantPg(orgC, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`)).rows[0].count));
    expect(denied).toBeGreaterThanOrEqual(1); // audit durable (su propia tx commiteada)

    // La operacion denegada NO genera evento operativo (events queda limpio en orgC).
    const ops = await forTenantPg(orgC, async (c) =>
      Number((await c.query(`SELECT count(*) FROM "events" WHERE type='template.applied'`)).rows[0].count));
    expect(ops).toBe(0);
  });

  it("front_desk NO puede habilitar un modulo (rechazo antes de modificar)", async () => {
    // orgA ya tiene modulos (owner aplico). inventory esta deshabilitado.
    const before = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT om."enabled" FROM "organization_modules" om JOIN "module_catalog" mc ON mc.id=om."moduleId" WHERE mc."key"='inventory'`)).rows[0].enabled);
    expect(before).toBe(false);

    await expect(forTenantPg(orgA, async (c) =>
      enableModule(execOf(c), frontCtxA, "inventory"))).rejects.toBeInstanceOf(PermissionDeniedError);

    const after = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT om."enabled" FROM "organization_modules" om JOIN "module_catalog" mc ON mc.id=om."moduleId" WHERE mc."key"='inventory'`)).rows[0].enabled);
    expect(after).toBe(false); // sin cambios
  });

  it("owner SI puede (control positivo): habilita inventory", async () => {
    await forTenantPg(orgA, async (c) => enableModule(execOf(c), ownerCtxA, "inventory"));
    const after = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT om."enabled" FROM "organization_modules" om JOIN "module_catalog" mc ON mc.id=om."moduleId" WHERE mc."key"='inventory'`)).rows[0].enabled);
    expect(after).toBe(true);
  });

  it("la matriz coincide: owner tiene los permisos; front_desk solo view", async () => {
    expect(can(ownerCtxA.permissions, "modules.configure")).toBe(true);
    expect(can(ownerCtxA.permissions, "templates.apply")).toBe(true);
    expect(can(frontCtxA.permissions, "modules.view")).toBe(true);
    expect(can(frontCtxA.permissions, "modules.configure")).toBe(false);
    expect(can(frontCtxA.permissions, "templates.apply")).toBe(false);
  });
});

describe("Eventos operativos y auditoria", () => {
  it("template.applied y module.enabled se emiten como eventos validados", async () => {
    const types = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT DISTINCT type FROM "events" WHERE type IN ('template.applied','module.enabled')`)).rows.map((r) => r.type));
    expect(types).toContain("template.applied");
    expect(types).toContain("module.enabled");
  });

  it("permission.denied va a audit_logs, NO a events", async () => {
    expect(listEventTypes().some((e) => e.type === "permission.denied")).toBe(false);
  });

  it("acciones sensibles se auditan", async () => {
    const actions = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT DISTINCT action FROM "audit_logs" WHERE action IN ('template.applied','module.enabled')`)).rows.map((r) => r.action));
    expect(actions).toContain("template.applied");
    expect(actions).toContain("module.enabled");
  });
});

describe("RLS", () => {
  it("org B no ve los organization_modules de org A", async () => {
    const seen = await forTenantPg(orgB, async (c) =>
      (await c.query(`SELECT id FROM "organization_modules" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(seen.length).toBe(0);
  });
});

describe("getOrganizationModules (lectura)", () => {
  const runFor = (orgId: string) =>
    <T,>(work: (exec: any) => Promise<T>) => forTenantPg(orgId, async (c) => work(execOf(c)));

  it("owner con modules.view obtiene los modulos de orgA con sus flags", async () => {
    const res = await getOrganizationModules(runFor(orgA), ownerCtxA);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBe(ODONTOLOGIA_TEMPLATE_MODULES.length);
    const odontogram = res.value.find((m) => m.moduleKey === "odontogram");
    expect(odontogram).toBeTruthy();
    expect(odontogram?.enabled).toBe(true);
    expect(odontogram?.visible).toBe(true);
    expect(typeof odontogram?.showInMenu).toBe("boolean");
    expect(typeof odontogram?.showInDock).toBe("boolean");
    expect(typeof odontogram?.dashboardAvailable).toBe("boolean");
  });

  it("aislamiento multi-tenant: orgC (sin plantilla aplicada) no ve modulos de orgA", async () => {
    const res = await getOrganizationModules(runFor(orgC), ownerCtxC);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBe(0);
    expect(res.value.find((m) => m.moduleKey === "odontogram")).toBeUndefined();
  });

  it("actor sin modules.view recibe FORBIDDEN y se audita permission.denied", async () => {
    const noPermsCtx: ActorContext = { organizationId: orgA, userId: ownerUser, permissions: new Set<string>() };
    const res = await getOrganizationModules(runFor(orgA), noPermsCtx);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("FORBIDDEN");

    const denied = await forTenantPg(orgA, async (c) =>
      Number((await c.query(
        `SELECT count(*) FROM "audit_logs" WHERE action='permission.denied' AND metadata->>'permission'='modules.view'`,
      )).rows[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });

  it("labelOverride de la plantilla se resuelve en name", async () => {
    const res = await getOrganizationModules(runFor(orgA), ownerCtxA);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const odontogram = res.value.find((m) => m.moduleKey === "odontogram");
    expect(odontogram?.labelOverride).toBe("Odontograma");
    expect(odontogram?.name).toBe("Odontograma");
  });
});
