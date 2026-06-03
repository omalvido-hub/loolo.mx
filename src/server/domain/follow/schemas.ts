// LOOLO — Validadores Zod de Follow operativo (Fase 3B).
// Enums cerrados + payloads de operaciones. Falla cerrado.

import { z } from "zod";

export const ConversationPriorityZ = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const ConversationCategoryZ = z.enum(["APPOINTMENT", "PRICE", "INFO", "COMPLAINT", "FOLLOWUP", "OTHER"]);
export const TaskStatusZ = z.enum(["OPEN", "DONE", "CANCELLED"]);

export const AssignInputZ = z.object({
  conversationId: z.string().uuid(),
  assignedToUserId: z.string().uuid(),
});
export const ClassifyInputZ = z.object({
  conversationId: z.string().uuid(),
  category: ConversationCategoryZ,
});
export const PriorityInputZ = z.object({
  conversationId: z.string().uuid(),
  priority: ConversationPriorityZ,
});
export const CloseInputZ = z.object({
  conversationId: z.string().uuid(),
  note: z.string().max(1000).optional(),
});
export const ReopenInputZ = z.object({
  conversationId: z.string().uuid(),
  note: z.string().max(1000).optional(),
});
export const CreateTaskInputZ = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  dueAt: z.coerce.date().optional(),
  assignedToUserId: z.string().uuid().optional(),
});
export const ExecuteActionInputZ = z.object({
  conversationId: z.string().uuid(),
  actionKey: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 3B falló: " + r.error.message);
  return r.data;
}

// Filtros de bandeja (resolver puro).
export const InboxFilterZ = z.object({
  status: z.enum(["OPEN", "PENDING", "SNOOZED", "CLOSED"]).optional(),
  priority: ConversationPriorityZ.optional(),
  category: ConversationCategoryZ.optional(),
  assignedToUserId: z.string().uuid().optional(),
  unassignedOnly: z.boolean().optional(),
});
export type InboxFilter = z.infer<typeof InboxFilterZ>;
