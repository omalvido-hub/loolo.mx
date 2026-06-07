// NELZZON — Operaciones Follow operativo (Fase 3B). Tenant-scoped (app_user/RLS).
// Enforcement antes de escribir. Sin IA, sin automatismos, sin canal real.
// Tres bitácoras: events (reportable) / audit_logs (sensible) / conversation_action_log (humana).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize, PermissionDeniedError } from "../identity/authorize.js";
import { can } from "../identity/permissions.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import {
  parseOrThrow, AssignInputZ, ClassifyInputZ, PriorityInputZ, CloseInputZ, ReopenInputZ,
  CreateTaskInputZ, ExecuteActionInputZ,
} from "./schemas.js";

type ActionType = "ASSIGNED" | "CLASSIFIED" | "PRIORITY_CHANGED" | "CLOSED" | "REOPENED" | "SUGGESTED_ACTION";

async function logAction(exec: Exec, p: { organizationId: string; conversationId: string; actorUserId: string; actionType: ActionType; actionKey?: string; note?: string }) {
  await exec(
    `INSERT INTO "conversation_action_log"("organizationId","conversationId","actorUserId","actionType","actionKey","note")
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [p.organizationId, p.conversationId, p.actorUserId, p.actionType, p.actionKey ?? null, p.note ?? null],
  );
}
async function emit(exec: Exec, organizationId: string, type: string, payload: Record<string, unknown>) {
  const ev = validateEvent(type, payload);
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
}
async function requireConversation(exec: Exec, organizationId: string, conversationId: string) {
  const row = (await exec(`SELECT "id","status" FROM "conversations" WHERE "id"=$1 AND "organizationId"=$2`, [conversationId, organizationId]))[0];
  if (!row) throw new Error(`Conversación no encontrada: ${conversationId}`);
  return row;
}

/** assignConversation: SOLO debe invocarse cuando el boundary ya validó membresía (ver assign.ts). */
export async function assignConversation(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "conversations.assign");
  const input = parseOrThrow(AssignInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  await exec(`UPDATE "conversations" SET "assignedToUserId"=$1, "assignedAt"=now(), "updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
    [input.assignedToUserId, input.conversationId, organizationId]);
  await emit(exec, organizationId, "conversation.assigned", { conversationId: input.conversationId, assignedToUserId: input.assignedToUserId });
  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "ASSIGNED" });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "conversation.assigned", entityType: "conversation", entityId: input.conversationId, metadata: { assignedToUserId: input.assignedToUserId } });
}

export async function classifyConversation(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "conversations.classify");
  const input = parseOrThrow(ClassifyInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  await exec(`UPDATE "conversations" SET "category"=$1, "updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
    [input.category, input.conversationId, organizationId]);
  await emit(exec, organizationId, "conversation.classified", { conversationId: input.conversationId, category: input.category });
  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "CLASSIFIED", note: input.category });
}

// setPriority usa conversations.classify (ajuste B: no inflar permisos).
export async function setPriority(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "conversations.classify");
  const input = parseOrThrow(PriorityInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  await exec(`UPDATE "conversations" SET "priority"=$1, "updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
    [input.priority, input.conversationId, organizationId]);
  // cambio menor → solo trazabilidad humana, sin evento operativo.
  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "PRIORITY_CHANGED", note: input.priority });
}

export async function closeConversation(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "conversations.close");
  const input = parseOrThrow(CloseInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  await exec(`UPDATE "conversations" SET "status"='CLOSED', "closedAt"=now(), "closedByUserId"=$1, "updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
    [userId, input.conversationId, organizationId]);
  await emit(exec, organizationId, "conversation.closed", { conversationId: input.conversationId });
  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "CLOSED", note: input.note });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "conversation.closed", entityType: "conversation", entityId: input.conversationId, metadata: { note: input.note ?? null } });
}

export async function reopenConversation(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "conversations.close");
  const input = parseOrThrow(ReopenInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  await exec(`UPDATE "conversations" SET "status"='OPEN', "closedAt"=NULL, "closedByUserId"=NULL, "updatedAt"=now() WHERE "id"=$1 AND "organizationId"=$2`,
    [input.conversationId, organizationId]);
  await emit(exec, organizationId, "conversation.reopened", { conversationId: input.conversationId });
  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "REOPENED", note: input.note });
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "conversation.reopened", entityType: "conversation", entityId: input.conversationId, metadata: { note: input.note ?? null } });
}

export async function createTask(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "tasks.manage");
  const input = parseOrThrow(CreateTaskInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);
  const row = (await exec(
    `INSERT INTO "conversation_tasks"("organizationId","conversationId","contactId","title","dueAt","assignedToUserId","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "id"`,
    [organizationId, input.conversationId, input.contactId ?? null, input.title, input.dueAt ?? null, input.assignedToUserId ?? null, userId],
  ))[0];
  await emit(exec, organizationId, "task.created", { taskId: row.id, conversationId: input.conversationId });
  return { taskId: row.id };
}

export async function completeTask(exec: Exec, ctx: ActorContext, taskId: string) {
  authorize(ctx, "tasks.manage");
  const { organizationId, userId } = ctx;
  const t = (await exec(`SELECT "id" FROM "conversation_tasks" WHERE "id"=$1 AND "organizationId"=$2`, [taskId, organizationId]))[0];
  if (!t) throw new Error(`Tarea no encontrada: ${taskId}`);
  await exec(`UPDATE "conversation_tasks" SET "status"='DONE', "completedAt"=now(), "completedBy"=$1, "updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
    [userId, taskId, organizationId]);
  await emit(exec, organizationId, "task.completed", { taskId });
}

// cancelTask: cambio de estado, sin evento operativo (lean). Trazable por updatedAt/status.
export async function cancelTask(exec: Exec, ctx: ActorContext, taskId: string) {
  authorize(ctx, "tasks.manage");
  const { organizationId } = ctx;
  const t = (await exec(`SELECT "id" FROM "conversation_tasks" WHERE "id"=$1 AND "organizationId"=$2`, [taskId, organizationId]))[0];
  if (!t) throw new Error(`Tarea no encontrada: ${taskId}`);
  await exec(`UPDATE "conversation_tasks" SET "status"='CANCELLED', "updatedAt"=now() WHERE "id"=$1 AND "organizationId"=$2`,
    [taskId, organizationId]);
}

/**
 * executeSuggestedAction: INERTE. Valida actionKey en catálogo y el requiredPermission de la acción.
 * Registra en conversation_action_log. Si isSensitive → audita. NUNCA dispara efecto colateral.
 */
export async function executeSuggestedAction(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "suggested_actions.execute"); // capacidad general
  const input = parseOrThrow(ExecuteActionInputZ, raw);
  const { organizationId, userId } = ctx;
  await requireConversation(exec, organizationId, input.conversationId);

  const action = (await exec(
    `SELECT "key","requiredPermission","isSensitive","status" FROM "suggested_action_catalog" WHERE "key"=$1`,
    [input.actionKey]))[0];
  if (!action || action.status !== "active") throw new Error(`Acción sugerida desconocida o inactiva: ${input.actionKey}`);

  // Gate secundario: permiso específico de la acción (definido en el catálogo).
  if (!can(ctx.permissions, action.requiredPermission)) throw new PermissionDeniedError(action.requiredPermission);

  await logAction(exec, { organizationId, conversationId: input.conversationId, actorUserId: userId, actionType: "SUGGESTED_ACTION", actionKey: input.actionKey, note: input.note });
  if (action.isSensitive) {
    await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
      action: "suggested_action.executed", entityType: "conversation", entityId: input.conversationId, metadata: { actionKey: input.actionKey } });
  }
  // SIN efecto automático colateral (no mensajes, no citas, no IA).
}
