-- LOOLO — Migración 0006_phase3a_identity_ops
-- Ejecutada por app_admin. SOLO AGREGA / ALTER aditivo; NO toca 0001-0005 ni renombra tablas.
-- Amplía contacts/conversations/messages/prospects/patients/opportunities.
-- Crea contact_identifiers (fuente de dedup) y contact_merges (registro de fusiones).

-- ── Enums ──────────────────────────────────────────────────────────
CREATE TYPE "ContactIdentifierKind" AS ENUM ('PHONE','EMAIL','WHATSAPP','INSTAGRAM','FACEBOOK','TIKTOK','OTHER');
CREATE TYPE "ConversationStatus"    AS ENUM ('OPEN','PENDING','SNOOZED','CLOSED');
CREATE TYPE "OpportunityStage"      AS ENUM ('NEW','QUALIFYING','QUOTE_PENDING','WON','LOST');
CREATE TYPE "InitialIntent"         AS ENUM ('APPOINTMENT','PRICE','INFO','COMPLAINT','OTHER','UNKNOWN');
CREATE TYPE "MessageSenderType"     AS ENUM ('CONTACT','AGENT','SYSTEM');
CREATE TYPE "ProspectStatus"        AS ENUM ('NEW','ACTIVE','INACTIVE');
CREATE TYPE "PatientStatus"         AS ENUM ('NEW','ACTIVE','INACTIVE');

-- ── ALTER contacts (sin dedupeKey: la dedup vive en contact_identifiers) ──
ALTER TABLE "contacts" ADD COLUMN "phoneNormalized" TEXT;
ALTER TABLE "contacts" ADD COLUMN "emailNormalized" TEXT;
ALTER TABLE "contacts" ADD COLUMN "primaryChannel" "ContactIdentifierKind";
ALTER TABLE "contacts" ADD COLUMN "mergedIntoId" UUID REFERENCES "contacts"("id") ON DELETE SET NULL;
ALTER TABLE "contacts" ADD COLUMN "notes" TEXT;

-- ── ALTER conversations ────────────────────────────────────────────
ALTER TABLE "conversations" ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "conversations" ADD COLUMN "initialIntent" "InitialIntent" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "conversations" ADD COLUMN "lastMessageAt" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "opportunityId" UUID REFERENCES "opportunities"("id") ON DELETE SET NULL;

-- ── ALTER messages (channelId real + externalId para idempotencia) ──
ALTER TABLE "messages" ADD COLUMN "channelId" UUID REFERENCES "channels"("id") ON DELETE SET NULL;
ALTER TABLE "messages" ADD COLUMN "externalId" TEXT;
ALTER TABLE "messages" ADD COLUMN "senderType" "MessageSenderType" NOT NULL DEFAULT 'CONTACT';
-- Idempotencia: externalId es único SOLO dentro de (org, canal). Índice PARCIAL:
-- si externalId existe evita duplicado; si es NULL no bloquea múltiples mensajes legítimos.
CREATE UNIQUE INDEX "messages_idempotency_idx"
  ON "messages"("organizationId","channelId","externalId")
  WHERE "externalId" IS NOT NULL;

-- ── ALTER prospects / patients / opportunities ─────────────────────
ALTER TABLE "prospects" ADD COLUMN "status" "ProspectStatus" NOT NULL DEFAULT 'NEW';
ALTER TABLE "prospects" ADD COLUMN "source" "ChannelType";
ALTER TABLE "patients"  ADD COLUMN "status" "PatientStatus" NOT NULL DEFAULT 'NEW';
ALTER TABLE "patients"  ADD COLUMN "source" "ChannelType";
ALTER TABLE "opportunities" ADD COLUMN "title" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW';

-- ── NUEVA contact_identifiers (fuente confiable de dedup) ──────────
CREATE TABLE "contact_identifiers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "kind" "ContactIdentifierKind" NOT NULL,
  "valueNormalized" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId","kind","valueNormalized")
);
CREATE INDEX "contact_identifiers_organizationId_idx" ON "contact_identifiers"("organizationId");
CREATE INDEX "contact_identifiers_contactId_idx" ON "contact_identifiers"("contactId");

-- ── NUEVA contact_merges (registro de fusiones; append-only) ───────
CREATE TABLE "contact_merges" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "survivorId" UUID NOT NULL,
  "mergedId" UUID NOT NULL,
  "mergedBy" UUID,
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "contact_merges_organizationId_idx" ON "contact_merges"("organizationId");

-- ── Grants (sin DELETE; merge re-apunta vía UPDATE, no borra) ──────
GRANT SELECT, INSERT, UPDATE ON "contact_identifiers" TO app_user;
REVOKE DELETE ON "contact_identifiers" FROM app_user;
GRANT SELECT, INSERT ON "contact_merges" TO app_user;   -- append-only

-- ── RLS + FORCE (patrón NULLIF ya probado) ─────────────────────────
ALTER TABLE "contact_identifiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_identifiers" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "contact_identifiers"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "contact_merges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_merges" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "contact_merges"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
