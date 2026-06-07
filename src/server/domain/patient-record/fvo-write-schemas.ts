// NELZZON — Schemas Zod de entrada para escritura FVO-1c. Fail-closed.
// Validan antes de tocar la BD. No incluyen campos calculados ni createdAt/updatedAt.
// Sin campos de auditoría en los schemas de entrada.

import { z } from "zod";

// CURP MX: 18 caracteres — 4 letras + 6 dígitos + H/M + 5 letras + 2 alfanuméricos.
const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;

// RFC MX: 3–4 letras (A-Z, Ñ, &) + 6 dígitos + 3 alfanuméricos.
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación FVO-1c falló: " + r.error.message);
  return r.data;
}

// ── patient_demographics ──────────────────────────────────────────────────────

const SEX_VALUES    = ["M", "F", "NB", "O"] as const;
const BLOOD_TYPES   = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "U"] as const;
const MARITAL_STATI = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"] as const;

export const UpsertDemographicsZ = z.object({
  dateOfBirth:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido").nullable().optional(),
  sex:           z.enum(SEX_VALUES).nullable().optional(),
  bloodType:     z.enum(BLOOD_TYPES).nullable().optional(),
  occupation:    z.string().max(200).nullable().optional(),
  maritalStatus: z.enum(MARITAL_STATI).nullable().optional(),
  curp:          z.string().length(18).refine(
    (s) => CURP_RE.test(s.trim().toUpperCase()),
    "CURP inválido (18 caracteres, formato SEP)",
  ).nullable().optional(),
});
export type UpsertDemographicsInput = z.infer<typeof UpsertDemographicsZ>;

// ── patient_address ───────────────────────────────────────────────────────────

export const UpsertAddressZ = z.object({
  street:       z.string().max(300).nullable().optional(),
  extNumber:    z.string().max(20).nullable().optional(),
  intNumber:    z.string().max(20).nullable().optional(),
  neighborhood: z.string().max(200).nullable().optional(),
  municipality: z.string().max(200).nullable().optional(),
  state:        z.string().max(100).nullable().optional(),
  postalCode:   z.string().max(10).nullable().optional(),
  country:      z.string().max(5).nullable().optional().default("MX"),
});
export type UpsertAddressInput = z.infer<typeof UpsertAddressZ>;

// ── patient_commercial_origin ─────────────────────────────────────────────────

const CHANNELS = ["WHATSAPP", "INSTAGRAM", "REFERRAL", "WALK_IN", "WEB", "OTHER"] as const;

export const UpsertCommercialOriginZ = z.object({
  channel:       z.enum(CHANNELS).nullable().optional(),
  campaign:      z.string().max(200).nullable().optional(),
  referredBy:    z.string().max(200).nullable().optional(),
  initialReason: z.string().max(500).nullable().optional(),
});
export type UpsertCommercialOriginInput = z.infer<typeof UpsertCommercialOriginZ>;

// ── patient_clinical_profile ──────────────────────────────────────────────────

export const UpsertClinicalProfileZ = z.object({
  knownAllergies:      z.array(z.string().max(200)).nullable().optional(),
  currentMedications:  z.array(z.string().max(200)).nullable().optional(),
  relevantHistory:     z.string().max(5000).nullable().optional(),
  safetyNotes:         z.string().max(2000).nullable().optional(),
});
export type UpsertClinicalProfileInput = z.infer<typeof UpsertClinicalProfileZ>;

// ── patient_medical_alert ─────────────────────────────────────────────────────

const ALERT_TYPES = ["ALLERGY", "MEDICATION", "CONDITION", "OTHER"] as const;
const SEVERITIES  = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const CreateMedicalAlertZ = z.object({
  alertType:   z.enum(ALERT_TYPES),
  severity:    z.enum(SEVERITIES),
  description: z.string().min(1).max(500),
});
export type CreateMedicalAlertInput = z.infer<typeof CreateMedicalAlertZ>;

// ── patient_tax_profile ───────────────────────────────────────────────────────

export const UpsertPatientTaxProfileZ = z.object({
  rfc: z.string().min(12).max(13).refine(
    (s) => RFC_RE.test(s.trim().toUpperCase()),
    "RFC inválido (formato SAT)",
  ).nullable().optional(),
  legalName:     z.string().max(300).nullable().optional(),
  taxRegime:     z.string().max(50).nullable().optional(),
  cfdiUse:       z.string().max(50).nullable().optional(),
  taxPostalCode: z.string().regex(/^\d{5}$/, "Código postal fiscal debe tener 5 dígitos").nullable().optional(),
});
export type UpsertPatientTaxProfileInput = z.infer<typeof UpsertPatientTaxProfileZ>;

// ── patient_guardian ──────────────────────────────────────────────────────────

const GUARDIAN_RELATIONSHIPS = ["PARENT", "SIBLING", "SPOUSE", "OTHER"] as const;

export const AddGuardianZ = z.object({
  name:         z.string().max(200).nullable().optional(),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS).nullable().optional(),
  phone:        z.string().max(30).nullable().optional(),
  email:        z.string().email("Email de tutor inválido").max(200).nullable().optional(),
});
export type AddGuardianInput = z.infer<typeof AddGuardianZ>;

// ── patient_emergency_contact ─────────────────────────────────────────────────

export const AddEmergencyContactZ = z.object({
  name:         z.string().max(200).nullable().optional(),
  relationship: z.string().max(100).nullable().optional(),
  phone:        z.string().max(30).nullable().optional(),
});
export type AddEmergencyContactInput = z.infer<typeof AddEmergencyContactZ>;

// ── patient_data_consent ──────────────────────────────────────────────────────

const CONSENT_METHODS = ["SIGNATURE", "VERBAL", "DIGITAL", "IMPLICIT"] as const;

export const GrantConsentZ = z.object({
  consentType: z.string().min(1).max(100).default("DATA_TREATMENT"),
  method:      z.enum(CONSENT_METHODS),
  version:     z.string().max(50).nullable().optional(),
});
export type GrantConsentInput = z.infer<typeof GrantConsentZ>;

export const RevokeConsentZ = z.object({
  consentType: z.string().min(1).max(100).default("DATA_TREATMENT"),
});
export type RevokeConsentInput = z.infer<typeof RevokeConsentZ>;
