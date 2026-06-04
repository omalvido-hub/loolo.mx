-- LOOLO — Migración 0016_fvo1_patient_extended_profile
-- Ficha Viva Odontológica — Extensión del perfil del paciente (FVO-1).
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001–0015.
-- 9 tablas nuevas. Todos los campos son nullable para no romper datos existentes.

-- ── 1. patient_demographics ──

CREATE TABLE "patient_demographics" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "dateOfBirth"    DATE,
  "sex"            TEXT,         -- 'M' | 'F' | 'NB' | 'O'
  "bloodType"      TEXT,         -- 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'U'
  "occupation"     TEXT,
  "maritalStatus"  TEXT,         -- 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER'
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_demographics_org_idx" ON "patient_demographics"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_demographics" TO app_user;
REVOKE DELETE ON "patient_demographics" FROM app_user;

ALTER TABLE "patient_demographics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_demographics" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_demographics"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 2. patient_address ──

CREATE TABLE "patient_address" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "street"         TEXT,
  "extNumber"      TEXT,
  "intNumber"      TEXT,
  "neighborhood"   TEXT,
  "municipality"   TEXT,
  "state"          TEXT,
  "postalCode"     TEXT,
  "country"        TEXT DEFAULT 'MX',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_address_org_idx" ON "patient_address"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_address" TO app_user;
REVOKE DELETE ON "patient_address" FROM app_user;

ALTER TABLE "patient_address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_address" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_address"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 3. patient_tax_profile ──

CREATE TABLE "patient_tax_profile" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "rfc"            TEXT,
  "legalName"      TEXT,
  "taxRegime"      TEXT,         -- Clave SAT del régimen fiscal
  "cfdiUse"        TEXT,         -- Clave SAT del uso CFDI
  "taxPostalCode"  TEXT,         -- CP fiscal (puede diferir del domicilio)
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_tax_profile_org_idx" ON "patient_tax_profile"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_tax_profile" TO app_user;
REVOKE DELETE ON "patient_tax_profile" FROM app_user;

ALTER TABLE "patient_tax_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_tax_profile" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_tax_profile"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 4. patient_clinical_profile ──
-- Datos clínicos estructurados del paciente (antecedentes, alergias, medicamentos).
-- Solo roles con patient.clinical_profile.view pueden leer esta tabla.

CREATE TABLE "patient_clinical_profile" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"      UUID NOT NULL,
  "patientId"           UUID NOT NULL,
  "knownAllergies"      TEXT[],   -- Array de alergias conocidas
  "currentMedications"  TEXT[],   -- Medicamentos actuales relevantes
  "relevantHistory"     TEXT,     -- Antecedentes médicos relevantes
  "safetyNotes"         TEXT,     -- Notas clínicas de seguridad
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"           UUID,
  "updatedBy"           UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_clinical_profile_org_idx" ON "patient_clinical_profile"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_clinical_profile" TO app_user;
REVOKE DELETE ON "patient_clinical_profile" FROM app_user;

ALTER TABLE "patient_clinical_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_clinical_profile" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_clinical_profile"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 5. patient_medical_alert ──
-- Alertas médicas individuales. Muchas por paciente. Soft-delete via active=false.
-- Solo roles con patient.clinical_profile.view ven el detalle; patient.demographics.view ve solo la bandera.

CREATE TABLE "patient_medical_alert" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "alertType"      TEXT NOT NULL, -- 'ALLERGY' | 'MEDICATION' | 'CONDITION' | 'OTHER'
  "severity"       TEXT NOT NULL, -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  "description"    TEXT NOT NULL,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID
);
CREATE INDEX "patient_medical_alert_org_idx"     ON "patient_medical_alert"("organizationId", "patientId");
CREATE INDEX "patient_medical_alert_active_idx"  ON "patient_medical_alert"("patientId", "active");

GRANT SELECT, INSERT, UPDATE ON "patient_medical_alert" TO app_user;
REVOKE DELETE ON "patient_medical_alert" FROM app_user;

ALTER TABLE "patient_medical_alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_medical_alert" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_medical_alert"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 6. patient_guardian ──
-- Tutor o responsable legal del paciente (menores de edad u otros casos).

CREATE TABLE "patient_guardian" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "name"           TEXT,
  "relationship"   TEXT,    -- 'PARENT' | 'SIBLING' | 'SPOUSE' | 'OTHER'
  "phone"          TEXT,
  "email"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_guardian_org_idx" ON "patient_guardian"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_guardian" TO app_user;
REVOKE DELETE ON "patient_guardian" FROM app_user;

ALTER TABLE "patient_guardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_guardian" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_guardian"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 7. patient_emergency_contact ──

CREATE TABLE "patient_emergency_contact" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "name"           TEXT,
  "relationship"   TEXT,
  "phone"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_emergency_contact_org_idx" ON "patient_emergency_contact"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_emergency_contact" TO app_user;
REVOKE DELETE ON "patient_emergency_contact" FROM app_user;

ALTER TABLE "patient_emergency_contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_emergency_contact" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_emergency_contact"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 8. patient_commercial_origin ──

CREATE TABLE "patient_commercial_origin" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId"      UUID NOT NULL,
  "channel"        TEXT,    -- 'WHATSAPP' | 'INSTAGRAM' | 'REFERRAL' | 'WALK_IN' | 'WEB' | 'OTHER'
  "campaign"       TEXT,
  "referredBy"     TEXT,    -- Nombre o identificador de quien refirió
  "initialReason"  TEXT,    -- Motivo inicial de consulta (texto libre)
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy"      UUID,
  UNIQUE ("patientId")
);
CREATE INDEX "patient_commercial_origin_org_idx" ON "patient_commercial_origin"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_commercial_origin" TO app_user;
REVOKE DELETE ON "patient_commercial_origin" FROM app_user;

ALTER TABLE "patient_commercial_origin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_commercial_origin" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_commercial_origin"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 9. patient_data_consent ──
-- Consentimiento de datos por paciente. UNIQUE (patientId, consentType) — un registro activo por tipo.

CREATE TABLE "patient_data_consent" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"  UUID NOT NULL,
  "patientId"       UUID NOT NULL,
  "consentType"     TEXT NOT NULL DEFAULT 'DATA_TREATMENT',
  "status"          TEXT NOT NULL DEFAULT 'GRANTED',  -- 'GRANTED' | 'REVOKED'
  "grantedAt"       TIMESTAMPTZ,
  "revokedAt"       TIMESTAMPTZ,
  "version"         TEXT,     -- versión del aviso de privacidad
  "method"          TEXT,     -- 'SIGNATURE' | 'VERBAL' | 'DIGITAL' | 'IMPLICIT'
  "grantedByUserId" UUID,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("patientId", "consentType")
);
CREATE INDEX "patient_data_consent_org_idx" ON "patient_data_consent"("organizationId", "patientId");

GRANT SELECT, INSERT, UPDATE ON "patient_data_consent" TO app_user;
REVOKE DELETE ON "patient_data_consent" FROM app_user;

ALTER TABLE "patient_data_consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_data_consent" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_data_consent"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
