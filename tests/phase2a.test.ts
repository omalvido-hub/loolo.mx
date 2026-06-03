// LOOLO — Pruebas Fase 2A (seguridad operativa). Corre contra Postgres real.
// Resolución de permisos vía adminPool (cliente de identidad), igual que en producción.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { can, assertCan } from "../src/server/domain/identity/permissions.js";
import { assertCanSelectOrganization, decideDefaultOrganization } from "../src/server/domain/identity/organizations.js";
import { effectiveStatus, isUsable, createSupportGrant, revokeSupportGrant, recordSupportUse } from "../src/server/domain/identity/support-access.js";
import { recordPermissionDenied, recordAudit } from "../src/server/domain/audit/record.js";
import { listEventTypes } from "../src/server/domain/events/schemas.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let memberOwnerA: string, memberAdminA: string, memberFrontA: string, memberBillingA: string;
let userMulti: string;

// Reseed del catálogo RBAC en notación punto (migra de la convención colon de Fase 1).
async function reseedCatalog() {
  await adminPool.query(`DELETE FROM "roles"`);        // cascade → role_permissions, membership_roles
  await adminPool.query(`DELETE FROM "permissions"`);
  for (const p of PERMISSIONS) {
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description]);
  }
  for (const r of ROLES) {
    const roleId = (await adminPool.query(
      `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) RETURNING id`,
      [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    for (const pk of r.permissions) {
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId")
         SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`, [roleId, pk]);
    }
  }
}

async function createMemberWithRole(orgId: string, email: string, roleKey: string) {
  const userId = (await adminPool.query(
    `INSERT INTO "users"("email","name","emailVerified") VALUES ($1,$2,true) RETURNING id`,
    [email, roleKey])).rows[0].id;
  const memberId = (await adminPool.query(
    `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
    [orgId, userId, roleKey])).rows[0].id;
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
    [memberId, roleKey]);
  return { userId, memberId };
}

// Resolver de permisos por membresía (mismo join que resolvePermissionKeys de producción).
async function resolvePerms(memberId: string): Promise<Set<string>> {
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr
       JOIN "roles" r ON r.id = mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId" = r.id
       JOIN "permissions" p ON p.id = rp."permissionId"
      WHERE mr."memberId" = $1`, [memberId]);
  return new Set(rows.map((r) => r.key));
}

beforeAll(async () => {
  await reseedCatalog();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  memberOwnerA = (await createMemberWithRole(orgA, `owner-${rnd()}@a.test`, "owner")).memberId;
  memberAdminA = (await createMemberWithRole(orgA, `admin-${rnd()}@a.test`, "admin")).memberId;
  memberFrontA = (await createMemberWithRole(orgA, `front-${rnd()}@a.test`, "front_desk")).memberId;
  memberBillingA = (await createMemberWithRole(orgA, `bill-${rnd()}@a.test`, "billing")).memberId;
  // Usuario con membresía en A y B (para guard de selección).
  userMulti = (await adminPool.query(
    `INSERT INTO "users"("email","name","emailVerified") VALUES ('multi-${rnd()}@x.test','multi',true) RETURNING id`)).rows[0].id;
  await adminPool.query(`INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,'owner')`, [orgA, userMulti]);
  await adminPool.query(`INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,'admin')`, [orgB, userMulti]);
});

afterAll(async () => { await closePools(); });

describe("Permisos reales (enforcement en servidor/dominio)", () => {
  it("owner tiene organization.manage y puede conceder soporte", async () => {
    const p = await resolvePerms(memberOwnerA);
    expect(can(p, "organization.manage")).toBe(true);
    expect(can(p, "support_access.grant")).toBe(true);
    expect(can(p, "organization.members.update_role")).toBe(true);
  });

  it("admin puede cambiar roles pero NO conceder soporte", async () => {
    const p = await resolvePerms(memberAdminA);
    expect(can(p, "organization.members.update_role")).toBe(true);
    expect(can(p, "support_access.grant")).toBe(false); // sensible: solo owner
  });

  it("front_desk NO puede cambiar roles", async () => {
    const p = await resolvePerms(memberFrontA);
    expect(can(p, "app_shell.view")).toBe(true);
    expect(can(p, "organization.members.update_role")).toBe(false);
  });

  it("billing NO puede cambiar roles", async () => {
    const p = await resolvePerms(memberBillingA);
    expect(can(p, "organization.members.update_role")).toBe(false);
    expect(assertCan(p, "organization.members.update_role").ok).toBe(false);
  });
});

describe("Selección de organización (guard de membresía)", () => {
  const memberships = () => [{ organizationId: orgA }, { organizationId: orgB }];

  it("puede seleccionar una organización donde es miembro", () => {
    expect(assertCanSelectOrganization(memberships(), orgA).ok).toBe(true);
  });

  it("NO puede seleccionar una organización ajena (vector por parámetro)", () => {
    const ajena = "00000000-0000-0000-0000-000000000000";
    const r = assertCanSelectOrganization(memberships(), ajena);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("FORBIDDEN");
  });

  it("auto-selecciona si solo hay una; estado controlado si no hay ninguna", () => {
    expect(decideDefaultOrganization([{ organizationId: orgA }])).toEqual({ kind: "auto", organizationId: orgA });
    expect(decideDefaultOrganization([])).toEqual({ kind: "none" });
    expect(decideDefaultOrganization(memberships()).kind).toBe("choose");
  });
});

describe("Auditoría: permission.denied y actorType", () => {
  it("permission.denied se registra en audit_logs (no en events)", async () => {
    const before = Number((await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`)).rows[0].count)));
    await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      await recordPermissionDenied(exec, { organizationId: orgA, actorUserId: userMulti, permission: "organization.manage" });
    });
    const after = Number((await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`)).rows[0].count)));
    expect(after).toBe(before + 1);
    // events NO debe conocer 'permission.denied' (se mantiene lean/operativo)
    expect(listEventTypes().some((e) => e.type === "permission.denied")).toBe(false);
  });

  it("audit_logs soporta actorType (user/system/ai/support)", async () => {
    const row = await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      return recordAudit(exec, {
        organizationId: orgA, actorType: "SUPPORT", action: "support_access.used",
        entityType: "support_access_grant", entityId: null, metadata: { note: "demo" },
      });
    });
    expect(row.id).toBeTruthy();
    const at = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT "actorType" FROM "audit_logs" WHERE id=$1`, [row.id])).rows[0].actorType);
    expect(at).toBe("SUPPORT");
  });
});

describe("Acceso de soporte (temporal, expirable, revocable, auditado)", () => {
  it("conceder → ACTIVE/usable; revocar → no usable; auditado", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const grant = await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      const g = await createSupportGrant(exec, { organizationId: orgA, grantedBy: userMulti, reason: "Diagnóstico", expiresAt: future });
      await recordAudit(exec, { organizationId: orgA, actorUserId: userMulti, actorType: "USER", action: "support_access.granted", entityType: "support_access_grant", entityId: g.id });
      return g;
    });
    expect(effectiveStatus(grant, new Date())).toBe("ACTIVE");
    expect(isUsable(grant, new Date())).toBe(true);

    const revoked = await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      const r = await revokeSupportGrant(exec, grant.id, userMulti);
      await recordAudit(exec, { organizationId: orgA, actorUserId: userMulti, actorType: "USER", action: "support_access.revoked", entityType: "support_access_grant", entityId: grant.id });
      return r;
    });
    expect(isUsable(revoked, new Date())).toBe(false);
  });

  it("un grant expirado NO es usable (la expiración manda sobre el estado almacenado)", () => {
    const past = new Date(Date.now() - 1000);
    expect(effectiveStatus({ status: "ACTIVE", expiresAt: past, revokedAt: null }, new Date())).toBe("EXPIRED");
    expect(isUsable({ status: "ACTIVE", expiresAt: past, revokedAt: null }, new Date())).toBe(false);
  });

  it("registrar uso incrementa useCount; usar un grant revocado lanza error", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const grant = await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      return createSupportGrant(exec, { organizationId: orgA, grantedBy: userMulti, reason: "Soporte", expiresAt: future });
    });
    const used = await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      return recordSupportUse(exec, grant.id, userMulti);
    });
    expect(used.useCount).toBe(1);
    expect(used.usedAt).toBeTruthy();

    await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      await revokeSupportGrant(exec, grant.id, userMulti);
    });
    await expect(forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      return recordSupportUse(exec, grant.id, userMulti);
    })).rejects.toThrow(/no usable/i);
  });

  it("RLS: org B no ve los grants de soporte de org A", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    await forTenantPg(orgA, async (c) => {
      const exec = (t: string, p: unknown[]) => c.query(t, p).then((r) => r.rows);
      return createSupportGrant(exec, { organizationId: orgA, grantedBy: userMulti, reason: "solo A", expiresAt: future });
    });
    const seenFromB = await forTenantPg(orgB, async (c) =>
      (await c.query(`SELECT id FROM "support_access_grants" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(seenFromB.length).toBe(0);
  });
});
