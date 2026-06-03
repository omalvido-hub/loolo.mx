-- LOOLO — Migración 0008_phase4a_agenda
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0007.
-- Agenda base odontológica: recursos, citas (con anti-solapamiento a nivel BD),
-- disponibilidad semanal y bloqueos manuales. Sin recordatorios, IA ni UI.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "ResourceKind"      AS ENUM ('PROFESSIONAL', 'CHAIR', 'ROOM');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE "AppointmentSource" AS ENUM ('MANUAL', 'FROM_CONVERSATION');

-- ── resources (org-scoped → RLS). timezone interpreta availability_rules. ──
CREATE TABLE "resources" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "kind" "ResourceKind" NOT NULL,
  "name" TEXT NOT NULL,
  "linkedUserId" UUID,                                   -- validado en boundary admin (no FK a identidad)
  "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "resources_org_idx" ON "resources"("organizationId", "kind");

-- ── appointments (org-scoped → RLS). startAt/endAt en timestamptz (UTC). ──
CREATE TABLE "appointments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "contactId" UUID,
  "patientId" UUID,
  "conversationId" UUID,
  "opportunityId" UUID,
  "professionalResourceId" UUID,
  "chairResourceId" UUID,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "source" "AppointmentSource" NOT NULL DEFAULT 'MANUAL',
  "reason" TEXT,
  "rescheduledFromId" UUID,
  "createdBy" UUID NOT NULL,
  "canceledAt" TIMESTAMPTZ,
  "canceledByUserId" UUID,
  "cancelReason" TEXT,
  "noShowAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "appt_time_valid" CHECK ("endAt" > "startAt")
);
CREATE INDEX "appointments_org_idx" ON "appointments"("organizationId", "startAt");
CREATE INDEX "appointments_prof_idx" ON "appointments"("professionalResourceId", "startAt");
CREATE INDEX "appointments_chair_idx" ON "appointments"("chairResourceId", "startAt");

-- Anti-solapamiento a nivel BD. Solo estados ACTIVOS (SCHEDULED/CONFIRMED) bloquean.
-- tstzrange '[)': fin exclusivo, así citas consecutivas (10-11, 11-12) NO chocan.
ALTER TABLE "appointments" ADD CONSTRAINT "appt_no_overlap_professional"
  EXCLUDE USING gist (
    "professionalResourceId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  ) WHERE ("status" IN ('SCHEDULED', 'CONFIRMED') AND "professionalResourceId" IS NOT NULL);

ALTER TABLE "appointments" ADD CONSTRAINT "appt_no_overlap_chair"
  EXCLUDE USING gist (
    "chairResourceId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  ) WHERE ("status" IN ('SCHEDULED', 'CONFIRMED') AND "chairResourceId" IS NOT NULL);

-- ── availability_rules (plantilla semanal por recurso, en su timezone) ──
CREATE TABLE "availability_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "resourceId" UUID NOT NULL,
  "weekday" SMALLINT NOT NULL,            -- 0=domingo .. 6=sábado (igual que EXTRACT(DOW))
  "startMinute" SMALLINT NOT NULL,        -- minutos desde medianoche local
  "endMinute" SMALLINT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "avail_weekday_valid" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "avail_minutes_valid" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute")
);
CREATE INDEX "availability_rules_idx" ON "availability_rules"("organizationId", "resourceId", "weekday");

-- ── schedule_blocks (bloqueos manuales por recurso) ──
CREATE TABLE "schedule_blocks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "resourceId" UUID NOT NULL,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "reason" TEXT,
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "block_time_valid" CHECK ("endAt" > "startAt")
);
CREATE INDEX "schedule_blocks_idx" ON "schedule_blocks"("organizationId", "resourceId", "startAt");

-- ── Grants (sin DELETE: cancelar/desactivar = UPDATE de estado) ──
GRANT SELECT, INSERT, UPDATE ON "resources" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "appointments" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "availability_rules" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "schedule_blocks" TO app_user;
REVOKE DELETE ON "resources", "appointments", "availability_rules", "schedule_blocks" FROM app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "resources"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resources"          FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "resources"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "appointments"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments"       FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "appointments"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "availability_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability_rules" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "availability_rules"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "schedule_blocks"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_blocks"    FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "schedule_blocks"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Ajuste C (4A): trazar en conversation_action_log la cita creada desde conversación.
-- Extensión ADITIVA del enum de 3B (no altera valores existentes ni la migración 0007).
ALTER TYPE "ConversationActionType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CREATED';
