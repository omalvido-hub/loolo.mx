-- LOOLO — Migración 0003_phase2a_security
-- Ejecutada por app_admin (dueño).
-- 1) audit_logs.actorType (user/system/ai/support) — distinguir quién actúa (incl. IA y soporte).
-- 2) support_access_grants — soporte como acceso TEMPORAL, justificado, expirable, revocable, auditado.
--    NO es un rol de organización. Materializa la regla support_restricted.

-- ── Enums ──────────────────────────────────────────────────────────
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'AI', 'SUPPORT');
CREATE TYPE "SupportGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- ── 1) audit_logs: actorType ───────────────────────────────────────
-- ADD COLUMN es DDL del dueño; no viola el append-only (que restringe DML de app_user).
ALTER TABLE "audit_logs" ADD COLUMN "actorType" "ActorType" NOT NULL DEFAULT 'USER';

-- ── 2) support_access_grants (org-scoped → RLS) ────────────────────
CREATE TABLE "support_access_grants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "grantedBy" UUID NOT NULL,                 -- usuario (owner/admin) que concede
  "supportUserId" UUID,                      -- usuario de soporte (cuando se asigna/usa)
  "reason" TEXT NOT NULL,                    -- justificación obligatoria
  "scope" TEXT NOT NULL DEFAULT 'read_logs_anonymized', -- alcance del acceso (mínimo privilegio)
  "status" "SupportGrantStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMPTZ NOT NULL,          -- caducidad obligatoria
  "revokedAt" TIMESTAMPTZ,
  "revokedBy" UUID,
  "usedAt" TIMESTAMPTZ,                       -- primer uso
  "useCount" INTEGER NOT NULL DEFAULT 0,      -- nº de usos (auditoría de uso repetido)
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "support_access_grants_organizationId_idx" ON "support_access_grants"("organizationId");
CREATE INDEX "support_access_grants_status_idx" ON "support_access_grants"("status");

-- Grants: app_user puede ver/crear/actualizar (revoke = UPDATE). NO DELETE (no se borran, se revocan).
GRANT SELECT, INSERT, UPDATE ON "support_access_grants" TO app_user;
REVOKE DELETE ON "support_access_grants" FROM app_user;

-- RLS + FORCE + aislamiento por tenant (mismo patrón con NULLIF que el resto del dominio).
ALTER TABLE "support_access_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_access_grants" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "support_access_grants"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
