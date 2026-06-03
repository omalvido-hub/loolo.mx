-- LOOLO — Migración 0011_phase5c_treatment_plan
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0010.
-- Plan de tratamiento base. MUTABLE por estado (transiciones controladas + auditoría).
-- Sin dinero/precios/costos (ajuste F). Datos de salud: sin texto clínico en eventos/auditoría.

CREATE TYPE "TreatmentPlanStatus" AS ENUM ('DRAFT', 'PROPOSED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELED');
CREATE TYPE "TreatmentItemStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELED');
CREATE TYPE "TreatmentPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');
CREATE TYPE "ProcedureType" AS ENUM (
  'EXAM', 'PROPHYLAXIS', 'RESTORATION', 'ENDODONTICS', 'EXTRACTION', 'CROWN',
  'BRIDGE', 'IMPLANT', 'PERIODONTAL', 'ORTHODONTICS', 'SURGERY', 'OTHER'
);

-- ── treatment_plans (org-scoped → RLS, mutable por estado) ──
CREATE TABLE "treatment_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "encounterId" UUID,
  "professionalResourceId" UUID,
  "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "notes" TEXT,
  "createdBy" UUID NOT NULL,
  "proposedAt" TIMESTAMPTZ,
  "acceptedAt" TIMESTAMPTZ,
  "activatedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "rejectedAt" TIMESTAMPTZ,
  "canceledAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "treatment_plans_patient_idx" ON "treatment_plans"("organizationId", "patientId");
-- Decisión 4b: a lo sumo un plan ACTIVE por paciente (constraint declarativa).
CREATE UNIQUE INDEX "treatment_plans_one_active" ON "treatment_plans"("organizationId", "patientId") WHERE "status" = 'ACTIVE';

-- ── treatment_plan_items (org-scoped → RLS, mutable por estado) ──
CREATE TABLE "treatment_plan_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "toothFdi" SMALLINT,
  "surface" "ToothSurface",
  "procedureType" "ProcedureType" NOT NULL,
  "status" "TreatmentItemStatus" NOT NULL DEFAULT 'PROPOSED',
  "priority" "TreatmentPriority" NOT NULL DEFAULT 'NORMAL',
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "professionalResourceId" UUID,
  "linkedFindingId" UUID,
  "createdBy" UUID NOT NULL,
  "completedAt" TIMESTAMPTZ,
  "canceledAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "item_fdi_valid" CHECK (
    "toothFdi" IS NULL OR (
      "toothFdi" BETWEEN 11 AND 48
      AND ("toothFdi" % 10) BETWEEN 1 AND 8
      AND ("toothFdi" / 10) BETWEEN 1 AND 4
    )
  ),
  CONSTRAINT "item_sequence_valid" CHECK ("sequence" >= 0)
);
CREATE INDEX "treatment_items_plan_idx" ON "treatment_plan_items"("organizationId", "planId", "sequence");
CREATE INDEX "treatment_items_finding_idx" ON "treatment_plan_items"("linkedFindingId");

-- ── Grants (sin DELETE: cancelar = estado) ──
GRANT SELECT, INSERT, UPDATE ON "treatment_plans" TO app_user;
GRANT SELECT, INSERT, UPDATE ON "treatment_plan_items" TO app_user;
REVOKE DELETE ON "treatment_plans", "treatment_plan_items" FROM app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "treatment_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plans" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plans"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "treatment_plan_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "treatment_plan_items" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "treatment_plan_items"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
