// NELZZON — Recursos, disponibilidad y bloqueos (Fase 4A).
// resources.manage / availability.manage → solo owner/admin (enforcement).
// schedule.block → permitido a front_desk, SIEMPRE auditado (ajuste B).
// linkedUserId validado en boundary admin (patrón 3B), opcional.

import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import { authorize, PermissionDeniedError } from "../identity/authorize.js";
import { can } from "../identity/permissions.js";
import type { Exec, ActorContext, TenantRunner } from "../identity/authorize.js";
import { parseOrThrow, CreateResourceInputZ, AvailabilityRuleInputZ, ScheduleBlockInputZ } from "./schemas.js";

export type IdentityQuery = (text: string, params: unknown[]) => Promise<any[]>;
export class LinkedUserError extends Error { constructor(m: string) { super(m); this.name = "LinkedUserError"; } }

export async function createResource(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "resources.manage");
  const input = parseOrThrow(CreateResourceInputZ, raw);
  const row = (await exec(
    `INSERT INTO "resources"("organizationId","kind","name","linkedUserId","timezone")
     VALUES ($1,$2,$3,$4,COALESCE($5,'America/Mexico_City')) RETURNING "id"`,
    [ctx.organizationId, input.kind, input.name, input.linkedUserId ?? null, input.timezone ?? null],
  ))[0];
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "resource.created", entityType: "resource", entityId: row.id, metadata: { kind: input.kind } });
  return { resourceId: row.id };
}

/** linkedUserId validado en boundary admin (no app_user). Si no es miembro → fail-closed. */
export async function createResourceWithLinkedUserCheck(identity: IdentityQuery, run: TenantRunner, ctx: ActorContext, raw: unknown) {
  const input = parseOrThrow(CreateResourceInputZ, raw);
  if (!can(ctx.permissions, "resources.manage")) {
    await run((e: Exec) => recordPermissionDenied(e, { organizationId: ctx.organizationId, actorUserId: ctx.userId, permission: "resources.manage" }));
    throw new PermissionDeniedError("resources.manage");
  }
  if (input.linkedUserId) {
    const member = await identity(`SELECT 1 FROM "organization_memberships" WHERE "organizationId"=$1 AND "userId"=$2 LIMIT 1`, [ctx.organizationId, input.linkedUserId]);
    if (member.length === 0) throw new LinkedUserError("linkedUserId no es miembro de la organización (fail-closed).");
  }
  return run((e: Exec) => createResource(e, ctx, input));
}

export async function setAvailabilityRule(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "availability.manage");
  const input = parseOrThrow(AvailabilityRuleInputZ, raw);
  const r = await exec(`SELECT 1 FROM "resources" WHERE "id"=$1`, [input.resourceId]);
  if (r.length === 0) throw new Error("resourceId no pertenece a la organización.");
  const row = (await exec(
    `INSERT INTO "availability_rules"("organizationId","resourceId","weekday","startMinute","endMinute")
     VALUES ($1,$2,$3,$4,$5) RETURNING "id"`,
    [ctx.organizationId, input.resourceId, input.weekday, input.startMinute, input.endMinute],
  ))[0];
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "availability.set", entityType: "availability_rule", entityId: row.id, metadata: { resourceId: input.resourceId, weekday: input.weekday } });
  return { ruleId: row.id };
}

// schedule.block: front_desk permitido, SIEMPRE auditado (ajuste B).
export async function blockSchedule(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "schedule.block");
  const input = parseOrThrow(ScheduleBlockInputZ, raw);
  const r = await exec(`SELECT 1 FROM "resources" WHERE "id"=$1`, [input.resourceId]);
  if (r.length === 0) throw new Error("resourceId no pertenece a la organización.");
  const row = (await exec(
    `INSERT INTO "schedule_blocks"("organizationId","resourceId","startAt","endAt","reason","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING "id"`,
    [ctx.organizationId, input.resourceId, input.startAt.toISOString(), input.endAt.toISOString(), input.reason ?? null, ctx.userId],
  ))[0];
  await recordAudit(exec, { organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
    action: "schedule.blocked", entityType: "schedule_block", entityId: row.id, metadata: { resourceId: input.resourceId } });
  return { blockId: row.id };
}
