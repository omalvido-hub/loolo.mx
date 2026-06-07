// NELZZON — Pruebas Fase 3B (Follow operativo). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { can } from "../src/server/domain/identity/permissions.js";
import { ingestInboundMessage } from "../src/server/domain/contacts/ingest.js";
import { seedSuggestedActions } from "../prisma/seed-follow.js";
import {
  classifyConversation, setPriority, closeConversation, reopenConversation,
  createTask, completeTask, cancelTask, executeSuggestedAction,
} from "../src/server/domain/follow/inbox.js";
import { assignConversationWithMembershipCheck, AssignmentDeniedError } from "../src/server/domain/follow/assign.js";
import { resolveInbox } from "../src/server/domain/follow/resolver.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);
const identityQuery = (t: string, p: unknown[]) => adminPool.query(t, p).then((r) => r.rows);

let orgA: string, orgB: string, chA: string;
let ownerCtxA: ActorContext, frontCtxA: ActorContext, clinicianCtxA: ActorContext, billingCtxA: ActorContext;
let frontUserA: string, orgBUser: string;

async function ensureRbac() {
  for (const p of PERMISSIONS) await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  for (const r of ROLES) {
    const id = (await adminPool.query(`INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`, [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]); // refrescar a la matriz actual
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
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId" WHERE mr."memberId"=$1`, [memberId]);
  return new Set(rows.map((r) => r.key));
}
const runA = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgA, async (c) => work(execOf(c)));
const newConversation = async () => (await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: `c-${rnd()}`, fromKind: "WHATSAPP", fromRawValue: `+5255${Math.floor(10000000 + Math.random() * 89999999)}`, body: "hola" }))).conversationId;

beforeAll(async () => {
  await ensureRbac();
  await seedSuggestedActions();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  chA = (await adminPool.query(`INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WHATSAPP','+520000000001') RETURNING id`, [orgA])).rows[0].id;
  const o = await memberWithRole(orgA, "owner");
  const f = await memberWithRole(orgA, "front_desk");
  const cl = await memberWithRole(orgA, "clinician");
  const b = await memberWithRole(orgA, "billing");
  const ob = await memberWithRole(orgB, "front_desk");
  frontUserA = f.userId; orgBUser = ob.userId;
  ownerCtxA = { organizationId: orgA, userId: o.userId, permissions: await resolvePerms(o.memberId) };
  frontCtxA = { organizationId: orgA, userId: f.userId, permissions: await resolvePerms(f.memberId) };
  clinicianCtxA = { organizationId: orgA, userId: cl.userId, permissions: await resolvePerms(cl.memberId) };
  billingCtxA = { organizationId: orgA, userId: b.userId, permissions: await resolvePerms(b.memberId) };
});
afterAll(async () => { await closePools(); });

describe("Matriz de permisos 3B", () => {
  it("front_desk SÍ cierra; clinician y billing NO", () => {
    expect(can(frontCtxA.permissions, "conversations.close")).toBe(true);
    expect(can(clinicianCtxA.permissions, "conversations.close")).toBe(false);
    expect(can(billingCtxA.permissions, "conversations.close")).toBe(false);
    expect(can(billingCtxA.permissions, "conversations.view")).toBe(true);
    expect(can(clinicianCtxA.permissions, "tasks.manage")).toBe(true);
    expect(can(billingCtxA.permissions, "tasks.manage")).toBe(false);
  });
});

describe("Enforcement (rechazo con rol SIN el permiso, no front_desk)", () => {
  it("billing NO puede cerrar (rechazo + permission.denied durable + sin cambios)", async () => {
    const conv = await newConversation();
    const denBefore = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));
    await expect(guardConfigOperation(runA, billingCtxA, "conversations.close", (e) => closeConversation(e, billingCtxA, { conversationId: conv })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "conversations" WHERE "id"=$1`, [conv]))[0].status);
    expect(st).not.toBe("CLOSED");
    const denAfter = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));
    expect(denAfter).toBeGreaterThan(denBefore);
  });

  it("billing NO puede crear tarea (sin tasks.manage)", async () => {
    const conv = await newConversation();
    await expect(guardConfigOperation(runA, billingCtxA, "tasks.manage", (e) => createTask(e, billingCtxA, { conversationId: conv, title: "x" })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
  });
});

describe("Asignación con validación de membresía (Opción A)", () => {
  it("asignar a miembro de la MISMA org funciona + emite conversation.assigned", async () => {
    const conv = await newConversation();
    await assignConversationWithMembershipCheck(identityQuery, runA, ownerCtxA, { conversationId: conv, assignedToUserId: frontUserA });
    const row = await runA(async (e) => (await e(`SELECT "assignedToUserId" FROM "conversations" WHERE "id"=$1`, [conv]))[0]);
    expect(row.assignedToUserId).toBe(frontUserA);
    const ev = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='conversation.assigned'`, []))[0].count));
    expect(ev).toBeGreaterThanOrEqual(1);
  });

  it("asignar a usuario SIN membresía falla (fail-closed, sin cambios, sin evento, audit durable)", async () => {
    const conv = await newConversation();
    const fakeUser = (await adminPool.query(`INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`, [`ghost-${rnd()}@t.test`])).rows[0].id;
    const evBefore = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='conversation.assigned'`, []))[0].count));
    await expect(assignConversationWithMembershipCheck(identityQuery, runA, ownerCtxA, { conversationId: conv, assignedToUserId: fakeUser }))
      .rejects.toBeInstanceOf(AssignmentDeniedError);
    const row = await runA(async (e) => (await e(`SELECT "assignedToUserId" FROM "conversations" WHERE "id"=$1`, [conv]))[0]);
    expect(row.assignedToUserId).toBeNull();
    const evAfter = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='conversation.assigned'`, []))[0].count));
    expect(evAfter).toBe(evBefore);
    const denied = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='assignment.denied' AND "entityId"=$1`, [conv]))[0].count));
    expect(denied).toBeGreaterThanOrEqual(1);
  });

  it("asignar a usuario de OTRA org falla", async () => {
    const conv = await newConversation();
    await expect(assignConversationWithMembershipCheck(identityQuery, runA, ownerCtxA, { conversationId: conv, assignedToUserId: orgBUser }))
      .rejects.toBeInstanceOf(AssignmentDeniedError);
  });

  it("app_user NO puede leer organization_memberships (identidad aislada)", async () => {
    await expect(runA((e) => e(`SELECT count(*) FROM "organization_memberships"`, []))).rejects.toThrow();
  });
});

describe("Cierre / reapertura / clasificación", () => {
  it("close registra note en action_log y setea closedAt; reopen lo limpia", async () => {
    const conv = await newConversation();
    await runA((e) => closeConversation(e, frontCtxA, { conversationId: conv, note: "resuelto por teléfono" }));
    const c1 = await runA(async (e) => (await e(`SELECT "status","closedAt" FROM "conversations" WHERE "id"=$1`, [conv]))[0]);
    expect(c1.status).toBe("CLOSED");
    expect(c1.closedAt).not.toBeNull();
    const note = await runA(async (e) => (await e(`SELECT "note" FROM "conversation_action_log" WHERE "conversationId"=$1 AND "actionType"='CLOSED'`, [conv]))[0]);
    expect(note.note).toContain("resuelto");
    await runA((e) => reopenConversation(e, frontCtxA, { conversationId: conv }));
    const c2 = await runA(async (e) => (await e(`SELECT "status","closedAt" FROM "conversations" WHERE "id"=$1`, [conv]))[0]);
    expect(c2.status).toBe("OPEN");
    expect(c2.closedAt).toBeNull();
  });

  it("classify + setPriority emiten/trazan correctamente", async () => {
    const conv = await newConversation();
    await runA((e) => classifyConversation(e, frontCtxA, { conversationId: conv, category: "COMPLAINT" }));
    await runA((e) => setPriority(e, frontCtxA, { conversationId: conv, priority: "URGENT" }));
    const c = await runA(async (e) => (await e(`SELECT "category","priority" FROM "conversations" WHERE "id"=$1`, [conv]))[0]);
    expect(c.category).toBe("COMPLAINT");
    expect(c.priority).toBe("URGENT");
    const ev = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='conversation.classified'`, []))[0].count));
    expect(ev).toBeGreaterThanOrEqual(1);
  });
});

describe("Tareas", () => {
  it("crear / completar / cancelar", async () => {
    const conv = await newConversation();
    const { taskId } = await runA((e) => createTask(e, frontCtxA, { conversationId: conv, title: "Llamar mañana" }));
    await runA((e) => completeTask(e, frontCtxA, taskId));
    const t = await runA(async (e) => (await e(`SELECT "status" FROM "conversation_tasks" WHERE "id"=$1`, [taskId]))[0]);
    expect(t.status).toBe("DONE");
    const { taskId: t2 } = await runA((e) => createTask(e, frontCtxA, { conversationId: conv, title: "Otra" }));
    await runA((e) => cancelTask(e, frontCtxA, t2));
    const t2row = await runA(async (e) => (await e(`SELECT "status" FROM "conversation_tasks" WHERE "id"=$1`, [t2]))[0]);
    expect(t2row.status).toBe("CANCELLED");
    const evC = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='task.created'`, []))[0].count));
    expect(evC).toBeGreaterThanOrEqual(2);
  });
});

describe("Acciones sugeridas (inertes)", () => {
  it("actionKey inexistente → rechazado", async () => {
    const conv = await newConversation();
    await expect(runA((e) => executeSuggestedAction(e, ownerCtxA, { conversationId: conv, actionKey: "no_existe" })))
      .rejects.toThrow(/desconocida|inactiva/i);
  });

  it("acción válida registra en action_log sin efecto colateral", async () => {
    const conv = await newConversation();
    await runA((e) => executeSuggestedAction(e, ownerCtxA, { conversationId: conv, actionKey: "request_more_info", note: "pedí teléfono" }));
    const log = await runA(async (e) => (await e(`SELECT "actionKey" FROM "conversation_action_log" WHERE "conversationId"=$1 AND "actionType"='SUGGESTED_ACTION'`, [conv]))[0]);
    expect(log.actionKey).toBe("request_more_info");
    // sin efecto colateral: no se creó tarea ni se cambió status
    const tasks = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "conversation_tasks" WHERE "conversationId"=$1`, [conv]))[0].count));
    expect(tasks).toBe(0);
  });

  it("requiredPermission de la acción se exige (clinician no puede 'escalate_to_owner')", async () => {
    const conv = await newConversation();
    // clinician tiene suggested_actions.execute pero NO conversations.assign (requiredPermission de la acción)
    await expect(runA((e) => executeSuggestedAction(e, clinicianCtxA, { conversationId: conv, actionKey: "escalate_to_owner" })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("acción sensible audita en audit_logs (owner)", async () => {
    const conv = await newConversation();
    await runA((e) => executeSuggestedAction(e, ownerCtxA, { conversationId: conv, actionKey: "escalate_to_owner" }));
    const aud = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='suggested_action.executed' AND "entityId"=$1`, [conv]))[0].count));
    expect(aud).toBeGreaterThanOrEqual(1);
  });
});

describe("Append-only y RLS", () => {
  it("conversation_action_log es append-only (sin UPDATE/DELETE para app_user)", async () => {
    await expect(runA((e) => e(`UPDATE "conversation_action_log" SET "note"='x'`, []))).rejects.toThrow();
    await expect(runA((e) => e(`DELETE FROM "conversation_action_log"`, []))).rejects.toThrow();
  });

  it("org B no ve conversation_tasks ni conversation_action_log de A", async () => {
    const t = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "conversation_tasks" WHERE "organizationId"=$1`, [orgA])).rows);
    const l = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "conversation_action_log" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(t.length).toBe(0);
    expect(l.length).toBe(0);
  });
});

describe("Resolver de bandeja (puro)", () => {
  const convs = [
    { id: "c1", status: "OPEN" as const, priority: "LOW" as const, category: "INFO", assignedToUserId: null, lastMessageAt: "2026-01-01" },
    { id: "c2", status: "OPEN" as const, priority: "URGENT" as const, category: "COMPLAINT", assignedToUserId: "u1", lastMessageAt: "2026-02-01" },
    { id: "c3", status: "CLOSED" as const, priority: "NORMAL" as const, category: "INFO", assignedToUserId: null, lastMessageAt: "2026-03-01" },
  ];
  it("sin conversations.view → bandeja vacía (fail-closed)", () => {
    expect(resolveInbox({ conversations: convs, filter: {}, permissions: new Set() })).toEqual([]);
  });
  it("ordena por prioridad y filtra por estado/asignación", () => {
    const perms = new Set(["conversations.view"]);
    const all = resolveInbox({ conversations: convs, filter: {}, permissions: perms });
    expect(all[0].id).toBe("c2"); // URGENT primero
    const open = resolveInbox({ conversations: convs, filter: { status: "OPEN" }, permissions: perms });
    expect(open.map((c) => c.id).sort()).toEqual(["c1", "c2"]);
    const unassigned = resolveInbox({ conversations: convs, filter: { unassignedOnly: true }, permissions: perms });
    expect(unassigned.every((c) => c.assignedToUserId === null)).toBe(true);
  });
});
