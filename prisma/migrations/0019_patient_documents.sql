-- NELZZON — Migración 0019_patient_documents
-- Documentos/archivos del paciente (PATIENT-DOCUMENTS-2A-FOUNDATION,
-- ampliada con compliance médico/legal en PATIENT-DOCUMENTS-2B-SCHEMA-COMPLIANCE-REWRITE
-- antes de su primer commit — por eso nace ya completa en 0019, sin requerir 0020).
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0018.
-- patient_documents guarda SOLO metadatos (nunca binarios: storage en S3/R2 vía storageKey).
-- patient_document_links conecta un documento con su(s) módulo(s) de origen/destino.
-- Esta migración NO implementa upload/download real — es la base segura del modelo.
--
-- ── Reglas de proceso (se aplican en el dominio de escritura, NO como CHECK rígido,
--    porque acoplar columnas con CHECK impediría transiciones de estado legítimas) ──
--   * status = VOIDED            ⇒ exige voidReason y voidedAt no nulos
--   * uploadedVia = PATIENT_PORTAL ⇒ debe crearse siempre con status = QUARANTINED
--   * QUARANTINED → ACTIVE       ⇒ exige reviewedByUserId y reviewedAt
--   * legalHold = true           ⇒ bloquea transición a SUPERSEDED/VOIDED
--   * portalStatus → SHARED_TO_PORTAL        ⇒ exige portalSharedByUserId y portalSharedAt
--   * portalStatus → REVOKED/HIDDEN_FROM_PORTAL ⇒ exige portalRevokedByUserId y portalRevokedAt
--   * La IA NO diagnostica, NO prescribe, NO interpreta radiografías/imágenes y
--     NO comparte documentos al portal sin validación humana explícita — solo puede
--     clasificar, resumir o preparar borradores para revisión de un responsable.

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "DocumentKind" AS ENUM (
  'CLINICAL',           -- clínico genérico (cuando no aplica un subtipo más específico)
  'RADIOGRAPH',         -- radiografía dental
  'INTRAORAL_IMAGE',    -- fotografía/imagen intraoral
  'EXTERNAL_STUDY',     -- estudio realizado fuera de la clínica (laboratorio, especialista externo)
  'CLINICAL_EVIDENCE',  -- evidencia clínica antes/después de un tratamiento
  'ADMINISTRATIVE',     -- identificación, formatos administrativos
  'CONSENT',            -- consentimiento informado (tratamiento, procedimiento, plan, presupuesto)
  'PRESCRIPTION',       -- receta / indicación clínica (exige professionalAuthorUserId)
  'FINANCIAL',          -- comprobantes, facturas, estados de cuenta
  'GENERATED',          -- generado por el sistema (presupuesto en PDF, plan, etc.)
  'OTHER'
);

CREATE TYPE "DocumentUploadSource" AS ENUM (
  'STAFF',            -- subido por personal de la clínica
  'PATIENT_PORTAL'    -- subido por el paciente desde el portal (requiere cuarentena)
);

-- Append-only por versión: una corrección crea un nuevo documento que
-- "supersede" al anterior vía replacesDocumentId; nunca se edita el original.
CREATE TYPE "DocumentStatus" AS ENUM (
  'QUARANTINED',      -- recién subido por el portal; pendiente de revisión por staff
  'ACTIVE',           -- vigente y disponible
  'SUPERSEDED',       -- reemplazado por una versión más reciente (replacesDocumentId)
  'VOIDED'            -- anulado por error de registro (requiere voidReason)
);

-- Reemplaza al booleano visibleInPortal: estado explícito y auditable.
CREATE TYPE "DocumentPortalStatus" AS ENUM (
  'PRIVATE',              -- solo personal de la clínica (valor por defecto)
  'SHARED_TO_PORTAL',     -- compartido activamente con el paciente
  'HIDDEN_FROM_PORTAL',   -- oculto temporalmente sin revocar el acceso previo
  'REVOKED'               -- acceso del portal revocado explícitamente
);

CREATE TYPE "DocumentLinkType" AS ENUM (
  'PATIENT',
  'ENCOUNTER',
  'ODONTOGRAM_FINDING',
  'TREATMENT_PLAN',
  'TREATMENT_PLAN_ITEM',
  'QUOTE',
  'PAYMENT',
  'FUTURE_INVOICE',
  'PORTAL_UPLOAD',
  'FOLLOWUP'
);

-- Control de acceso fino independiente de "kind" — permite, por ejemplo, marcar
-- un documento ADMINISTRATIVE que contenga datos de salud como sensible clínico.
CREATE TYPE "DocumentSensitivityLevel" AS ENUM (
  'NORMAL',
  'SENSITIVE_CLINICAL',
  'SENSITIVE_FINANCIAL',
  'SENSITIVE_PERSONAL'
);

-- Clasificación para una futura política de conservación del expediente
-- (NOM-004). Esta migración SOLO clasifica; no implementa borrado automático.
CREATE TYPE "DocumentRetentionCategory" AS ENUM (
  'CLINICAL_RECORD',
  'FINANCIAL_RECORD',
  'ADMINISTRATIVE',
  'CONSENT',
  'TEMPORARY'
);

-- ── 1. patient_documents (solo metadatos; nunca contenido binario) ──────────

CREATE TABLE "patient_documents" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"         UUID NOT NULL,
  "patientId"              UUID NOT NULL,
  "kind"                   "DocumentKind" NOT NULL,
  "fileName"               TEXT NOT NULL,
  "mimeType"               TEXT NOT NULL,
  "sizeBytes"              BIGINT NOT NULL,
  "storageKey"             TEXT NOT NULL,   -- referencia a S3/R2; NUNCA se expone al cliente
  "checksum"               TEXT,            -- íntegridad del archivo; uso interno
  "uploadedByUserId"       UUID,            -- quién ejecutó la acción técnica de subida
  "uploadedVia"            "DocumentUploadSource" NOT NULL,
  "professionalAuthorUserId" UUID,          -- responsable clínico del contenido (NOM-004/NOM-013)
  "reviewedByUserId"       UUID,            -- quién promovió QUARANTINED → ACTIVE
  "reviewedAt"             TIMESTAMPTZ,
  "sensitivityLevel"       "DocumentSensitivityLevel" NOT NULL DEFAULT 'NORMAL',
  "retentionCategory"      "DocumentRetentionCategory" NOT NULL,
  "legalHold"              BOOLEAN NOT NULL DEFAULT false,  -- bloquea SUPERSEDED/VOIDED mientras esté activo
  "portalStatus"           "DocumentPortalStatus" NOT NULL DEFAULT 'PRIVATE',
  "portalSharedAt"         TIMESTAMPTZ,
  "portalSharedByUserId"   UUID,
  "portalRevokedAt"        TIMESTAMPTZ,
  "portalRevokedByUserId"  UUID,
  "status"                 "DocumentStatus" NOT NULL,  -- sin DEFAULT: cada inserción lo decide explícitamente
  "replacesDocumentId"     UUID REFERENCES "patient_documents"("id"),
  "voidedAt"               TIMESTAMPTZ,
  "voidReason"             TEXT,            -- NUNCA en eventos/auditoría/vistas públicas
  "signedAt"               TIMESTAMPTZ,     -- reservado: firma digital futura de consentimientos/recetas
  "signedByUserId"         UUID,            -- reservado: sin lógica de firma todavía
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "patient_documents_org_patient_idx" ON "patient_documents"("organizationId", "patientId");
CREATE INDEX "patient_documents_status_idx" ON "patient_documents"("organizationId", "status");
CREATE INDEX "patient_documents_replaces_idx" ON "patient_documents"("replacesDocumentId") WHERE "replacesDocumentId" IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON "patient_documents" TO app_user;
REVOKE DELETE ON "patient_documents" FROM app_user;

ALTER TABLE "patient_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_documents" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_documents"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── 2. patient_document_links (conexión documento ↔ módulo) ─────────────────

CREATE TABLE "patient_document_links" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"  UUID NOT NULL,
  "documentId"      UUID NOT NULL REFERENCES "patient_documents"("id"),
  "linkType"        "DocumentLinkType" NOT NULL,
  "linkedEntityId"  UUID NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("documentId", "linkType", "linkedEntityId")
);

CREATE INDEX "patient_document_links_org_idx" ON "patient_document_links"("organizationId");
CREATE INDEX "patient_document_links_document_idx" ON "patient_document_links"("documentId");
CREATE INDEX "patient_document_links_entity_idx" ON "patient_document_links"("linkType", "linkedEntityId");

GRANT SELECT, INSERT, UPDATE ON "patient_document_links" TO app_user;
REVOKE DELETE ON "patient_document_links" FROM app_user;

ALTER TABLE "patient_document_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_document_links" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "patient_document_links"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
