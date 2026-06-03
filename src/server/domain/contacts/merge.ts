// LOOLO — Fusion de contactos (Fase 3A). Manual, con permiso DEDICADO (contacts.merge),
// transaccional, auditada. Atomicidad: el throw provoca ROLLBACK y NO mueve nada parcial.
// Bloqueos (politica v1 conservadora): paciente en el absorbido, o conflicto ACTIVO de
// prospect/opportunity en ambos → MergeBlockedError. El bloqueo se audita de forma DURABLE
// via performMerge (en su propia tx), porque auditar dentro de la tx que aborta se revierte.

import { validateEvent } from "../events/schemas.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import { authorize, PermissionDeniedError } from "../identity/authorize.js";
import { can } from "../identity/permissions.js";
import type { Exec, ActorContext, TenantRunner } from "../identity/authorize.js";

export type MergeBlockCode = "SAME_CONTACT" | "NOT_FOUND" | "PATIENT_PRESENT" | "CONTACT_MERGE_CONFLICT";

export class MergeBlockedError extends Error {
  constructor(public readonly code: MergeBlockCode, msg: string) {
    super(msg); this.name = "MergeBlockedError";
  }
}

export interface MergeInput {
  survivorId: string;
  mergedId: string;
  reason?: string;
}

async function hasActiveProspect(exec: Exec, organizationId: string, contactId: string): Promise<boolean> {
  const r = await exec(`SELECT 1 FROM "prospects" WHERE "organizationId"=$1 AND "contactId"=$2 AND "status"='ACTIVE' LIMIT 1`, [organizationId, contactId]);
  return r.length > 0;
}
// "opportunity activa" = etapa abierta (ni WON ni LOST).
async function hasActiveOpportunity(exec: Exec, organizationId: string, contactId: string): Promise<boolean> {
  const r = await exec(`SELECT 1 FROM "opportunities" WHERE "organizationId"=$1 AND "contactId"=$2 AND "stage" NOT IN ('WON','LOST') LIMIT 1`, [organizationId, contactId]);
  return r.length > 0;
}

export async function mergeContacts(exec: Exec, ctx: ActorContext, input: MergeInput) {
  authorize(ctx, "contacts.merge"); // permiso DEDICADO (no contacts.manage)
  const { organizationId, userId } = ctx;
  const { survivorId, mergedId, reason } = input;

  if (survivorId === mergedId) throw new MergeBlockedError("SAME_CONTACT", "survivor y merged no pueden ser el mismo contacto.");

  const both = await exec(`SELECT "id" FROM "contacts" WHERE "id" IN ($1,$2)`, [survivorId, mergedId]);
  if (both.length !== 2) throw new MergeBlockedError("NOT_FOUND", "Ambos contactos deben existir en la organización.");

  // Bloqueo 1: el ABSORBIDO tiene paciente/dato clinico.
  const mergedPatient = (await exec(`SELECT "id" FROM "patients" WHERE "organizationId"=$1 AND "contactId"=$2 LIMIT 1`, [organizationId, mergedId]))[0];
  if (mergedPatient) throw new MergeBlockedError("PATIENT_PRESENT", "El contacto a absorber tiene paciente/dato clínico; merge bloqueado (resolución manual).");

  // Bloqueo 2: CONFLICTO ACTIVO de prospect u opportunity en AMBOS (v1: bloquear, no re-apuntar).
  if (await hasActiveProspect(exec, organizationId, survivorId) && await hasActiveProspect(exec, organizationId, mergedId)) {
    throw new MergeBlockedError("CONTACT_MERGE_CONFLICT", "Ambos contactos tienen prospect ACTIVE: conflicto, requiere resolución humana.");
  }
  if (await hasActiveOpportunity(exec, organizationId, survivorId) && await hasActiveOpportunity(exec, organizationId, mergedId)) {
    throw new MergeBlockedError("CONTACT_MERGE_CONFLICT", "Ambos contactos tienen opportunity ACTIVE: conflicto, requiere resolución humana.");
  }

  // Re-apuntar registros NO clinicos y NO conflictivos del absorbido al sobreviviente.
  await exec(`UPDATE "contact_identifiers" SET "contactId"=$1, "updatedAt"=now() WHERE "contactId"=$2 AND "organizationId"=$3`, [survivorId, mergedId, organizationId]);
  await exec(`UPDATE "conversations"       SET "contactId"=$1, "updatedAt"=now() WHERE "contactId"=$2 AND "organizationId"=$3`, [survivorId, mergedId, organizationId]);
  await exec(`UPDATE "prospects"           SET "contactId"=$1, "updatedAt"=now() WHERE "contactId"=$2 AND "organizationId"=$3`, [survivorId, mergedId, organizationId]);
  await exec(`UPDATE "opportunities"       SET "contactId"=$1, "updatedAt"=now() WHERE "contactId"=$2 AND "organizationId"=$3`, [survivorId, mergedId, organizationId]);

  await exec(`UPDATE "contacts" SET "mergedIntoId"=$1, "state"='ARCHIVED', "archivedAt"=now(), "updatedAt"=now() WHERE "id"=$2`, [survivorId, mergedId]);
  await exec(`INSERT INTO "contact_merges"("organizationId","survivorId","mergedId","mergedBy","reason") VALUES ($1,$2,$3,$4,$5)`, [organizationId, survivorId, mergedId, userId, reason ?? null]);

  const ev = validateEvent("contact.merged", { survivorId, mergedId });
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`, [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "contact.merged", entityType: "contact", entityId: survivorId, metadata: { survivorId, mergedId, reason } });

  return { survivorId, mergedId };
}

/**
 * Punto de entrada del merge con auditoria DURABLE en el LIMITE transaccional:
 *  - sin contacts.merge → audita permission.denied (su propia tx) + lanza.
 *  - si mergeContacts bloquea → audita contact.merge_blocked (su propia tx) + relanza.
 *  - si completa → commitea (incluye contact.merged).
 * Atomicidad del movimiento: mergeContacts corre en una sola tx (run); cualquier throw revierte.
 */
export async function performMerge(run: TenantRunner, ctx: ActorContext, input: MergeInput) {
  if (!can(ctx.permissions, "contacts.merge")) {
    await run((e) => recordPermissionDenied(e, { organizationId: ctx.organizationId, actorUserId: ctx.userId, permission: "contacts.merge" }));
    throw new PermissionDeniedError("contacts.merge");
  }
  try {
    return await run((e) => mergeContacts(e, ctx, input));
  } catch (err) {
    if (err instanceof MergeBlockedError) {
      await run((e) => recordAudit(e, {
        organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
        action: "contact.merge_blocked", entityType: "contact", entityId: input.mergedId,
        metadata: { survivorId: input.survivorId, mergedId: input.mergedId, code: err.code, reason: err.message },
      }));
    }
    throw err;
  }
}
