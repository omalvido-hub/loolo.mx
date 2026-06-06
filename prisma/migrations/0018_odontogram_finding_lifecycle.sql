-- LOOLO — Migración 0018_odontogram_finding_lifecycle
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0017.
-- Ciclo de vida de hallazgos de odontograma: VOIDED / TREATED / RESOLVED / CONTROLLED / OBSERVATION.
-- El modelo es append-only: no hay UPDATE/DELETE. Los estados se registran
-- insertando una nueva fila que supersede a la anterior (supersedesFindingId).

-- ── Nuevo enum de ciclo de vida ──────────────────────────────────────────────
CREATE TYPE "OdontogramLifecycleStatus" AS ENUM (
  'ACTIVE',       -- hallazgo activo (comportamiento previo, valor por defecto)
  'OBSERVATION',  -- en vigilancia, sin tratamiento inmediato
  'TREATED',      -- tratamiento completado sobre este hallazgo
  'RESOLVED',     -- resuelto sin intervención formal (curación espontánea, etc.)
  'CONTROLLED',   -- bajo control periódico
  'VOIDED'        -- anulado por error de registro (requiere lifecycleReason)
);

-- ── Columnas nuevas en odontogram_findings ───────────────────────────────────
ALTER TABLE "odontogram_findings"
  ADD COLUMN "lifecycleStatus"       "OdontogramLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lifecycleReason"       TEXT,         -- motivo del cambio; NUNCA en eventos/vistas públicas
  ADD COLUMN "linkedTreatmentItemId" UUID;          -- ítem de plan que completó este hallazgo (TREATED)

-- encounterId pasa a nullable: los eventos de ciclo de vida no requieren consulta
-- abierta (son actos administrativos/clínicos de cierre, no de descubrimiento).
ALTER TABLE "odontogram_findings" ALTER COLUMN "encounterId" DROP NOT NULL;

-- ── Índices para filtros frecuentes ─────────────────────────────────────────
CREATE INDEX "odontogram_lifecycle_idx"
  ON "odontogram_findings"("organizationId", "patientId", "lifecycleStatus");

CREATE INDEX "odontogram_treatment_item_idx"
  ON "odontogram_findings"("linkedTreatmentItemId")
  WHERE "linkedTreatmentItemId" IS NOT NULL;
