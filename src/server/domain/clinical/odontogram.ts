// LOOLO — Operaciones de Odontograma (Fase 5B). Tenant-scoped (app_user/RLS).
// Append-only (sin UPDATE/DELETE). Datos de salud: acceso estrecho, eventos/auditoría sin note.
// Hallazgos solo en consulta DRAFT/IN_PROGRESS (decisión 9). Corrección = supersede (decisión 4).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { parseOrThrow, RecordFindingInputZ, SupersedeFindingInputZ, checkSurfaceRule } from "./odontogram-schemas.js";
import { resolveOdontogram } from "./odontogram-resolver.js";

export class OrgRefError extends Error { constructor(m: string) { super(m); this.name = "OrgRefError"; } }
export class CoherenceError extends Error { constructor(m: string) { super(m); this.name = "CoherenceError"; } }
export class EncounterStateError extends Error { constructor(m: string) { super(m); this.name = "EncounterStateError"; } }
export class FindingNotFoundError extends Error { constructor(m: string) { super(m); this.name = "FindingNotFoundError"; } }

const OPEN_STATES = ["DRAFT", "IN_PROGRESS"];

async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}
async function audit(exec: Exec, ctx: ActorContext, action: string, entityType: string, entityId: string, extra: Record<string, unknown> = {}) {
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER", action, entityType, entityId, metadata: extra });
}

// Coherencia (ajuste C): paciente same-org, consulta same-org + mismo paciente + estado abierto (decisión 9).
async function assertEncounterOpenForPatient(exec: Exec, encounterId: string, patientId: string) {
  if ((await exec(`SELECT 1 FROM "patients" WHERE "id"=$1`, [patientId])).length === 0)
    throw new OrgRefError("patientId no pertenece a la organización (fail-closed).");
  const enc = (await exec(`SELECT "patientId","status" FROM "clinical_encounters" WHERE "id"=$1`, [encounterId]))[0];
  if (!enc) throw new OrgRefError("encounterId no pertenece a la organización (fail-closed).");
  if (enc.patientId !== patientId) throw new CoherenceError("La consulta no corresponde al mismo paciente.");
  if (!OPEN_STATES.includes(enc.status)) throw new EncounterStateError(`Solo se registran hallazgos en DRAFT/IN_PROGRESS (actual: ${enc.status}).`);
}

export async function recordFinding(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "odontogram.record");
  const input = parseOrThrow(RecordFindingInputZ, raw);
  checkSurfaceRule(input.findingType, input.surface);
  await assertEncounterOpenForPatient(exec, input.encounterId, input.patientId);
  const id = (await exec(
    `INSERT INTO "odontogram_findings"
       ("organizationId","patientId","encounterId","toothFdi","surface","findingType","toothStatus","note","recordedByUserId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING "id"`,
    [ctx.organizationId, input.patientId, input.encounterId, input.toothFdi, input.surface ?? null,
      input.findingType, input.toothStatus, input.note ?? null, ctx.userId],
  ))[0].id;
  await emit(exec, ctx.organizationId, "odontogram.finding_recorded",
    { findingId: id, patientId: input.patientId, encounterId: input.encounterId, toothFdi: input.toothFdi, findingType: input.findingType });
  await audit(exec, ctx, "odontogram.finding_recorded", "odontogram_finding", id, { patientId: input.patientId, toothFdi: input.toothFdi });
  return { findingId: id };
}

// Supersede (ajuste D): el previo no se modifica/borra; se inserta uno nuevo que lo reemplaza.
// Reglas: previo same-org + mismo paciente; corrección sobre la MISMA pieza/superficie; consulta vigente abierta.
export async function supersedeFinding(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "odontogram.record");
  const input = parseOrThrow(SupersedeFindingInputZ, raw);
  checkSurfaceRule(input.findingType, input.surface);
  const prior = (await exec(`SELECT "patientId","toothFdi","surface" FROM "odontogram_findings" WHERE "id"=$1`, [input.supersedesFindingId]))[0];
  if (!prior) throw new FindingNotFoundError("Hallazgo previo no encontrado en la organización (fail-closed).");
  await assertEncounterOpenForPatient(exec, input.encounterId, prior.patientId);
  if (input.toothFdi !== prior.toothFdi || (input.surface ?? null) !== (prior.surface ?? null))
    throw new CoherenceError("Una supersesión debe ser sobre la misma pieza/superficie del hallazgo previo.");
  const id = (await exec(
    `INSERT INTO "odontogram_findings"
       ("organizationId","patientId","encounterId","toothFdi","surface","findingType","toothStatus","note","supersedesFindingId","recordedByUserId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING "id"`,
    [ctx.organizationId, prior.patientId, input.encounterId, input.toothFdi, input.surface ?? null,
      input.findingType, input.toothStatus, input.note ?? null, input.supersedesFindingId, ctx.userId],
  ))[0].id;
  await emit(exec, ctx.organizationId, "odontogram.finding_superseded",
    { findingId: id, supersedesFindingId: input.supersedesFindingId, toothFdi: input.toothFdi });
  await audit(exec, ctx, "odontogram.finding_superseded", "odontogram_finding", id, { supersedesFindingId: input.supersedesFindingId, toothFdi: input.toothFdi });
  return { findingId: id };
}

// Lecturas: exigen odontogram.view y AUDITAN odontogram.viewed SIN contenido (ajuste A).
export async function getOdontogram(exec: Exec, ctx: ActorContext, patientId: string) {
  authorize(ctx, "odontogram.view");
  const rows = await exec(
    `SELECT "id","toothFdi","surface","findingType","toothStatus","supersedesFindingId","createdAt"
     FROM "odontogram_findings" WHERE "patientId"=$1 ORDER BY "createdAt" ASC`, [patientId]);
  await audit(exec, ctx, "odontogram.viewed", "patient", patientId, { accessType: "getOdontogram", count: rows.length });
  return resolveOdontogram(rows as any);
}

export async function listFindingsForEncounter(exec: Exec, ctx: ActorContext, encounterId: string) {
  authorize(ctx, "odontogram.view");
  const rows = await exec(
    `SELECT "id","toothFdi","surface","findingType","toothStatus","supersedesFindingId","createdAt"
     FROM "odontogram_findings" WHERE "encounterId"=$1 ORDER BY "createdAt" ASC`, [encounterId]);
  await audit(exec, ctx, "odontogram.viewed", "clinical_encounter", encounterId, { accessType: "listFindingsForEncounter", count: rows.length });
  return rows;
}
