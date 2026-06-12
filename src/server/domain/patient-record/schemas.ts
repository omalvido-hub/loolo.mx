// NELZZON — Schemas Zod de salida para PatientLiveRecord (Fase 7B + FVO-1).
// Solo lectura. Agregado de metadatos; NUNCA contenido clínico libre ni body de notas.
// Montos en centavos MXN (number integer). Fechas ISO 8601.
// FVO-1: agrega secciones extendidas de perfil del paciente (datos demográficos, clínicos, fiscales, etc.).

import { z } from "zod";

const AppointmentSummarySchema = z.object({
  id: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  professionalResourceId: z.string().uuid().nullable().optional(),
  chairResourceId: z.string().uuid().nullable().optional(),
  professionalName: z.string().nullable().optional(),
  chairName: z.string().nullable().optional(),
});

export const IdentitySectionSchema = z.object({
  patientId: z.string().uuid(),
  contactId: z.string().uuid(),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  phoneNormalized: z.string().nullable(),
  emailNormalized: z.string().nullable(),
  source: z.string().nullable(),
  patientStatus: z.string(),
  patientState: z.string(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const OperativeSectionSchema = z.object({
  nextAppointment: AppointmentSummarySchema.nullable(),
  lastAppointment: AppointmentSummarySchema.nullable(),
  openConversationsCount: z.number().int().nonnegative(),
  openTasksCount: z.number().int().nonnegative(),
  lastActivityAt: z.string().datetime().nullable(),
});

// Solo metadatos: conteos, fechas, estado. NUNCA body/contenido clínico.
export const ClinicalSectionSchema = z.object({
  encountersCount: z.number().int().nonnegative(),
  lastEncounterAt: z.string().datetime().nullable(),
  lastEncounterStatus: z.string().nullable(),
  notesCount: z.number().int().nonnegative(),
  lastNoteAt: z.string().datetime().nullable(),
});

export const OdontogramSummarySectionSchema = z.object({
  totalFindings: z.number().int().nonnegative(),
  findingsByStatus: z.record(z.string(), z.number().int().nonnegative()),
});

export const TreatmentSectionSchema = z.object({
  activePlanId: z.string().uuid().nullable(),
  activePlanStatus: z.string().nullable(),
  plansCount: z.number().int().nonnegative(),
  itemsByStatus: z.record(z.string(), z.number().int().nonnegative()),
});

// Montos enteros (centavos MXN). Sin float.
export const FinancialSectionSchema = z.object({
  quotesCount: z.number().int().nonnegative(),
  quotesByStatus: z.record(z.string(), z.number().int().nonnegative()),
  totalProposedCents: z.number().int(),
  totalAcceptedCents: z.number().int(),
  balanceCents: z.number().int(),
  paidCents: z.number().int(),
  hasReversals: z.boolean(),
});

export const TaskEntrySummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]),
  dueAt: z.string().datetime().nullable(),
  conversationId: z.string().uuid().optional(),
});

export const TimelineEventSchema = z.object({
  eventType: z.string(),
  label: z.string(),
  entityId: z.string().uuid().optional(),
  occurredAt: z.string().datetime(),
});

export const RecommendedActionSchema = z.object({
  code: z.string(),
  reason: z.string(),
});

export const RecordMetaSchema = z.object({
  resolvedAt: z.string().datetime(),
  visibleSections: z.array(z.string()),
  patientState: z.string(),
});

// ── FVO-1: secciones extendidas del perfil del paciente ──

// Bandera de alerta médica: solo para roles sin patient.clinical_profile.view.
// No expone tipo ni descripción: solo indica si existe y cuántas son de alto riesgo.
export const MedicalAlertFlagSchema = z.object({
  hasActiveAlerts: z.boolean(),
  highSeverityCount: z.number().int().nonnegative(),
});

// Alerta médica completa: solo para roles con patient.clinical_profile.view.
export const MedicalAlertDetailSchema = z.object({
  id: z.string().uuid(),
  alertType: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});

export const PatientDemographicsSectionSchema = z.object({
  dateOfBirth: z.string().nullable(),   // Formato YYYY-MM-DD
  age: z.number().int().nonnegative().nullable(),
  sex: z.string().nullable(),
  bloodType: z.string().nullable(),
  occupation: z.string().nullable(),
  maritalStatus: z.string().nullable(),
});

export const PatientAddressSectionSchema = z.object({
  street: z.string().nullable(),
  extNumber: z.string().nullable(),
  intNumber: z.string().nullable(),
  neighborhood: z.string().nullable(),
  municipality: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
});

export const PatientTaxSectionSchema = z.object({
  rfc: z.string().nullable(),
  legalName: z.string().nullable(),
  taxRegime: z.string().nullable(),
  cfdiUse: z.string().nullable(),
  taxPostalCode: z.string().nullable(),
});

// Perfil clínico completo: alergias, medicamentos, antecedentes, notas de seguridad y alertas detalladas.
// Solo para roles con patient.clinical_profile.view.
export const PatientClinicalProfileSectionSchema = z.object({
  knownAllergies: z.array(z.string()),
  currentMedications: z.array(z.string()),
  relevantHistory: z.string().nullable(),
  safetyNotes: z.string().nullable(),
  medicalAlerts: z.array(MedicalAlertDetailSchema),
});

export const PatientInsuranceSectionSchema = z.object({
  hasInsurance: z.boolean(),
  providerName: z.string().nullable(),
  policyNumber: z.string().nullable(),
  policyholderName: z.string().nullable(),
  planName: z.string().nullable(),
  validFrom: z.string().nullable(),   // Formato YYYY-MM-DD
  validUntil: z.string().nullable(),  // Formato YYYY-MM-DD
  notes: z.string().nullable(),
});

export const PatientGuardianSectionSchema = z.object({
  name: z.string().nullable(),
  relationship: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});

export const PatientEmergencyContactSectionSchema = z.object({
  name: z.string().nullable(),
  relationship: z.string().nullable(),
  phone: z.string().nullable(),
});

export const PatientCommercialOriginSectionSchema = z.object({
  channel: z.string().nullable(),
  campaign: z.string().nullable(),
  referredBy: z.string().nullable(),
  initialReason: z.string().nullable(),
});

export const PatientConsentSectionSchema = z.object({
  status: z.string().nullable(),
  grantedAt: z.string().datetime().nullable(),
  version: z.string().nullable(),
  method: z.string().nullable(),
});

export const PatientLiveRecordSchema = z.object({
  identity: IdentitySectionSchema,
  operative: OperativeSectionSchema,
  // Secciones opcionales: se omiten si falta el permiso (no null revelador)
  clinical: ClinicalSectionSchema.optional(),
  odontogramSummary: OdontogramSummarySectionSchema.optional(),
  treatment: TreatmentSectionSchema.optional(),
  financial: FinancialSectionSchema.optional(),
  tasks: z.array(TaskEntrySummarySchema).optional(),
  timeline: z.array(TimelineEventSchema),
  recommendedActions: z.array(RecommendedActionSchema),
  _meta: RecordMetaSchema,
  // FVO-1: secciones extendidas del perfil (opcionales por permiso)
  demographics: PatientDemographicsSectionSchema.optional(),
  address: PatientAddressSectionSchema.optional(),
  insurance: PatientInsuranceSectionSchema.optional(),
  guardian: PatientGuardianSectionSchema.optional(),
  emergencyContact: PatientEmergencyContactSectionSchema.optional(),
  commercialOrigin: PatientCommercialOriginSectionSchema.optional(),
  consent: PatientConsentSectionSchema.optional(),
  medicalAlertFlag: MedicalAlertFlagSchema.optional(),
  clinicalProfile: PatientClinicalProfileSectionSchema.optional(),
  tax: PatientTaxSectionSchema.optional(),
});

export type PatientLiveRecord = z.infer<typeof PatientLiveRecordSchema>;
export type MedicalAlertDetail = z.infer<typeof MedicalAlertDetailSchema>;
