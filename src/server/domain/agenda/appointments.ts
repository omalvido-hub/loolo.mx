// LOOLO — Operaciones de Agenda (Fase 4A). Tenant-scoped (app_user/RLS).
// Anti-solapamiento real lo garantiza la BD (EXCLUDE gist); aquí mapeamos el error a OverlapError.
// Disponibilidad: dentro de availability_rules del profesional (en su timezone) y sin schedule_blocks.
// Same-org (ajuste F): toda referencia debe existir bajo RLS de la org actual (fail-closed).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { parseOrThrow, CreateAppointmentInputZ, RescheduleInputZ } from "./schemas.js";

export class OverlapError extends Error { constructor(m = "El recurso ya tiene una cita activa que se solapa.") { super(m); this.name = "OverlapError"; } }
export class NotAvailableError extends Error { constructor(m: string) { super(m); this.name = "NotAvailableError"; } }
export class TransitionError extends Error { constructor(m: string) { super(m); this.name = "TransitionError"; } }
export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }

const ACTIVE = ["SCHEDULED", "CONFIRMED"];

async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}

// Ajuste F: cada referencia provista debe existir en la org actual (RLS la limita).
async function assertSameOrg(exec: Exec, table: string, id: string | undefined, label: string) {
  if (!id) return;
  const r = await exec(`SELECT 1 FROM "${table}" WHERE "id"=$1`, [id]);
  if (r.length === 0) throw new OrgRefError(`${label} no pertenece a la organización (fail-closed).`);
}

// Disponibilidad del profesional: dentro de una regla activa (en su timezone) y sin bloqueo.
async function assertAvailable(exec: Exec, professionalResourceId: string | undefined, startAt: Date, endAt: Date) {
  if (!professionalResourceId) return; // 4A: disponibilidad se exige al profesional
  const rows = await exec(
    `SELECT
       (SELECT EXISTS(
          SELECT 1 FROM "availability_rules" ar JOIN "resources" rr ON rr."id"=ar."resourceId"
          WHERE ar."resourceId"=$1 AND ar."active"
            AND ar."weekday" = EXTRACT(DOW FROM ($2::timestamptz AT TIME ZONE rr."timezone"))::int
            AND ar."startMinute" <= (EXTRACT(HOUR FROM ($2::timestamptz AT TIME ZONE rr."timezone"))*60 + EXTRACT(MINUTE FROM ($2::timestamptz AT TIME ZONE rr."timezone")))
            AND ar."endMinute"   >= (EXTRACT(HOUR FROM ($3::timestamptz AT TIME ZONE rr."timezone"))*60 + EXTRACT(MINUTE FROM ($3::timestamptz AT TIME ZONE rr."timezone")))
            AND date_trunc('day', $2::timestamptz AT TIME ZONE rr."timezone") = date_trunc('day', $3::timestamptz AT TIME ZONE rr."timezone")
       )) AS within,
       (SELECT EXISTS(
          SELECT 1 FROM "schedule_blocks" sb
          WHERE sb."resourceId"=$1
            AND tstzrange(sb."startAt", sb."endAt", '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
       )) AS blocked`,
    [professionalResourceId, startAt.toISOString(), endAt.toISOString()],
  );
  const { within, blocked } = rows[0];
  if (!within) throw new NotAvailableError("Fuera de la disponibilidad del profesional.");
  if (blocked) throw new NotAvailableError("El horario está bloqueado para ese recurso.");
}

function mapOverlap(e: any): never {
  if (e && e.code === "23P01") throw new OverlapError();
  throw e;
}

async function insertAppointment(exec: Exec, organizationId: string, userId: string, input: any, source: string, rescheduledFromId: string | null) {
  await assertSameOrg(exec, "contacts", input.contactId, "contactId");
  await assertSameOrg(exec, "patients", input.patientId, "patientId");
  await assertSameOrg(exec, "conversations", input.conversationId, "conversationId");
  await assertSameOrg(exec, "opportunities", input.opportunityId, "opportunityId");
  await assertSameOrg(exec, "resources", input.professionalResourceId, "professionalResourceId");
  await assertSameOrg(exec, "resources", input.chairResourceId, "chairResourceId");
  await assertAvailable(exec, input.professionalResourceId, input.startAt, input.endAt);
  try {
    const row = (await exec(
      `INSERT INTO "appointments"
        ("organizationId","contactId","patientId","conversationId","opportunityId",
         "professionalResourceId","chairResourceId","startAt","endAt","status","source","reason","rescheduledFromId","createdBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SCHEDULED',$10,$11,$12,$13) RETURNING "id"`,
      [organizationId, input.contactId ?? null, input.patientId ?? null, input.conversationId ?? null, input.opportunityId ?? null,
        input.professionalResourceId ?? null, input.chairResourceId ?? null, input.startAt.toISOString(), input.endAt.toISOString(),
        source, input.reason ?? null, rescheduledFromId, userId],
    ))[0];
    return row.id as string;
  } catch (e) { mapOverlap(e); }
}

export async function createAppointment(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "appointments.create");
  const input = parseOrThrow(CreateAppointmentInputZ, raw);
  const id = await insertAppointment(exec, ctx.organizationId, ctx.userId, input, "MANUAL", null);
  await emit(exec, ctx.organizationId, "appointment.scheduled", { appointmentId: id, startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString() });
  return { appointmentId: id };
}

// Ajuste C: desde conversación. Liga conversationId, source=FROM_CONVERSATION, registra action_log, no crea paciente.
export async function createAppointmentFromConversation(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "appointments.create");
  const input = parseOrThrow(CreateAppointmentInputZ, raw);
  if (!input.conversationId) throw new Error("createAppointmentFromConversation requiere conversationId.");
  const id = await insertAppointment(exec, ctx.organizationId, ctx.userId, input, "FROM_CONVERSATION", null);
  await emit(exec, ctx.organizationId, "appointment.scheduled", { appointmentId: id, startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString() });
  await exec(
    `INSERT INTO "conversation_action_log"("organizationId","conversationId","actorUserId","actionType","note")
     VALUES ($1,$2,$3,'APPOINTMENT_CREATED',$4)`,
    [ctx.organizationId, input.conversationId, ctx.userId, `appointment:${id}`],
  );
  return { appointmentId: id };
}

async function loadAppt(exec: Exec, organizationId: string, id: string) {
  const a = (await exec(`SELECT * FROM "appointments" WHERE "id"=$1 AND "organizationId"=$2`, [id, organizationId]))[0];
  if (!a) throw new Error(`Cita no encontrada: ${id}`);
  return a;
}

export async function confirmAppointment(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "appointments.confirm");
  const a = await loadAppt(exec, ctx.organizationId, id);
  if (a.status !== "SCHEDULED") throw new TransitionError(`Solo se confirma una cita SCHEDULED (actual: ${a.status}).`);
  await exec(`UPDATE "appointments" SET "status"='CONFIRMED', "updatedAt"=now() WHERE "id"=$1`, [id]);
  await emit(exec, ctx.organizationId, "appointment.confirmed", { appointmentId: id });
}

export async function rescheduleAppointment(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "appointments.reschedule");
  const input = parseOrThrow(RescheduleInputZ, raw);
  const a = await loadAppt(exec, ctx.organizationId, input.appointmentId);
  if (!ACTIVE.includes(a.status)) throw new TransitionError(`Solo se reagenda una cita activa (actual: ${a.status}).`);
  // No destructivo: marca original RESCHEDULED (libera el hueco) y crea nueva enlazada.
  await exec(`UPDATE "appointments" SET "status"='RESCHEDULED', "updatedAt"=now() WHERE "id"=$1`, [input.appointmentId]);
  const newId = await insertAppointment(exec, ctx.organizationId, ctx.userId, {
    contactId: a.contactId, patientId: a.patientId, conversationId: a.conversationId, opportunityId: a.opportunityId,
    professionalResourceId: a.professionalResourceId, chairResourceId: a.chairResourceId,
    startAt: input.startAt, endAt: input.endAt, reason: a.reason,
  }, a.source, input.appointmentId);
  await emit(exec, ctx.organizationId, "appointment.rescheduled", { appointmentId: newId, rescheduledFromId: input.appointmentId });
  return { appointmentId: newId, rescheduledFromId: input.appointmentId };
}

export async function cancelAppointment(exec: Exec, ctx: ActorContext, id: string, reason?: string) {
  authorize(ctx, "appointments.cancel");
  const a = await loadAppt(exec, ctx.organizationId, id);
  if (!ACTIVE.includes(a.status)) throw new TransitionError(`Solo se cancela una cita activa (actual: ${a.status}).`);
  await exec(`UPDATE "appointments" SET "status"='CANCELED', "canceledAt"=now(), "canceledByUserId"=$2, "cancelReason"=$3, "updatedAt"=now() WHERE "id"=$1`, [id, ctx.userId, reason ?? null]);
  await emit(exec, ctx.organizationId, "appointment.canceled", { appointmentId: id });
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "appointment.canceled", entityType: "appointment", entityId: id, metadata: { reason: reason ?? null } });
}

export async function markNoShow(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "appointments.mark_no_show");
  const a = await loadAppt(exec, ctx.organizationId, id);
  if (!ACTIVE.includes(a.status)) throw new TransitionError(`Solo no-show desde activa (actual: ${a.status}).`);
  // Ajuste D: solo si startAt ya pasó.
  const startPassed = (await exec(`SELECT ($1::timestamptz < now()) AS passed`, [new Date(a.startAt).toISOString()]))[0].passed;
  if (!startPassed) throw new TransitionError("No-show solo permitido si startAt ya pasó.");
  await exec(`UPDATE "appointments" SET "status"='NO_SHOW', "noShowAt"=now(), "updatedAt"=now() WHERE "id"=$1`, [id]);
  await emit(exec, ctx.organizationId, "appointment.no_show", { appointmentId: id });
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "appointment.no_show", entityType: "appointment", entityId: id, metadata: {} });
}

export async function completeAppointment(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "appointments.complete");
  const a = await loadAppt(exec, ctx.organizationId, id);
  if (!ACTIVE.includes(a.status)) throw new TransitionError(`Solo se completa desde SCHEDULED/CONFIRMED (actual: ${a.status}).`);
  await exec(`UPDATE "appointments" SET "status"='COMPLETED', "completedAt"=now(), "updatedAt"=now() WHERE "id"=$1`, [id]);
  await emit(exec, ctx.organizationId, "appointment.completed", { appointmentId: id });
}
