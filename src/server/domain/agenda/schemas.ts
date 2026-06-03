// LOOLO — Validadores Zod de Agenda (Fase 4A). Enums + payloads. Falla cerrado.

import { z } from "zod";

export const ResourceKindZ = z.enum(["PROFESSIONAL", "CHAIR", "ROOM"]);
export const AppointmentStatusZ = z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW", "RESCHEDULED"]);
export const AppointmentSourceZ = z.enum(["MANUAL", "FROM_CONVERSATION"]);

const MAX_DURATION_MS = 8 * 60 * 60 * 1000; // tope sanidad: 8h

const timeRange = {
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
};
const refineRange = (o: { startAt: Date; endAt: Date }) =>
  o.endAt > o.startAt && (o.endAt.getTime() - o.startAt.getTime()) <= MAX_DURATION_MS;

export const CreateAppointmentInputZ = z.object({
  contactId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  professionalResourceId: z.string().uuid().optional(),
  chairResourceId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  ...timeRange,
}).refine(refineRange, { message: "Rango inválido: endAt>startAt y duración ≤ 8h" });

export const RescheduleInputZ = z.object({
  appointmentId: z.string().uuid(),
  ...timeRange,
}).refine(refineRange, { message: "Rango inválido en reagenda" });

export const CreateResourceInputZ = z.object({
  kind: ResourceKindZ,
  name: z.string().min(1).max(120),
  linkedUserId: z.string().uuid().optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const AvailabilityRuleInputZ = z.object({
  resourceId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
}).refine((o) => o.endMinute > o.startMinute, { message: "endMinute>startMinute" });

export const ScheduleBlockInputZ = z.object({
  resourceId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  ...timeRange,
}).refine((o) => o.endAt > o.startAt, { message: "endAt>startAt" });

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 4A falló: " + r.error.message);
  return r.data;
}
