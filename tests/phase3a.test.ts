// NELZZON — Pruebas Fase 3A (identidad operativa). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { normalizeIdentifier } from "../src/server/domain/contacts/normalize.js";
import { ingestInboundMessage } from "../src/server/domain/contacts/ingest.js";
import { promoteToPatient, promoteToProspect, createOpportunity } from "../src/server/domain/contacts/promote.js";
import { performMerge, MergeBlockedError } from "../src/server/domain/contacts/merge.js";
import { can } from "../src/server/domain/identity/permissions.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string, chA: string, chB: string;
let ownerCtxA: ActorContext, frontCtxA: ActorContext;

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
  const { rows } = await adminPool.query(`SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId" JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId" WHERE mr."memberId"=$1`, [memberId]);
  return new Set(rows.map((r) => r.key));
}
const runA = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgA, async (c) => work(execOf(c)));

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  chA = (await adminPool.query(`INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WHATSAPP','+520000000001') RETURNING id`, [orgA])).rows[0].id;
  chB = (await adminPool.query(`INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WHATSAPP','+520000000002') RETURNING id`, [orgB])).rows[0].id;
  const o = await memberWithRole(orgA, "owner");
  const f = await memberWithRole(orgA, "front_desk");
  ownerCtxA = { organizationId: orgA, userId: o.userId, permissions: await resolvePerms(o.memberId) };
  frontCtxA = { organizationId: orgA, userId: f.userId, permissions: await resolvePerms(f.memberId) };
});
afterAll(async () => { await closePools(); });

describe("Normalización (Zod / libphonenumber)", () => {
  it("teléfono válido → E.164; inválido → null (fail-closed)", () => {
    expect(normalizeIdentifier("PHONE", "5512345678", "MX")).toBe("+525512345678");
    expect(normalizeIdentifier("WHATSAPP", "55 1234 5678", "MX")).toBe("+525512345678");
    expect(normalizeIdentifier("PHONE", "123", "MX")).toBeNull();
    expect(normalizeIdentifier("EMAIL", "Foo@Bar.COM")).toBe("foo@bar.com");
    expect(normalizeIdentifier("EMAIL", "no-email")).toBeNull();
    expect(normalizeIdentifier("INSTAGRAM", "@Clinica")).toBe("clinica");
  });
});

describe("Deduplicación e idempotencia", () => {
  it("mismo teléfono en dos mensajes → un solo contacto", async () => {
    const m1 = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "ext-1", fromKind: "WHATSAPP", fromRawValue: "+525511112222", body: "hola" }));
    const m2 = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "ext-2", fromKind: "WHATSAPP", fromRawValue: "+525511112222", body: "otra vez" }));
    expect(m1.contactId).toBe(m2.contactId);
  });

  it("teléfonos distintos → dos contactos", async () => {
    const a = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "ext-3", fromKind: "WHATSAPP", fromRawValue: "+525533334444", body: "x" }));
    const b = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "ext-4", fromKind: "WHATSAPP", fromRawValue: "+525555556666", body: "y" }));
    expect(a.contactId).not.toBe(b.contactId);
  });

  it("mismo externalId reintentado → un solo mensaje (idempotente)", async () => {
    const first = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "dup-1", fromKind: "WHATSAPP", fromRawValue: "+525577778888", body: "1" }));
    const second = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "dup-1", fromKind: "WHATSAPP", fromRawValue: "+525577778888", body: "1" }));
    expect(second.duplicate).toBe(true);
    expect(second.messageId).toBe(first.messageId);
    const count = await runA(async (e) => Number((await e(`SELECT count(*) FROM "messages" WHERE "externalId"='dup-1'`, []))[0].count));
    expect(count).toBe(1);
  });

  it("externalId NULL no bloquea múltiples mensajes legítimos", async () => {
    const c = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, fromKind: "WHATSAPP", fromRawValue: "+525599990000", body: "a" }));
    await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, fromKind: "WHATSAPP", fromRawValue: "+525599990000", body: "b" }));
    const n = await runA(async (e) => Number((await e(`SELECT count(*) FROM "messages" WHERE "conversationId"=$1`, [c.conversationId]))[0].count));
    expect(n).toBeGreaterThanOrEqual(2);
  });

  it("teléfono inválido → contacto MISSING_DATA sin identificador", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "bad-1", fromKind: "PHONE", fromRawValue: "123", body: "z" }));
    const st = await runA(async (e) => (await e(`SELECT "state" FROM "contacts" WHERE "id"=$1`, [r.contactId]))[0].state);
    expect(st).toBe("MISSING_DATA");
    const ids = await runA(async (e) => (await e(`SELECT count(*) FROM "contact_identifiers" WHERE "contactId"=$1`, [r.contactId]))[0].count);
    expect(Number(ids)).toBe(0);
  });

  it("conversación nueva nace con initialIntent UNKNOWN", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "int-1", fromKind: "WHATSAPP", fromRawValue: "+525512121212", body: "q" }));
    const intent = await runA(async (e) => (await e(`SELECT "initialIntent" FROM "conversations" WHERE "id"=$1`, [r.conversationId]))[0].initialIntent);
    expect(intent).toBe("UNKNOWN");
  });
});

describe("Promoción (explícita, idempotente, con permiso)", () => {
  it("ingesta NO crea paciente automáticamente", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "np-1", fromKind: "WHATSAPP", fromRawValue: "+525513131313", body: "hola" }));
    const n = await runA(async (e) => Number((await e(`SELECT count(*) FROM "patients" WHERE "contactId"=$1`, [r.contactId]))[0].count));
    expect(n).toBe(0);
  });

  it("promoteToPatient idempotente (no duplica)", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "pp-1", fromKind: "WHATSAPP", fromRawValue: "+525514141414", body: "cita" }));
    const p1 = await runA((e) => promoteToPatient(e, ownerCtxA, r.contactId));
    const p2 = await runA((e) => promoteToPatient(e, ownerCtxA, r.contactId));
    expect(p1.created).toBe(true);
    expect(p2.created).toBe(false);
    expect(p2.patientId).toBe(p1.patientId);
  });

  it("front_desk NO puede promover a paciente (rechazo + audit durable + sin cambios)", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "fp-1", fromKind: "WHATSAPP", fromRawValue: "+525515151515", body: "hola" }));
    const before = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));
    await expect(guardConfigOperation(runA, frontCtxA, "patients.manage", (e) => promoteToPatient(e, frontCtxA, r.contactId)))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    const patients = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "patients" WHERE "contactId"=$1`, [r.contactId]))[0].count));
    expect(patients).toBe(0);
    const after = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));
    expect(after).toBe(before + 1);
  });

  it("crear oportunidad exige opportunities.manage (front_desk rechazado, owner ok)", async () => {
    const r = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "op-1", fromKind: "WHATSAPP", fromRawValue: "+525516161616", body: "precio?" }));
    await expect(guardConfigOperation(runA, frontCtxA, "opportunities.manage", (e) => createOpportunity(e, frontCtxA, { contactId: r.contactId, title: "Limpieza" })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    const o = await runA((e) => createOpportunity(e, ownerCtxA, { contactId: r.contactId, title: "Limpieza" }));
    expect(o.opportunityId).toBeTruthy();
  });
});

describe("Merge de contactos (política v1 conservadora)", () => {
  it("re-apunta identificadores/conversaciones, archiva, registra y emite evento (owner)", async () => {
    const s = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mg-s", fromKind: "WHATSAPP", fromRawValue: "+525521000001", body: "sobreviviente" }));
    const m = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mg-m", fromKind: "WHATSAPP", fromRawValue: "+525521000002", body: "absorbido" }));
    await performMerge(runA, ownerCtxA, { survivorId: s.contactId, mergedId: m.contactId, reason: "duplicado" });

    const idsToSurvivor = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "contact_identifiers" WHERE "contactId"=$1`, [s.contactId]))[0].count));
    expect(idsToSurvivor).toBeGreaterThanOrEqual(2);
    const merged = await runA(async (e) => (await e(`SELECT "mergedIntoId","state" FROM "contacts" WHERE "id"=$1`, [m.contactId]))[0]);
    expect(merged.mergedIntoId).toBe(s.contactId);
    expect(merged.state).toBe("ARCHIVED");
    const rec = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "contact_merges" WHERE "survivorId"=$1 AND "mergedId"=$2`, [s.contactId, m.contactId]))[0].count));
    expect(rec).toBe(1);
    const ev = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='contact.merged'`, []))[0].count));
    expect(ev).toBeGreaterThanOrEqual(1);
  });

  it("BLOQUEA merge si el absorbido tiene paciente (sin cambios + audit durable)", async () => {
    const s = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mb-s", fromKind: "WHATSAPP", fromRawValue: "+525522000001", body: "s" }));
    const m = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mb-m", fromKind: "WHATSAPP", fromRawValue: "+525522000002", body: "m" }));
    await runA((e) => promoteToPatient(e, ownerCtxA, m.contactId));
    await expect(performMerge(runA, ownerCtxA, { survivorId: s.contactId, mergedId: m.contactId }))
      .rejects.toBeInstanceOf(MergeBlockedError);
    const merged = await runA(async (e) => (await e(`SELECT "mergedIntoId" FROM "contacts" WHERE "id"=$1`, [m.contactId]))[0]);
    expect(merged.mergedIntoId).toBeNull(); // rollback: sin cambios
    const blocked = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='contact.merge_blocked' AND "entityId"=$1`, [m.contactId]))[0].count));
    expect(blocked).toBeGreaterThanOrEqual(1); // bloqueo auditado durable
  });

  it("BLOQUEA merge si AMBOS tienen prospect ACTIVE (conflicto, sin cambios + audit + sin evento)", async () => {
    const s = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mc-s", fromKind: "WHATSAPP", fromRawValue: "+525524000001", body: "s" }));
    const m = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "mc-m", fromKind: "WHATSAPP", fromRawValue: "+525524000002", body: "m" }));
    await runA((e) => promoteToProspect(e, ownerCtxA, s.contactId)); // survivor prospect ACTIVE
    await runA((e) => promoteToProspect(e, ownerCtxA, m.contactId)); // merged prospect ACTIVE
    const evBefore = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='contact.merged'`, []))[0].count));

    await expect(performMerge(runA, ownerCtxA, { survivorId: s.contactId, mergedId: m.contactId }))
      .rejects.toMatchObject({ code: "CONTACT_MERGE_CONFLICT" });

    const merged = await runA(async (e) => (await e(`SELECT "mergedIntoId" FROM "contacts" WHERE "id"=$1`, [m.contactId]))[0]);
    expect(merged.mergedIntoId).toBeNull(); // sin re-apuntar, sin cambios
    const evAfter = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='contact.merged'`, []))[0].count));
    expect(evAfter).toBe(evBefore); // sin contact.merged
    const blocked = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='contact.merge_blocked' AND "entityId"=$1`, [m.contactId]))[0].count));
    expect(blocked).toBeGreaterThanOrEqual(1);
  });

  it("front_desk con contacts.manage pero SIN contacts.merge NO puede fusionar (rechazo + audit durable + sin datos + sin evento)", async () => {
    const s = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "md-s", fromKind: "WHATSAPP", fromRawValue: "+525523000001", body: "s" }));
    const m = await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: chA, externalId: "md-m", fromKind: "WHATSAPP", fromRawValue: "+525523000002", body: "m" }));
    expect(can(frontCtxA.permissions, "contacts.manage")).toBe(true);   // sí gestiona
    expect(can(frontCtxA.permissions, "contacts.merge")).toBe(false);   // pero NO fusiona

    const evBefore = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='contact.merged'`, []))[0].count));
    const denBefore = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));

    await expect(performMerge(runA, frontCtxA, { survivorId: s.contactId, mergedId: m.contactId }))
      .rejects.toBeInstanceOf(PermissionDeniedError);

    const merged = await runA(async (e) => (await e(`SELECT "mergedIntoId" FROM "contacts" WHERE "id"=$1`, [m.contactId]))[0]);
    expect(merged.mergedIntoId).toBeNull(); // sin datos movidos
    const evAfter = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='contact.merged'`, []))[0].count));
    expect(evAfter).toBe(evBefore); // sin contact.merged
    const denAfter = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='permission.denied'`, []))[0].count));
    expect(denAfter).toBeGreaterThan(denBefore); // permission.denied durable
  });
});

describe("RLS", () => {
  it("org B no ve contact_identifiers ni contact_merges de A", async () => {
    const ids = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "contact_identifiers" WHERE "organizationId"=$1`, [orgA])).rows);
    const mgs = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "contact_merges" WHERE "organizationId"=$1`, [orgA])).rows);
    expect(ids.length).toBe(0);
    expect(mgs.length).toBe(0);
  });
});
