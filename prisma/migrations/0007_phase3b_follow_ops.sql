-- LOOLO — Migración 0007_phase3b_follow_ops
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0006.
-- Capa de trabajo operativo (Follow base) sobre conversaciones ya registradas en 3A.
-- Sin IA, sin automatismos, sin canal real.

-- ── Enums nuevos ───────────────────────────────────────────────────
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ConversationCategory" AS ENUM ('APPOINTMENT', 'PRICE', 'INFO', 'COMPLAINT', 'FOLLOWUP', 'OTHER');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');
CREATE TYPE "ConversationActionType" AS ENUM ('ASSIGNED', 'CLASSIFIED', 'PRIORITY_CHANGED', 'CLOSED', 'REOPENED', 'SUGGESTED_ACTION');

-- ── ALTER conversations (aditivo) ──────────────────────────────────
ALTER TABLE "conversations" ADD COLUMN "assignedToUserId" UUID;
ALTER TABLE "conversations" ADD COLUMN "assignedAt" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "category" "ConversationCategory";
ALTER TABLE "conversations" ADD COLUMN "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "conversations" ADD COLUMN "firstResponseAt" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "closedAt" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "closedByUserId" UUID;
CREATE INDEX "conversations_assignedTo_idx" ON "conversations"("organizationId", "assignedToUserId");

-- ── conversation_tasks (org-scoped → RLS) ──────────────────────────
CREATE TABLE "conversation_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "contactId" UUID,
  "title" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMPTZ,
  "assignedToUserId" UUID,
  "createdBy" UUID NOT NULL,
  "completedAt" TIMESTAMPTZ,
  "completedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "conversation_tasks_conv_idx" ON "conversation_tasks"("organizationId", "conversationId");
CREATE INDEX "conversation_tasks_assignee_idx" ON "conversation_tasks"("organizationId", "assignedToUserId", "status");

-- ── conversation_action_log (org-scoped, APPEND-ONLY → RLS) ────────
-- Tercera bitácora: trazabilidad HUMANA operativa dentro de la conversación.
-- Distinta de events (hechos reportables) y audit_logs (seguridad/sensibles).
CREATE TABLE "conversation_action_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "actionType" "ConversationActionType" NOT NULL,
  "actionKey" TEXT,          -- si actionType=SUGGESTED_ACTION, la key del catálogo
  "note" TEXT,               -- nota opcional (p.ej. razón de cierre)
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "conversation_action_log_conv_idx" ON "conversation_action_log"("organizationId", "conversationId");

-- ── suggested_action_catalog (global, INERTE, sin RLS) ─────────────
-- Catálogo cerrado de acciones MANUALES. NO ejecuta nada: solo se registra que un humano la eligió.
CREATE TABLE "suggested_action_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "requiredPermission" TEXT NOT NULL,
  "isSensitive" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Grants ─────────────────────────────────────────────────────────
GRANT SELECT ON "suggested_action_catalog" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "conversation_tasks" TO app_user;       -- cancel = UPDATE de status, no DELETE
REVOKE DELETE ON "conversation_tasks" FROM app_user;
GRANT SELECT, INSERT ON "conversation_action_log" TO app_user;          -- APPEND-ONLY
REVOKE UPDATE, DELETE ON "conversation_action_log" FROM app_user;

-- ── RLS ────────────────────────────────────────────────────────────
ALTER TABLE "conversation_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_tasks" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "conversation_tasks"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "conversation_action_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_action_log" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "conversation_action_log"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
