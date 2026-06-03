// LOOLO — Ingesta de mensaje entrante + deduplicación de contacto (Fase 3A).
// Idempotencia por (org, channelId, externalId). Dedup por contact_identifiers (match EXACTO
// normalizado, sin fuzzy). NO crea paciente ni oportunidad (reglas 7 y 9). Sin IA.
// `conversationMessages` es el nombre conceptual; la tabla real es "messages".

import { validateEvent } from "../events/schemas.js";
import { normalizeIdentifier, type IdentifierKind } from "./normalize.js";

export type Exec = (text: string, params: unknown[]) => Promise<any[]>;

async function emit(exec: Exec, organizationId: string, type: string, payload: unknown) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(`Evento inválido (${type}): ${ev.error}`);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}

export interface ResolveContactInput {
  organizationId: string;
  kind: IdentifierKind;
  rawValue: string;
  fullName?: string | null;
  defaultCountry?: any;
}

/** Resuelve por identificador normalizado o crea contacto+identificador. Si no valida, crea contacto MISSING_DATA sin identificador. */
export async function resolveOrCreateContact(exec: Exec, input: ResolveContactInput) {
  const { organizationId, kind, rawValue, fullName } = input;
  const norm = normalizeIdentifier(kind, rawValue, input.defaultCountry ?? "MX");

  if (!norm) {
    // Fail-closed: no creamos identificador inválido. Contacto queda incompleto.
    const c = (await exec(
      `INSERT INTO "contacts"("organizationId","fullName","state") VALUES ($1,$2,'MISSING_DATA') RETURNING "id"`,
      [organizationId, fullName ?? null]))[0];
    return { contactId: c.id, created: true, identifierCreated: false, normalized: null };
  }

  const hit = (await exec(
    `SELECT "contactId" FROM "contact_identifiers" WHERE "organizationId"=$1 AND "kind"=$2 AND "valueNormalized"=$3`,
    [organizationId, kind, norm]))[0];
  if (hit) return { contactId: hit.contactId, created: false, identifierCreated: false, normalized: norm };

  const contact = (await exec(
    `INSERT INTO "contacts"("organizationId","fullName","state","primaryChannel") VALUES ($1,$2,'OK',$3) RETURNING "id"`,
    [organizationId, fullName ?? null, kind]))[0];
  await exec(
    `INSERT INTO "contact_identifiers"("organizationId","contactId","kind","valueNormalized") VALUES ($1,$2,$3,$4)`,
    [organizationId, contact.id, kind, norm]);
  // backfill columnas de conveniencia
  if (kind === "PHONE" || kind === "WHATSAPP") await exec(`UPDATE "contacts" SET "phoneNormalized"=$2 WHERE "id"=$1`, [contact.id, norm]);
  if (kind === "EMAIL") await exec(`UPDATE "contacts" SET "emailNormalized"=$2 WHERE "id"=$1`, [contact.id, norm]);

  return { contactId: contact.id, created: true, identifierCreated: true, normalized: norm };
}

export interface InboundMessageInput {
  organizationId: string;
  channelId: string;
  externalId?: string | null;
  fromKind: IdentifierKind;
  fromRawValue: string;
  body: string;
  fullName?: string | null;
}

export async function ingestInboundMessage(exec: Exec, input: InboundMessageInput) {
  const { organizationId, channelId, externalId, body } = input;

  // 1) Idempotencia por (org, canal, externalId)
  if (externalId) {
    const dup = (await exec(
      `SELECT "id","conversationId" FROM "messages" WHERE "organizationId"=$1 AND "channelId"=$2 AND "externalId"=$3`,
      [organizationId, channelId, externalId]))[0];
    if (dup) return { duplicate: true, messageId: dup.id, conversationId: dup.conversationId };
  }

  // 2) Contacto (dedup)
  const rc = await resolveOrCreateContact(exec, {
    organizationId, kind: input.fromKind, rawValue: input.fromRawValue, fullName: input.fullName,
  });

  // 3) Conversación abierta para (contacto, canal) o nueva
  let conv = (await exec(
    `SELECT "id" FROM "conversations"
      WHERE "organizationId"=$1 AND "contactId"=$2 AND "channelId"=$3 AND "status"='OPEN'
      ORDER BY "createdAt" DESC LIMIT 1`,
    [organizationId, rc.contactId, channelId]))[0];
  let convCreated = false;
  if (!conv) {
    conv = (await exec(
      `INSERT INTO "conversations"("organizationId","channelId","contactId","status","initialIntent")
       VALUES ($1,$2,$3,'OPEN','UNKNOWN') RETURNING "id"`,
      [organizationId, channelId, rc.contactId]))[0];
    convCreated = true;
  }

  // 4) Mensaje
  const msg = (await exec(
    `INSERT INTO "messages"("organizationId","conversationId","channelId","direction","senderType","body","externalId")
     VALUES ($1,$2,$3,'INBOUND','CONTACT',$4,$5) RETURNING "id"`,
    [organizationId, conv.id, channelId, body, externalId ?? null]))[0];

  // 5) lastMessageAt
  await exec(`UPDATE "conversations" SET "lastMessageAt"=now(), "updatedAt"=now() WHERE "id"=$1`, [conv.id]);

  // 6) Eventos operativos (NO paciente/oportunidad)
  if (rc.created) await emit(exec, organizationId, "contact.created", { contactId: rc.contactId, source: null });
  if (convCreated) await emit(exec, organizationId, "conversation.received", {
    conversationId: conv.id, channelId, channelType: "WHATSAPP", contactId: rc.contactId, messageId: msg.id,
  });
  await emit(exec, organizationId, "message.received", {
    messageId: msg.id, conversationId: conv.id, channelId, contactId: rc.contactId,
  });

  return { duplicate: false, contactId: rc.contactId, conversationId: conv.id, messageId: msg.id, contactCreated: rc.created };
}
