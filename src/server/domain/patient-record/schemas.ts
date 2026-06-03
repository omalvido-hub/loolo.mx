// LOOLO — Schemas Zod de salida para PatientLiveRecord (Fase 7B).
// Solo lectura. Agregado de metadatos; NUNCA contenido clínico libre ni body de notas.
// Montos en centavos MXN (number integer). Fechas ISO 8601.

import { z } from "zod";

const AppointmentSummarySchema = z.object({
  id: z.string().uuid(),
  startAt: z.string().datetime(),
  status: z.string(),
  reason: z.string().nullable().optional(),
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
});

export type PatientLiveRecord = z.infer<typeof PatientLiveRecordSchema>;
