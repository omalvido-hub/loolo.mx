-- LOOLO — Migración 0010_phase5b_odontogram
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0009.
-- Odontograma base: hallazgos clínicos APPEND-ONLY ligados a paciente + consulta.
-- Datos de SALUD: acceso estrecho, sin contenido libre en eventos/auditoría.

CREATE TYPE "ToothSurface" AS ENUM ('MESIAL', 'DISTAL', 'OCCLUSAL', 'VESTIBULAR', 'LINGUAL', 'INCISAL');
CREATE TYPE "OdontogramFindingType" AS ENUM ('CARIES', 'RESTORATION', 'CROWN', 'ENDODONTICS', 'IMPLANT', 'FRACTURE', 'MOBILITY', 'MISSING', 'SEALANT', 'OTHER');
CREATE TYPE "ToothStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXTRACTED', 'IMPACTED', 'UNERUPTED', 'ROOT_ONLY');

-- ── odontogram_findings (org-scoped, APPEND-ONLY → RLS). Inmutables. ──
-- Corrección = nuevo hallazgo con supersedesFindingId (decisión 4). Sin UPDATE/DELETE.
CREATE TABLE "odontogram_findings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "encounterId" UUID NOT NULL,
  "toothFdi" SMALLINT NOT NULL,                       -- FDI permanentes 11-48 (decisión 3)
  "surface" "ToothSurface",                           -- NULL = a nivel pieza
  "findingType" "OdontogramFindingType" NOT NULL,
  "toothStatus" "ToothStatus" NOT NULL,
  "note" TEXT,
  "supersedesFindingId" UUID,                         -- encadena corrección histórica
  "recordedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fdi_valid" CHECK (
    "toothFdi" BETWEEN 11 AND 48
    AND ("toothFdi" % 10) BETWEEN 1 AND 8
    AND ("toothFdi" / 10) BETWEEN 1 AND 4
  )
);
CREATE INDEX "odontogram_patient_idx" ON "odontogram_findings"("organizationId", "patientId", "toothFdi");
CREATE INDEX "odontogram_encounter_idx" ON "odontogram_findings"("organizationId", "encounterId");
CREATE INDEX "odontogram_supersedes_idx" ON "odontogram_findings"("supersedesFindingId");

-- ── Grants APPEND-ONLY (ajuste B) ──
GRANT SELECT, INSERT ON "odontogram_findings" TO app_user;
REVOKE UPDATE, DELETE ON "odontogram_findings" FROM app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "odontogram_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "odontogram_findings" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "odontogram_findings"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
