-- LOOLO — Migración 0020_patient_insurance
-- Ficha Viva Odontológica — Cobertura / aseguradora del paciente (1I-D-3).
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001–0019.
-- 1 tabla nueva, 1:1 con patient (UPSERT por patientId, igual que patient_address).
-- Todos los campos son nullable salvo hasInsurance (default false).

-- ── patient_insurance ──

CREATE TABLE "patient_insurance" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"   UUID NOT NULL,
  "patientId"        UUID NOT NULL,
  "hasInsurance"     BOOLEAN NOT NULL DEFAULT false,
  "providerName"     TEXT,
  "policyNumber"     TEXT,
  "policyholderName" TEXT,
  "planName"         TEXT,
  "validFrom"        DATE,
  "validUntil"       DATE,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"        UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_insurance_org_idx" ON "patient_insurance"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_insurance" TO app_user;
REVOKE DELETE ON "patient_insurance" FROM app_user;

ALTER TABLE "patient_insurance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_insurance" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_insurance"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
