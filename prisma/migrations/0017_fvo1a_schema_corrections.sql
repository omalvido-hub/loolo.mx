-- LOOLO — Migración 0017_fvo1a_schema_corrections
-- FVO-1a: correcciones al modelo FVO-1 (0016). ADITIVA y CORRECTIVA.
-- No toca migraciones 0001–0016. No elimina datos. Ejecutada por app_admin.

-- ── 1. CURP en patient_demographics ──
-- Dato de identidad nacional. Va con datos personales (dateOfBirth, sex),
-- no en patients (tabla del sistema operativo).
ALTER TABLE "patient_demographics"
  ADD COLUMN IF NOT EXISTS "curp" TEXT;

-- ── 2. CHECK constraints sobre columnas TEXT FVO ──
-- Todos los valores existentes en BD satisfacen estos CHECKs.
ALTER TABLE "patient_demographics"
  ADD CONSTRAINT "chk_demographics_sex"
    CHECK ("sex" IN ('M', 'F', 'NB', 'O'));

ALTER TABLE "patient_medical_alert"
  ADD CONSTRAINT "chk_medical_alert_type"
    CHECK ("alertType" IN ('ALLERGY', 'MEDICATION', 'CONDITION', 'OTHER')),
  ADD CONSTRAINT "chk_medical_alert_severity"
    CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE "patient_data_consent"
  ADD CONSTRAINT "chk_consent_method"
    CHECK ("method" IN ('SIGNATURE', 'VERBAL', 'DIGITAL', 'IMPLICIT')),
  ADD CONSTRAINT "chk_consent_status"
    CHECK ("status" IN ('GRANTED', 'REVOKED'));

-- ── 3. patient_emergency_contact: 1:1 → 1:N ──
-- Constraint verificado: patient_emergency_contact_patientId_key
-- 17 filas actuales, todas 1 por patientId, sin duplicados. Safe to drop.
ALTER TABLE "patient_emergency_contact"
  DROP CONSTRAINT "patient_emergency_contact_patientId_key";

-- ── 4. patient_guardian: 1:1 → 1:N ──
-- Constraint verificado: patient_guardian_patientId_key
-- 1 fila total (nombre NULL). Safe to drop.
ALTER TABLE "patient_guardian"
  DROP CONSTRAINT "patient_guardian_patientId_key";
