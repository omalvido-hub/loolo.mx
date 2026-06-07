// NELZZON — Pruebas Fase 4A (Agenda base). Postgres real.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { guardConfigOperation, PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { ingestInboundMessage } from "../src/server/domain/contacts/ingest.js";
import {
  createAppointment, createAppointmentFromConversation, confirmAppointment,
  rescheduleAppointment, cancelAppointment, markNoShow, completeAppointment,
  OverlapError, NotAvailableError, TransitionError, OrgRefError,
} from "../src/server/domain/agenda/appointments.js";
import { createResource, setAvailabilityRule, blockSchedule, createResourceWithLinkedUserCheck, LinkedUserError } from "../src/server/domain/agenda/resources.js";
import { resolveAvailability } from "../src/server/domain/agenda/resolver.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);
const identityQuery = (t: string, p: unknown[]) => adminPool.query(t, p).then((r) => r.rows);

// Lunes 2030-01-07. America/Mexico_City = UTC-6 (sin DST). 16:00Z = 10:00 local.
const MON_10 = "2030-01-07T16:00:00Z"; const MON_11 = "2030-01-07T17:00:00Z";
const MON_1030 = "2030-01-07T16:30:00Z"; const MON_1130 = "2030-01-07T17:30:00Z";
const MON_14 = "2030-01-07T20:00:00Z"; const MON_15 = "2030-01-07T21:00:00Z";
const MON_MIDNIGHT = "2030-01-07T06:00:00Z"; // local 00:00 → fuera de regla 09-18

let orgA: string, orgB: string;
let ownerCtxA: ActorContext, frontCtxA: ActorContext, clinicianCtxA: ActorContext;
let prof: string;

async function ensureRbac() {
  for (const p of PERMISSIONS) await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  for (const r of ROLES) {
    const id = (await adminPool.query(`INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`, [r.key, r.name, r.scope, r.assignable])).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
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

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('A','a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('B','b-${rnd()}') RETURNING id`)).rows[0].id;
  const o = await memberWithRole(orgA, "owner");
  const f = await memberWithRole(orgA, "front_desk");
  const cl = await memberWithRole(orgA, "clinician");
  ownerCtxA = { organizationId: orgA, userId: o.userId, permissions: await resolvePerms(o.memberId) };
  frontCtxA = { organizationId: orgA, userId: f.userId, permissions: await resolvePerms(f.memberId) };
  clinicianCtxA = { organizationId: orgA, userId: cl.userId, permissions: await resolvePerms(cl.memberId) };
  // profesional + disponibilidad lunes 09:00-18:00 (minutos 540-1080)
  prof = (await runA((e) => createResource(e, ownerCtxA, { kind: "PROFESSIONAL", name: "Dra. X" }))).resourceId;
  await runA((e) => setAvailabilityRule(e, ownerCtxA, { resourceId: prof, weekday: 1, startMinute: 540, endMinute: 1080 }));
});
afterAll(async () => { await closePools(); });

describe("Crear / disponibilidad / solapamiento", () => {
  it("crea cita válida dentro de disponibilidad", async () => {
    const { appointmentId } = await runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: MON_10, endAt: MON_11 }));
    expect(appointmentId).toBeTruthy();
    const ev = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "events" WHERE type='appointment.scheduled'`, []))[0].count));
    expect(ev).toBeGreaterThanOrEqual(1);
  });

  it("rechaza fuera de disponibilidad", async () => {
    await expect(runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: MON_MIDNIGHT, endAt: "2030-01-07T07:00:00Z" })))
      .rejects.toBeInstanceOf(NotAvailableError);
  });

  it("rechaza solapamiento con cita activa (EXCLUDE BD)", async () => {
    await expect(runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: MON_1030, endAt: MON_1130 })))
      .rejects.toBeInstanceOf(OverlapError);
  });

  it("citas consecutivas NO chocan (rango '[)')", async () => {
    // 11:00-12:00 local justo después de la 10:00-11:00 existente
    const { appointmentId } = await runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: MON_11, endAt: "2030-01-07T18:00:00Z" }));
    expect(appointmentId).toBeTruthy();
  });

  it("solapamiento CONCURRENTE: solo una gana", async () => {
    const S = "2030-01-07T22:00:00Z", E = "2030-01-07T23:00:00Z"; // 16:00-17:00 local, libre
    const results = await Promise.allSettled([
      runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: S, endAt: E })),
      runA((e) => createAppointment(e, frontCtxA, { professionalResourceId: prof, startAt: S, endAt: E })),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.filter((r) => r.status === "rejected").length;
    expect(ok).toBe(1);
    expect(fail).toBe(1);
  });
});

describe("Transiciones", () => {
  it("confirmar solo desde SCHEDULED", async () => {
    const { appointmentId } = await runA((e) => createAppointment(e, ownerCtxA, { professionalResourceId: prof, startAt: "2030-01-14T16:00:00Z", endAt: "2030-01-14T17:00:00Z" }));
    await runA((e) => confirmAppointment(e, ownerCtxA, appointmentId));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "appointments" WHERE "id"=$1`, [appointmentId]))[0].status);
    expect(st).toBe("CONFIRMED");
    await expect(runA((e) => confirmAppointment(e, ownerCtxA, appointmentId))).rejects.toBeInstanceOf(TransitionError);
  });

  it("reagenda no destructiva: original RESCHEDULED + nueva enlazada", async () => {
    const { appointmentId } = await runA((e) => createAppointment(e, ownerCtxA, { professionalResourceId: prof, startAt: "2030-01-21T16:00:00Z", endAt: "2030-01-21T17:00:00Z" }));
    const res = await runA((e) => rescheduleAppointment(e, ownerCtxA, { appointmentId, startAt: "2030-01-21T20:00:00Z", endAt: "2030-01-21T21:00:00Z" }));
    expect(res.rescheduledFromId).toBe(appointmentId);
    const orig = await runA(async (e) => (await e(`SELECT "status" FROM "appointments" WHERE "id"=$1`, [appointmentId]))[0].status);
    const nu = await runA(async (e) => (await e(`SELECT "status","rescheduledFromId" FROM "appointments" WHERE "id"=$1`, [res.appointmentId]))[0]);
    expect(orig).toBe("RESCHEDULED");
    expect(nu.status).toBe("SCHEDULED");
    expect(nu.rescheduledFromId).toBe(appointmentId);
  });

  it("cancelar audita durable", async () => {
    const { appointmentId } = await runA((e) => createAppointment(e, ownerCtxA, { professionalResourceId: prof, startAt: "2030-01-28T16:00:00Z", endAt: "2030-01-28T17:00:00Z" }));
    await runA((e) => cancelAppointment(e, ownerCtxA, appointmentId, "paciente canceló"));
    const aud = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='appointment.canceled' AND "entityId"=$1`, [appointmentId]))[0].count));
    expect(aud).toBeGreaterThanOrEqual(1);
  });

  it("no-show solo si startAt ya pasó (ajuste D)", async () => {
    // futura → rechazada
    const { appointmentId: fut } = await runA((e) => createAppointment(e, ownerCtxA, { professionalResourceId: prof, startAt: "2030-02-04T16:00:00Z", endAt: "2030-02-04T17:00:00Z" }));
    await expect(runA((e) => markNoShow(e, ownerCtxA, fut))).rejects.toBeInstanceOf(TransitionError);
    // pasada (insertada por admin, sin pasar por disponibilidad) → permitida
    const pastId = (await adminPool.query(
      `INSERT INTO "appointments"("organizationId","professionalResourceId","startAt","endAt","status","source","createdBy")
       VALUES ($1,$2, now()-interval '2 hours', now()-interval '1 hour','SCHEDULED','MANUAL',$3) RETURNING id`,
      [orgA, prof, ownerCtxA.userId])).rows[0].id;
    await runA((e) => markNoShow(e, ownerCtxA, pastId));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "appointments" WHERE "id"=$1`, [pastId]))[0].status);
    expect(st).toBe("NO_SHOW");
  });

  it("completar solo desde activa (ajuste E)", async () => {
    const pastId = (await adminPool.query(
      `INSERT INTO "appointments"("organizationId","professionalResourceId","startAt","endAt","status","source","createdBy")
       VALUES ($1,$2, now()-interval '4 hours', now()-interval '3 hours','CONFIRMED','MANUAL',$3) RETURNING id`,
      [orgA, prof, ownerCtxA.userId])).rows[0].id;
    await runA((e) => completeAppointment(e, ownerCtxA, pastId));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "appointments" WHERE "id"=$1`, [pastId]))[0].status);
    expect(st).toBe("COMPLETED");
    await expect(runA((e) => completeAppointment(e, ownerCtxA, pastId))).rejects.toBeInstanceOf(TransitionError);
  });

  it("clinician PUEDE completar (ajuste RBAC: appointments.complete)", async () => {
    const pastId = (await adminPool.query(
      `INSERT INTO "appointments"("organizationId","professionalResourceId","startAt","endAt","status","source","createdBy")
       VALUES ($1,$2, now()-interval '6 hours', now()-interval '5 hours','CONFIRMED','MANUAL',$3) RETURNING id`,
      [orgA, prof, ownerCtxA.userId])).rows[0].id;
    await runA((e) => completeAppointment(e, clinicianCtxA, pastId));
    const st = await runA(async (e) => (await e(`SELECT "status" FROM "appointments" WHERE "id"=$1`, [pastId]))[0].status);
    expect(st).toBe("COMPLETED");
  });
});

describe("Desde conversación / same-org / enforcement", () => {
  it("createAppointmentFromConversation liga conv + action_log + sin paciente", async () => {
    const ch = (await adminPool.query(`INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WHATSAPP','+520000000099') RETURNING id`, [orgA])).rows[0].id;
    const conv = (await runA((e) => ingestInboundMessage(e, { organizationId: orgA, channelId: ch, externalId: `c-${rnd()}`, fromKind: "WHATSAPP", fromRawValue: "+525599887766", body: "quiero cita" }))).conversationId;
    const { appointmentId } = await runA((e) => createAppointmentFromConversation(e, frontCtxA, { conversationId: conv, professionalResourceId: prof, startAt: "2030-02-11T16:00:00Z", endAt: "2030-02-11T17:00:00Z" }));
    const a = await runA(async (e) => (await e(`SELECT "conversationId","source","patientId" FROM "appointments" WHERE "id"=$1`, [appointmentId]))[0]);
    expect(a.conversationId).toBe(conv);
    expect(a.source).toBe("FROM_CONVERSATION");
    expect(a.patientId).toBeNull(); // no crea paciente
    const log = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "conversation_action_log" WHERE "conversationId"=$1 AND "actionType"='APPOINTMENT_CREATED'`, [conv]))[0].count));
    expect(log).toBeGreaterThanOrEqual(1);
  });

  it("ajuste F: cita en orgA con patientId de orgB → OrgRefError", async () => {
    const cB = (await adminPool.query(`INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'X') RETURNING id`, [orgB])).rows[0].id;
    const pB = (await adminPool.query(`INSERT INTO "patients"("organizationId","contactId") VALUES ($1,$2) RETURNING id`, [orgB, cB])).rows[0].id;
    await expect(runA((e) => createAppointment(e, ownerCtxA, { patientId: pB, professionalResourceId: prof, startAt: "2030-02-18T16:00:00Z", endAt: "2030-02-18T17:00:00Z" })))
      .rejects.toBeInstanceOf(OrgRefError);
  });

  it("clinician NO puede crear cita (rechazo durable + sin cambios)", async () => {
    const before = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "appointments"`, []))[0].count));
    await expect(guardConfigOperation(runA, clinicianCtxA, "appointments.create", (e) => createAppointment(e, clinicianCtxA, { professionalResourceId: prof, startAt: "2030-02-25T16:00:00Z", endAt: "2030-02-25T17:00:00Z" })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    const after = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "appointments"`, []))[0].count));
    expect(after).toBe(before);
  });

  it("front_desk NO puede availability.manage; SÍ puede schedule.block (auditado)", async () => {
    await expect(guardConfigOperation(runA, frontCtxA, "availability.manage", (e) => setAvailabilityRule(e, frontCtxA, { resourceId: prof, weekday: 2, startMinute: 540, endMinute: 1080 })))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    const { blockId } = await runA((e) => blockSchedule(e, frontCtxA, { resourceId: prof, startAt: "2030-03-04T16:00:00Z", endAt: "2030-03-04T18:00:00Z", reason: "junta" }));
    const aud = Number(await runA(async (e) => (await e(`SELECT count(*) FROM "audit_logs" WHERE action='schedule.blocked' AND "entityId"=$1`, [blockId]))[0].count));
    expect(aud).toBeGreaterThanOrEqual(1);
  });

  it("linkedUserId no-miembro → LinkedUserError (boundary admin)", async () => {
    const ghost = (await adminPool.query(`INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`, [`ghost-${rnd()}@t.test`])).rows[0].id;
    await expect(createResourceWithLinkedUserCheck(identityQuery, runA, ownerCtxA, { kind: "PROFESSIONAL", name: "Dr. Y", linkedUserId: ghost }))
      .rejects.toBeInstanceOf(LinkedUserError);
  });

  it("Zod: rango inválido (endAt<=startAt) rechazado", async () => {
    await expect(runA((e) => createAppointment(e, ownerCtxA, { professionalResourceId: prof, startAt: MON_11, endAt: MON_10 })))
      .rejects.toThrow(/Validación 4A/);
  });
});

describe("RLS y resolver", () => {
  it("org B no ve appointments/resources/rules/blocks de A", async () => {
    for (const t of ["appointments", "resources", "availability_rules", "schedule_blocks"]) {
      const seen = await forTenantPg(orgB, async (c) => (await c.query(`SELECT id FROM "${t}" WHERE "organizationId"=$1`, [orgA])).rows);
      expect(seen.length).toBe(0);
    }
  });

  it("resolveAvailability calcula huecos libres", () => {
    const free = resolveAvailability({ rules: [{ start: 540, end: 1080 }], busy: [{ start: 600, end: 660 }, { start: 840, end: 900 }] });
    expect(free).toEqual([{ start: 540, end: 600 }, { start: 660, end: 840 }, { start: 900, end: 1080 }]);
  });

  it("resolveAvailability parte en slots", () => {
    const slots = resolveAvailability({ rules: [{ start: 540, end: 660 }], busy: [], slotMinutes: 30 });
    expect(slots).toEqual([{ start: 540, end: 570 }, { start: 570, end: 600 }, { start: 600, end: 630 }, { start: 630, end: 660 }]);
  });
});
