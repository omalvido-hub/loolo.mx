// LOOLO — Promoción y oportunidad (Fase 3A). Promoción explícita (reglas 7 y 9), nunca automática.
// Idempotente: si ya existe paciente/prospecto ACTIVE para el contacto, devuelve el existente.

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";

async function emit(exec: Exec, organizationId: string, type: string, payload: unknown) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(`Evento inválido (${type}): ${ev.error}`);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}

export async function promoteToPatient(exec: Exec, ctx: ActorContext, contactId: string) {
  authorize(ctx, "patients.manage");
  const { organizationId, userId } = ctx;

  // Idempotente: paciente activo existente → devolver, no duplicar.
  const existing = (await exec(
    `SELECT "id" FROM "patients" WHERE "organizationId"=$1 AND "contactId"=$2 AND "status"='ACTIVE' LIMIT 1`,
    [organizationId, contactId]))[0];
  if (existing) return { patientId: existing.id, created: false };

  const p = (await exec(
    `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING "id"`,
    [organizationId, contactId]))[0];
  await emit(exec, organizationId, "contact.promoted_to_patient", { contactId, patientId: p.id });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "contact.promoted_to_patient", entityType: "patient", entityId: p.id, metadata: { contactId } });
  return { patientId: p.id, created: true };
}

export async function promoteToProspect(exec: Exec, ctx: ActorContext, contactId: string) {
  authorize(ctx, "prospects.manage");
  const { organizationId, userId } = ctx;
  const existing = (await exec(
    `SELECT "id" FROM "prospects" WHERE "organizationId"=$1 AND "contactId"=$2 AND "status"='ACTIVE' LIMIT 1`,
    [organizationId, contactId]))[0];
  if (existing) return { prospectId: existing.id, created: false };
  const p = (await exec(
    `INSERT INTO "prospects"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING "id"`,
    [organizationId, contactId]))[0];
  await emit(exec, organizationId, "contact.promoted_to_prospect", { contactId, prospectId: p.id });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "contact.promoted_to_prospect", entityType: "prospect", entityId: p.id, metadata: { contactId } });
  return { prospectId: p.id, created: true };
}

export interface CreateOpportunityInput {
  contactId: string;
  title: string;
  valueCents?: number | null;
}

export async function createOpportunity(exec: Exec, ctx: ActorContext, input: CreateOpportunityInput) {
  authorize(ctx, "opportunities.manage");
  const { organizationId, userId } = ctx;
  if (!input.title || input.title.trim().length === 0) throw new Error("La oportunidad requiere título.");
  const o = (await exec(
    `INSERT INTO "opportunities"("organizationId","contactId","title","stage","state","valueCents")
     VALUES ($1,$2,$3,'NEW','OK',$4) RETURNING "id"`,
    [organizationId, input.contactId, input.title, input.valueCents ?? null]))[0];
  await emit(exec, organizationId, "opportunity.created", { opportunityId: o.id, contactId: input.contactId });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "opportunity.created", entityType: "opportunity", entityId: o.id, metadata: { contactId: input.contactId } });
  return { opportunityId: o.id };
}
