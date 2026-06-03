-- LOOLO — Migración 0015_phase7a_configuration
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001–0014.
-- Configuración / Catálogos / Onboarding.
-- 8 tablas nuevas + ALTER resources aditivo (specialty/color/cedula nullable, sin romper F4A).

-- ── 1. ENUMs NUEVOS ──

CREATE TYPE "DocumentTemplateKind" AS ENUM ('PRESCRIPTION', 'CONSENT', 'DOCUMENT', 'MESSAGE');
CREATE TYPE "NotificationChannel"  AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');
CREATE TYPE "ImportJobKind"        AS ENUM ('PATIENTS', 'SERVICES');
CREATE TYPE "ImportJobStatus"      AS ENUM ('DRY_RUN_COMPLETE', 'COMMITTED', 'FAILED');

-- ── 2. ALTER resources (aditivo, nullable: no rompe F4A) ──

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "specialty" TEXT,
  ADD COLUMN IF NOT EXISTS "color"     TEXT,
  ADD COLUMN IF NOT EXISTS "cedula"    TEXT;

-- ── 3. service_catalog ──

CREATE TABLE "service_catalog" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"        UUID NOT NULL,
  "code"                  TEXT NOT NULL,
  "name"                  TEXT NOT NULL,
  "basePriceCents"        BIGINT NOT NULL DEFAULT 0,
  "defaultDurationMin"    INT NOT NULL DEFAULT 30,
  "suggestedDepositCents" BIGINT NOT NULL DEFAULT 0,
  "specialty"             TEXT,
  "active"                BOOLEAN NOT NULL DEFAULT true,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "svc_catalog_price_nn"    CHECK ("basePriceCents" >= 0),
  CONSTRAINT "svc_catalog_duration_gt0" CHECK ("defaultDurationMin" > 0),
  CONSTRAINT "svc_catalog_deposit_nn"  CHECK ("suggestedDepositCents" >= 0),
  UNIQUE ("organizationId", "code")
);
CREATE INDEX "service_catalog_org_idx" ON "service_catalog"("organizationId", "active");

GRANT SELECT, INSERT, UPDATE ON "service_catalog" TO app_user;
REVOKE DELETE ON "service_catalog" FROM app_user;

ALTER TABLE "service_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_catalog" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "service_catalog"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 4. payment_method_config ──

CREATE TABLE "payment_method_config" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "method"         "PaymentMethod" NOT NULL,
  "enabled"        BOOLEAN NOT NULL DEFAULT true,
  "displayOrder"   INT NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "method")
);
CREATE INDEX "pmc_org_idx" ON "payment_method_config"("organizationId");

GRANT SELECT, INSERT, UPDATE ON "payment_method_config" TO app_user;
REVOKE DELETE ON "payment_method_config" FROM app_user;

ALTER TABLE "payment_method_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_method_config" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payment_method_config"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 5. quote_setting (una fila por organización) ──

CREATE TABLE "quote_setting" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"    UUID NOT NULL UNIQUE,
  "validityDays"      INT NOT NULL DEFAULT 30,
  "defaultDepositBps" INT NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "quote_setting_validity_gt0" CHECK ("validityDays" > 0),
  CONSTRAINT "quote_setting_bps_range"   CHECK ("defaultDepositBps" BETWEEN 0 AND 10000)
);

GRANT SELECT, INSERT, UPDATE ON "quote_setting" TO app_user;
REVOKE DELETE ON "quote_setting" FROM app_user;

ALTER TABLE "quote_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_setting" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "quote_setting"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 6. clinic_tax_profile (sensible — permiso propio, auditar lectura y escritura) ──

CREATE TABLE "clinic_tax_profile" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL UNIQUE,
  "rfc"            TEXT NOT NULL,
  "legalName"      TEXT NOT NULL,
  "regimeCode"     TEXT NOT NULL,
  "fiscalZip"      TEXT NOT NULL,
  "fiscalAddress"  TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON "clinic_tax_profile" TO app_user;
REVOKE DELETE ON "clinic_tax_profile" FROM app_user;

ALTER TABLE "clinic_tax_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinic_tax_profile" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinic_tax_profile"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 7. medication_catalog ──

CREATE TABLE "medication_catalog" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "presentation"   TEXT,
  "defaultDose"    TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "medication_catalog_org_idx" ON "medication_catalog"("organizationId", "active");

GRANT SELECT, INSERT, UPDATE ON "medication_catalog" TO app_user;
REVOKE DELETE ON "medication_catalog" FROM app_user;

ALTER TABLE "medication_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medication_catalog" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "medication_catalog"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 8. document_templates ──

CREATE TABLE "document_templates" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "kind"           "DocumentTemplateKind" NOT NULL,
  "name"           TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "variables"      JSONB NOT NULL DEFAULT '[]'::jsonb,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "doc_templates_org_idx" ON "document_templates"("organizationId", "kind", "active");

GRANT SELECT, INSERT, UPDATE ON "document_templates" TO app_user;
REVOKE DELETE ON "document_templates" FROM app_user;

ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "document_templates"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 9. notification_rule ──

CREATE TABLE "notification_rule" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "eventKey"       TEXT NOT NULL,
  "channel"        "NotificationChannel" NOT NULL,
  "enabled"        BOOLEAN NOT NULL DEFAULT true,
  "maxPerDay"      INT NOT NULL DEFAULT 5,
  "quietStart"     TEXT,
  "quietEnd"       TEXT,
  "requiresOptin"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "notif_rule_max_per_day_nn" CHECK ("maxPerDay" >= 0),
  UNIQUE ("organizationId", "eventKey", "channel")
);
CREATE INDEX "notification_rule_org_idx" ON "notification_rule"("organizationId");

GRANT SELECT, INSERT, UPDATE ON "notification_rule" TO app_user;
REVOKE DELETE ON "notification_rule" FROM app_user;

ALTER TABLE "notification_rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_rule" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notification_rule"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 10. import_job ──

CREATE TABLE "import_job" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "kind"           "ImportJobKind" NOT NULL,
  "status"         "ImportJobStatus" NOT NULL,
  "isDryRun"       BOOLEAN NOT NULL DEFAULT true,
  "total"          INT NOT NULL DEFAULT 0,
  "okCount"        INT NOT NULL DEFAULT 0,
  "errorCount"     INT NOT NULL DEFAULT 0,
  "errorReport"    JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdBy"      UUID NOT NULL,
  "committedAt"    TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "import_job_org_idx" ON "import_job"("organizationId", "status");

GRANT SELECT, INSERT, UPDATE ON "import_job" TO app_user;
REVOKE DELETE ON "import_job" FROM app_user;

ALTER TABLE "import_job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_job" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_job"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
