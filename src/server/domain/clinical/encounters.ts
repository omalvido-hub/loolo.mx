// NELZZON — Operaciones de Consulta clínica (Fase 5A). Tenant-scoped (app_user/RLS).
// Datos de SALUD: acceso estrecho (authorize antes de escribir/leer), notas append-only,
// FINALIZED inmutable (ajuste A), eventos sin contenido (B), auditoría sin contenido (C),
// coherencia appointment↔paciente (D), profesional same-org (E), lectura auditada (decisión 5).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { parseOrThrow, CreateEncounterInputZ, UpdateEncounterInputZ, AddNoteInputZ } from "./schemas.js";

export class ClinicalNotFoundError extends Error { constructor(m: string) { super(m); this.name = "ClinicalNotFoundError"; } }
export class ClinicalTransitionError extends Error { constructor(m: string) { super(m); this.name = "ClinicalTransitionError"; } }
export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }
export class CoherenceError extends Error { constructor(m: string) { super(m); this.name = "CoherenceError"; } }

const EDITABLE = ["DRAFT", "IN_PROGRESS"];

async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}

// Auditoría SIN contenido clínico: solo IDs/actor/tipo de acceso (ajuste C, decisión 5).
async function audit(exec: Exec, ctx: ActorContext, action: string, encounterId: string, extra: Record<string, unknown> = {}) {
  await recordAudit(exec, {
    organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action, entityType: "clinical_encounter", entityId: encounterId, metadata: extra,
  });
}

async function loadEncounter(exec: Exec, organizationId: string, id: string) {
  const e = (await exec(`SELECT * FROM "clinical_encounters" WHERE "id"=$1 AND "organizationId"=$2`, [id, organizationId]))[0];
  if (!e) throw new ClinicalNotFoundError(`Consulta no encontrada: ${id}`);
  return e;
}

export async function createEncounter(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "clinical.create");
  const input = parseOrThrow(CreateEncounterInputZ, raw);
  // patientId obligatorio y same-org (RLS lo restringe; fail-closed)
  if ((await exec(`SELECT 1 FROM "patients" WHERE "id"=$1`, [input.patientId])).length === 0)
    throw new OrgRefError("patientId no pertenece a la organización (fail-closed).");
  // Coherencia appointment (ajuste D): misma org y mismo paciente
  if (input.appointmentId) {
    const a = (await exec(`SELECT "patientId" FROM "appointments" WHERE "id"=$1`, [input.appointmentId]))[0];
    if (!a) throw new OrgRefError("appointmentId no pertenece a la organización (fail-closed).");
    if (a.patientId !== input.patientId) throw new CoherenceError("El appointment no corresponde al mismo paciente.");
  }
  // Profesional opcional, same-org (ajuste E)
  if (input.professionalResourceId && (await exec(`SELECT 1 FROM "resources" WHERE "id"=$1`, [input.professionalResourceId])).length === 0)
    throw new OrgRefError("professionalResourceId no pertenece a la organización (fail-closed).");

  const id = (await exec(
    `INSERT INTO "clinical_encounters"
       ("organizationId","appointmentId","patientId","professionalResourceId","status","chiefComplaint","preliminaryDiagnosis","observations","indications","createdBy")
     VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,$7,$8,$9) RETURNING "id"`,
    [ctx.organizationId, input.appointmentId ?? null, input.patientId, input.professionalResourceId ?? null,
      input.chiefComplaint, input.preliminaryDiagnosis ?? null, input.observations ?? null, input.indications ?? null, ctx.userId],
  ))[0].id;
  await emit(exec, ctx.organizationId, "clinical.encounter_created", { encounterId: id, patientId: input.patientId });
  await audit(exec, ctx, "clinical.encounter_created", id, { patientId: input.patientId });
  return { encounterId: id };
}

export async function startEncounter(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "clinical.edit");
  const e = await loadEncounter(exec, ctx.organizationId, id);
  if (e.status !== "DRAFT") throw new ClinicalTransitionError(`Solo DRAFT→IN_PROGRESS (actual: ${e.status}).`);
  await exec(`UPDATE "clinical_encounters" SET "status"='IN_PROGRESS', "startedAt"=now(), "updatedAt"=now() WHERE "id"=$1`, [id]);
  await audit(exec, ctx, "clinical.encounter_started", id);
}

export async function updateEncounter(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "clinical.edit");
  const input = parseOrThrow(UpdateEncounterInputZ, raw);
  const e = await loadEncounter(exec, ctx.organizationId, input.encounterId);
  if (!EDITABLE.includes(e.status)) throw new ClinicalTransitionError(`Consulta no editable en estado ${e.status} (FINALIZED inmutable).`);
  await exec(
    `UPDATE "clinical_encounters" SET
       "chiefComplaint"=COALESCE($2,"chiefComplaint"),
       "preliminaryDiagnosis"=COALESCE($3,"preliminaryDiagnosis"),
       "observations"=COALESCE($4,"observations"),
       "indications"=COALESCE($5,"indications"),
       "updatedAt"=now()
     WHERE "id"=$1`,
    [input.encounterId, input.chiefComplaint ?? null, input.preliminaryDiagnosis ?? null, input.observations ?? null, input.indications ?? null],
  );
  await audit(exec, ctx, "clinical.encounter_edited", input.encounterId);
}

export async function addClinicalNote(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "clinical_notes.add");
  const input = parseOrThrow(AddNoteInputZ, raw);
  const e = await loadEncounter(exec, ctx.organizationId, input.encounterId);
  if (!EDITABLE.includes(e.status)) throw new ClinicalTransitionError(`No se agregan notas en estado ${e.status} (ajuste A: FINALIZED/CANCELED inmutables).`);
  const noteId = (await exec(
    `INSERT INTO "clinical_notes"("organizationId","encounterId","authorUserId","body") VALUES ($1,$2,$3,$4) RETURNING "id"`,
    [ctx.organizationId, input.encounterId, ctx.userId, input.body],
  ))[0].id;
  await audit(exec, ctx, "clinical.note_added", input.encounterId, { noteId }); // sin body
  return { noteId };
}

export async function finalizeEncounter(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "clinical.finalize");
  const e = await loadEncounter(exec, ctx.organizationId, id);
  if (!EDITABLE.includes(e.status)) throw new ClinicalTransitionError(`Solo se finaliza desde DRAFT/IN_PROGRESS (actual: ${e.status}).`);
  await exec(`UPDATE "clinical_encounters" SET "status"='FINALIZED', "finalizedAt"=now(), "finalizedByUserId"=$2, "updatedAt"=now() WHERE "id"=$1`, [id, ctx.userId]);
  await emit(exec, ctx.organizationId, "clinical.encounter_finalized", { encounterId: id });
  await audit(exec, ctx, "clinical.encounter_finalized", id);
}

export async function cancelEncounter(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "clinical.cancel");
  const e = await loadEncounter(exec, ctx.organizationId, id);
  if (!EDITABLE.includes(e.status)) throw new ClinicalTransitionError(`Solo se cancela desde DRAFT/IN_PROGRESS (actual: ${e.status}).`);
  await exec(`UPDATE "clinical_encounters" SET "status"='CANCELED', "canceledAt"=now(), "canceledByUserId"=$2, "updatedAt"=now() WHERE "id"=$1`, [id, ctx.userId]);
  await emit(exec, ctx.organizationId, "clinical.encounter_canceled", { encounterId: id });
  await audit(exec, ctx, "clinical.encounter_canceled", id);
}

// Lecturas: exigen clinical.view y AUDITAN clinical.viewed SIN contenido (decisión 5).
export async function getEncounter(exec: Exec, ctx: ActorContext, id: string) {
  authorize(ctx, "clinical.view");
  const e = await loadEncounter(exec, ctx.organizationId, id);
  const notes = await exec(`SELECT "id","authorUserId","body","createdAt" FROM "clinical_notes" WHERE "encounterId"=$1 ORDER BY "createdAt" ASC`, [id]);
  await audit(exec, ctx, "clinical.viewed", id, { patientId: e.patientId, accessType: "getEncounter" });
  return { encounter: e, notes };
}

export async function listEncountersForPatient(exec: Exec, ctx: ActorContext, patientId: string) {
  authorize(ctx, "clinical.view");
  const rows = await exec(
    `SELECT "id","status","chiefComplaint","preliminaryDiagnosis","observations","indications","finalizedAt","createdAt"
     FROM "clinical_encounters" WHERE "patientId"=$1 ORDER BY "createdAt" DESC`, [patientId]);
  // devuelve contenido clínico → auditar lectura (decisión 5), sin contenido en metadata
  await recordAudit(exec, {
    organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "clinical.viewed", entityType: "patient", entityId: patientId,
    metadata: { accessType: "listEncountersForPatient", count: rows.length },
  });
  return rows;
}
