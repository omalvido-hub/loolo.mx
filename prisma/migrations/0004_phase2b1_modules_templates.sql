-- LOOLO — Migración 0004_phase2b1_modules_templates
-- Ejecutada por app_admin (dueño). SOLO AGREGA; no toca 0001-0003.
-- Catálogos globales (sin RLS): module_catalog, business_templates, template_modules.
-- Org-scoped (RLS + FORCE): organization_modules con superficies MÚLTIPLES (no surface único).

-- ── Enums ──────────────────────────────────────────────────────────
CREATE TYPE "ModuleGroup" AS ENUM (
  'CHANNELS', 'FOLLOW', 'CONTACTS', 'AGENDA', 'CLINICAL', 'ODONTOGRAM',
  'TREATMENT_PLAN', 'QUOTES', 'PAYMENTS', 'INVOICING', 'PORTAL', 'FOLLOWUP',
  'REPORTS', 'FINANCE', 'IDENTITY', 'CONFIG', 'INTEGRATIONS', 'DATA_MODEL',
  'AI_AUTOMATION', 'QA', 'DOCUMENTS', 'NOTIFICATIONS', 'CATALOGS',
  'ADJUSTMENTS', 'MIGRATION', 'PORTAL_ACCESS', 'SUPPORT', 'INVENTORY', 'MARKETING'
);
CREATE TYPE "ModuleType" AS ENUM ('CORE', 'TRANSVERSAL', 'OPERATIONAL');
CREATE TYPE "ModuleFunctionalStatus" AS ENUM ('programmed_now', 'prepared_for_later', 'pending_definition');
CREATE TYPE "TemplatePhase" AS ENUM ('PILOTO', 'BETA', 'PRODUCCION');
CREATE TYPE "TemplateDetailLevel" AS ENUM ('BASICO', 'COMPLETO');

-- ── 1) module_catalog (global, sin RLS) ────────────────────────────
CREATE TABLE "module_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,                 -- genérico, no hardcodear odontología
  "name" TEXT NOT NULL,
  "description" TEXT,
  "moduleGroup" "ModuleGroup" NOT NULL,
  "moduleType" "ModuleType" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "isCore" BOOLEAN NOT NULL DEFAULT false,
  "isTransversal" BOOLEAN NOT NULL DEFAULT false,
  "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
  "defaultVisible" BOOLEAN NOT NULL DEFAULT false,
  "defaultShowInMenu" BOOLEAN NOT NULL DEFAULT false,
  "defaultShowInDock" BOOLEAN NOT NULL DEFAULT false,
  "defaultDashboardAvailable" BOOLEAN NOT NULL DEFAULT false,
  "functionalStatus" "ModuleFunctionalStatus" NOT NULL DEFAULT 'pending_definition',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2) business_templates (global, sin RLS) ────────────────────────
CREATE TABLE "business_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "professionUnit" TEXT NOT NULL,
  "specialtyService" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "phase" "TemplatePhase" NOT NULL DEFAULT 'PILOTO',
  "detailLevel" "TemplateDetailLevel" NOT NULL DEFAULT 'COMPLETO',
  "version" INTEGER NOT NULL DEFAULT 1,       -- versionar plantillas sin rehacer
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3) template_modules (global, sin RLS) ──────────────────────────
CREATE TABLE "template_modules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" UUID NOT NULL REFERENCES "business_templates"("id") ON DELETE CASCADE,
  "moduleId" UUID NOT NULL REFERENCES "module_catalog"("id") ON DELETE CASCADE,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "isRecommended" BOOLEAN NOT NULL DEFAULT false,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
  "defaultVisible" BOOLEAN NOT NULL DEFAULT false,
  "defaultShowInMenu" BOOLEAN NOT NULL DEFAULT false,
  "defaultShowInDock" BOOLEAN NOT NULL DEFAULT false,
  "defaultDashboardAvailable" BOOLEAN NOT NULL DEFAULT false,
  "menuSortOrder" INTEGER,
  "labelOverride" TEXT,                        -- vocabulario por profesión ("Odontograma")
  "iconKey" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("templateId", "moduleId")
);
CREATE INDEX "template_modules_templateId_idx" ON "template_modules"("templateId");

-- ── 4) organization_modules (ORG-SCOPED → RLS) ─────────────────────
-- Fuente ÚNICA de verdad de visibilidad. Superficies MÚLTIPLES (no surface único):
-- un módulo puede estar habilitado pero no visible, en menú y dock a la vez, etc.
CREATE TABLE "organization_modules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "moduleId" UUID NOT NULL REFERENCES "module_catalog"("id") ON DELETE CASCADE,
  "templateId" UUID REFERENCES "business_templates"("id") ON DELETE SET NULL,
  "appliedTemplateVersion" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "showInMenu" BOOLEAN NOT NULL DEFAULT false,
  "showInDock" BOOLEAN NOT NULL DEFAULT false,
  "dashboardAvailable" BOOLEAN NOT NULL DEFAULT false,
  "menuSortOrder" INTEGER,
  "dockSortOrder" INTEGER,
  "dashboardSortOrder" INTEGER,
  "labelOverride" TEXT,
  "iconKey" TEXT,
  "customized" BOOLEAN NOT NULL DEFAULT false, -- true si la org tocó esta fila (no pisar al reaplicar)
  "configuredBy" UUID,
  "configuredAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "moduleId")
);
CREATE INDEX "organization_modules_organizationId_idx" ON "organization_modules"("organizationId");

-- Grants: app_user SELECT/INSERT/UPDATE (NO DELETE). Los módulos no se borran:
-- se deshabilitan/ocultan. Borrar rompería historial, idempotencia y lectura de configuración.
GRANT SELECT ON "module_catalog", "business_templates", "template_modules" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "organization_modules" TO app_user;
REVOKE DELETE ON "organization_modules" FROM app_user;

-- RLS + FORCE + aislamiento por tenant (mismo patrón NULLIF ya probado).
ALTER TABLE "organization_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_modules" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_modules"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
