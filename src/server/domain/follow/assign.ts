// LOOLO — Asignación con validación de membresía en el LÍMITE (Opción A aprobada).
// La identidad (membresía) se valida con cliente ADMIN/identidad, NO con app_user
// (que no tiene acceso a organization_memberships). Los datos tenant se escriben con
// app_user/RLS dentro de `run`. Denegados auditados de forma DURABLE (tx propia).

import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import { PermissionDeniedError } from "../identity/authorize.js";
import { can } from "../identity/permissions.js";
import type { ActorContext, Exec, TenantRunner } from "../identity/authorize.js";
import { assignConversation } from "./inbox.js";
import { parseOrThrow, AssignInputZ } from "./schemas.js";

// Consulta de identidad (cliente admin). Devuelve filas.
export type IdentityQuery = (text: string, params: unknown[]) => Promise<any[]>;

export class AssignmentDeniedError extends Error {
  constructor(msg: string) { super(msg); this.name = "AssignmentDeniedError"; }
}

async function isActiveMember(identity: IdentityQuery, organizationId: string, userId: string): Promise<boolean> {
  const rows = await identity(
    `SELECT 1 FROM "organization_memberships" WHERE "organizationId"=$1 AND "userId"=$2 LIMIT 1`,
    [organizationId, userId],
  );
  return rows.length > 0;
}

/**
 * 1) capacidad conversations.assign (durable si falta);
 * 2) membresía del assignedToUserId en la MISMA org via identidad (fail-closed);
 * 3) si no es miembro → audita assignment.denied durable, NO toca conversation, NO emite evento;
 * 4) si todo ok → ejecuta assignConversation en la tx tenant.
 */
export async function assignConversationWithMembershipCheck(
  identity: IdentityQuery,
  run: TenantRunner,
  ctx: ActorContext,
  raw: unknown,
) {
  const input = parseOrThrow(AssignInputZ, raw);

  // (1) capacidad
  if (!can(ctx.permissions, "conversations.assign")) {
    await run((e: Exec) => recordPermissionDenied(e, { organizationId: ctx.organizationId, actorUserId: ctx.userId, permission: "conversations.assign" }));
    throw new PermissionDeniedError("conversations.assign");
  }

  // (2)(3) membresía via identidad (admin), NO via app_user
  const member = await isActiveMember(identity, ctx.organizationId, input.assignedToUserId);
  if (!member) {
    await run((e: Exec) => recordAudit(e, {
      organizationId: ctx.organizationId, actorUserId: ctx.userId, actorType: "USER",
      action: "assignment.denied", entityType: "conversation", entityId: input.conversationId,
      metadata: { assignedToUserId: input.assignedToUserId, reason: "not_member_of_org" },
    }));
    throw new AssignmentDeniedError("assignedToUserId no es miembro de la organización (fail-closed).");
  }

  // (4) ejecución real en tx tenant
  return run((e: Exec) => assignConversation(e, ctx, input));
}
