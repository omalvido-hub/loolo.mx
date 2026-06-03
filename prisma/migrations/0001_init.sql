-- LOOLO — Migración 0001_init
-- DDL alineado con prisma/schema.prisma (nombres de tabla vía @@map; columnas camelCase como Prisma).
-- Ejecutado por app_admin (dueño de las tablas).

-- Enums
CREATE TYPE "RoleScope"        AS ENUM ('ORG', 'PLATFORM');
CREATE TYPE "RecordState"      AS ENUM ('OK', 'MISSING_DATA', 'REQUIRES_HUMAN', 'BLOCKED', 'ARCHIVED');
CREATE TYPE "ChannelType"      AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WEB');
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- ── Better Auth (globales, sin RLS de tenant) ──────────────────────
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "activeOrganizationId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "password" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "verifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "organizations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "logo" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "organization_memberships" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "userId")
);

CREATE TABLE "invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "inviterId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RBAC LOOLO (catálogos globales, sin RLS de tenant) ─────────────
CREATE TABLE "permissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "scope" "RoleScope" NOT NULL DEFAULT 'ORG',
  "assignable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "role_permissions" (
  "roleId" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "membership_roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES "organization_memberships"("id") ON DELETE CASCADE,
  "roleId" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("memberId", "roleId")
);

-- ── Dominio LOOLO (org-scoped; RLS se activa en 0002) ──────────────
CREATE TABLE "contacts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fullName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "source" "ChannelType",
  "state" "RecordState" NOT NULL DEFAULT 'OK',
  "archivedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "contacts_organizationId_idx" ON "contacts"("organizationId");

CREATE TABLE "prospects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "state" "RecordState" NOT NULL DEFAULT 'OK',
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "prospects_organizationId_idx" ON "prospects"("organizationId");

CREATE TABLE "patients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "state" "RecordState" NOT NULL DEFAULT 'OK',
  "archivedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "patients_organizationId_idx" ON "patients"("organizationId");

CREATE TABLE "opportunities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "contactId" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "state" "RecordState" NOT NULL DEFAULT 'OK',
  "valueCents" INTEGER,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "opportunities_organizationId_idx" ON "opportunities"("organizationId");

CREATE TABLE "channels" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "type" "ChannelType" NOT NULL,
  "identifier" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "channels_organizationId_idx" ON "channels"("organizationId");

CREATE TABLE "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "channelId" UUID NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "contactId" UUID REFERENCES "contacts"("id") ON DELETE SET NULL,
  "state" "RecordState" NOT NULL DEFAULT 'OK',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "conversations_organizationId_idx" ON "conversations"("organizationId");

CREATE TABLE "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "direction" "MessageDirection" NOT NULL,
  "body" TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "messages_organizationId_idx" ON "messages"("organizationId");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- ── Infraestructura transversal ────────────────────────────────────
CREATE TABLE "events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "events_organizationId_idx" ON "events"("organizationId");
CREATE INDEX "events_type_idx" ON "events"("type");

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "actorUserId" UUID,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
