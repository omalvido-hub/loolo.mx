-- LOOLO — Migración 0005_phase2b2_dashboard_preferences
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0004.
-- dashboard_widget_catalog: global (sin RLS).
-- organization_dashboard_widgets: org-scoped (RLS por organizationId).
-- user_preferences: DOBLE RLS (organizationId + userId). Requiere GUC app.current_user_id.

CREATE TYPE "WidgetType" AS ENUM ('SUMMARY', 'LIST', 'CALENDAR', 'METRIC', 'PLACEHOLDER');
CREATE TYPE "WidgetFunctionalStatus" AS ENUM ('programmed_now', 'prepared_for_later', 'pending_definition');

-- ── 1) dashboard_widget_catalog (global, sin RLS) ──────────────────
CREATE TABLE "dashboard_widget_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceModuleKey" TEXT,                         -- → module_catalog.key (no FK: catálogo flexible)
  "widgetType" "WidgetType" NOT NULL,
  "requiredPermissions" TEXT[] NOT NULL DEFAULT '{}',
  "configSchemaKey" TEXT NOT NULL DEFAULT 'placeholder',
  "functionalStatus" "WidgetFunctionalStatus" NOT NULL DEFAULT 'pending_definition',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2) organization_dashboard_widgets (org-scoped → RLS) ───────────
CREATE TABLE "organization_dashboard_widgets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "widgetKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "size" TEXT NOT NULL DEFAULT 'md',
  "sortOrder" INTEGER,
  "configJson" JSONB,
  "customized" BOOLEAN NOT NULL DEFAULT false,
  "configuredBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "widgetKey")
);
CREATE INDEX "org_dashboard_widgets_organizationId_idx" ON "organization_dashboard_widgets"("organizationId");

-- ── 3) user_preferences (org + user scoped → DOBLE RLS) ────────────
CREATE TABLE "user_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "preferenceKey" TEXT NOT NULL,
  "preferenceValueJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "organizationId", "preferenceKey")
);
CREATE INDEX "user_preferences_org_user_idx" ON "user_preferences"("organizationId", "userId");

-- ── Grants (sin DELETE: se deshabilita/actualiza, no se borra) ─────
GRANT SELECT ON "dashboard_widget_catalog" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "organization_dashboard_widgets" TO app_user;
REVOKE DELETE ON "organization_dashboard_widgets" FROM app_user;
GRANT SELECT, INSERT, UPDATE ON "user_preferences" TO app_user;
REVOKE DELETE ON "user_preferences" FROM app_user;

-- ── RLS ────────────────────────────────────────────────────────────
ALTER TABLE "organization_dashboard_widgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_dashboard_widgets" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_dashboard_widgets"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- DOBLE aislamiento: org + usuario. Fail-closed si falta cualquiera de los dos GUC.
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_user_isolation ON "user_preferences"
  USING (
    "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND "userId"      = NULLIF(current_setting('app.current_user_id',   true), '')::uuid
  )
  WITH CHECK (
    "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND "userId"      = NULLIF(current_setting('app.current_user_id',   true), '')::uuid
  );
