-- LOOLO — Migración 0009_phase5a_clinical
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0008.
-- Consulta clínica base. Datos de SALUD: acceso estrecho, notas append-only, sin contenido en eventos.

CREATE TYPE "EncounterStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'FINALIZED', 'CANCELED');

-- ── clinical_encounters (org-scoped → RLS). patientId obligatorio. ──
CREATE TABLE "clinical_encounters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "appointmentId" UUID,                       -- opcional (puede haber consulta sin cita)
  "patientId" UUID NOT NULL,                  -- OBLIGATORIO (decisión 1)
  "professionalResourceId" UUID,              -- opcional (ajuste E)
  "status" "EncounterStatus" NOT NULL DEFAULT 'DRAFT',
  "chiefComplaint" TEXT NOT NULL,             -- motivo de consulta
  "preliminaryDiagnosis" TEXT,
  "observations" TEXT,
  "indications" TEXT,
  "startedAt" TIMESTAMPTZ,
  "finalizedAt" TIMESTAMPTZ,
  "finalizedByUserId" UUID,
  "canceledAt" TIMESTAMPTZ,
  "canceledByUserId" UUID,
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "clinical_encounters_patient_idx" ON "clinical_encounters"("organizationId", "patientId");
CREATE INDEX "clinical_encounters_appt_idx" ON "clinical_encounters"("appointmentId");

-- ── clinical_notes (org-scoped, APPEND-ONLY → RLS). Inmutables. ──
CREATE TABLE "clinical_notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "encounterId" UUID NOT NULL,
  "authorUserId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "clinical_notes_encounter_idx" ON "clinical_notes"("organizationId", "encounterId");

-- ── Grants (estrechos). encounters: sin DELETE (cancelar = estado). notes: APPEND-ONLY. ──
GRANT SELECT, INSERT, UPDATE ON "clinical_encounters" TO app_user;
REVOKE DELETE ON "clinical_encounters" FROM app_user;
GRANT SELECT, INSERT ON "clinical_notes" TO app_user;
REVOKE UPDATE, DELETE ON "clinical_notes" FROM app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "clinical_encounters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_encounters" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinical_encounters"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "clinical_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_notes" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "clinical_notes"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
