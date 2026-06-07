// NELZZON — Resolver de bandeja Follow (Fase 3B). PURO, testeable sin DB.
// Visibilidad por PERMISO (conversations.view) y filtros operativos. Determinista.

import type { InboxFilter } from "./schemas.js";

export interface InboxConversation {
  id: string;
  status: "OPEN" | "PENDING" | "SNOOZED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  category: string | null;
  assignedToUserId: string | null;
  lastMessageAt: string | null;
}

export interface ResolveInboxInput {
  conversations: InboxConversation[];
  filter: InboxFilter;
  permissions: ReadonlySet<string> | readonly string[];
}

const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const hasPerm = (perms: ReadonlySet<string> | readonly string[], k: string) =>
  Array.isArray(perms) ? perms.includes(k) : (perms as ReadonlySet<string>).has(k);

export function resolveInbox(input: ResolveInboxInput): InboxConversation[] {
  const { conversations, filter, permissions } = input;

  // Gate por permiso: sin conversations.view, la bandeja está vacía (fail-closed).
  if (!hasPerm(permissions, "conversations.view")) return [];

  let rows = conversations.slice();
  if (filter.status) rows = rows.filter((c) => c.status === filter.status);
  if (filter.priority) rows = rows.filter((c) => c.priority === filter.priority);
  if (filter.category) rows = rows.filter((c) => c.category === filter.category);
  if (filter.unassignedOnly) rows = rows.filter((c) => c.assignedToUserId === null);
  if (filter.assignedToUserId) rows = rows.filter((c) => c.assignedToUserId === filter.assignedToUserId);

  // Orden: prioridad desc, luego lastMessageAt desc (recientes primero).
  rows.sort((a, b) => {
    const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (p !== 0) return p;
    return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
  });
  return rows;
}
