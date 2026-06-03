// LOOLO — Eventos de dominio TIPADOS y VERSIONADOS (regla 21).
// Un evento solo se emite si su payload valida contra el esquema Zod registrado.
// Esto evita "JSON libre" que corrompe reportes. events != audit_logs.

import { z } from "zod";

/** Catálogo de eventos. type → { version, schema } */
const eventRegistry = {
  "conversation.received": {
    version: 1,
    schema: z.object({
      conversationId: z.string().uuid(),
      channelId: z.string().uuid(),
      channelType: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WEB"]),
      contactId: z.string().uuid().nullable(),
      messageId: z.string().uuid(),
    }),
  },
  "contact.created": {
    version: 1,
    schema: z.object({
      contactId: z.string().uuid(),
      source: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WEB"]).nullable(),
    }),
  },
  // ── Fase 2B-1: eventos OPERATIVOS de configuración (reportables) ──
  "template.applied": {
    version: 1,
    schema: z.object({
      templateKey: z.string().min(1),
      templateVersion: z.number().int(),
      modulesCreated: z.number().int().nonnegative(),
    }),
  },
  "module.enabled": {
    version: 1,
    schema: z.object({ moduleKey: z.string().min(1) }),
  },
  "module.disabled": {
    version: 1,
    schema: z.object({ moduleKey: z.string().min(1) }),
  },
  // ── Fase 2B-2: eventos operativos de dashboard a nivel organización ──
  "dashboard.widget_enabled": {
    version: 1,
    schema: z.object({ widgetKey: z.string().min(1) }),
  },
  "dashboard.widget_disabled": {
    version: 1,
    schema: z.object({ widgetKey: z.string().min(1) }),
  },
  // ── Fase 3A: identidad operativa ──
  "message.received": {
    version: 1,
    schema: z.object({
      messageId: z.string().uuid(),
      conversationId: z.string().uuid(),
      channelId: z.string().uuid(),
      contactId: z.string().uuid(),
    }),
  },
  "contact.promoted_to_patient": {
    version: 1,
    schema: z.object({ contactId: z.string().uuid(), patientId: z.string().uuid() }),
  },
  "contact.promoted_to_prospect": {
    version: 1,
    schema: z.object({ contactId: z.string().uuid(), prospectId: z.string().uuid() }),
  },
  "opportunity.created": {
    version: 1,
    schema: z.object({ opportunityId: z.string().uuid(), contactId: z.string().uuid() }),
  },
  "contact.merged": {
    version: 1,
    schema: z.object({ survivorId: z.string().uuid(), mergedId: z.string().uuid() }),
  },
  // ── Fase 3B: Follow operativo ──
  "conversation.assigned": {
    version: 1,
    schema: z.object({ conversationId: z.string().uuid(), assignedToUserId: z.string().uuid() }),
  },
  "conversation.classified": {
    version: 1,
    schema: z.object({ conversationId: z.string().uuid(), category: z.string().min(1) }),
  },
  "conversation.closed": {
    version: 1,
    schema: z.object({ conversationId: z.string().uuid() }),
  },
  "conversation.reopened": {
    version: 1,
    schema: z.object({ conversationId: z.string().uuid() }),
  },
  "task.created": {
    version: 1,
    schema: z.object({ taskId: z.string().uuid(), conversationId: z.string().uuid() }),
  },
  "task.completed": {
    version: 1,
    schema: z.object({ taskId: z.string().uuid() }),
  },
  // ── Fase 4A: Agenda base ──
  "appointment.scheduled": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid(), startAt: z.string(), endAt: z.string() }),
  },
  "appointment.confirmed": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid() }),
  },
  "appointment.rescheduled": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid(), rescheduledFromId: z.string().uuid() }),
  },
  "appointment.canceled": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid() }),
  },
  "appointment.no_show": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid() }),
  },
  "appointment.completed": {
    version: 1,
    schema: z.object({ appointmentId: z.string().uuid() }),
  },
  // ── Fase 5A: Consulta clínica (SIN contenido clínico en payload, ajuste B) ──
  "clinical.encounter_created": {
    version: 1,
    schema: z.object({ encounterId: z.string().uuid(), patientId: z.string().uuid() }),
  },
  "clinical.encounter_finalized": {
    version: 1,
    schema: z.object({ encounterId: z.string().uuid() }),
  },
  "clinical.encounter_canceled": {
    version: 1,
    schema: z.object({ encounterId: z.string().uuid() }),
  },
  // ── Fase 5B: Odontograma (estructurado mínimo, NUNCA note/texto libre) ──
  "odontogram.finding_recorded": {
    version: 1,
    schema: z.object({
      findingId: z.string().uuid(),
      patientId: z.string().uuid(),
      encounterId: z.string().uuid(),
      toothFdi: z.number().int(),
      findingType: z.string(),
    }),
  },
  "odontogram.finding_superseded": {
    version: 1,
    schema: z.object({
      findingId: z.string().uuid(),
      supersedesFindingId: z.string().uuid(),
      toothFdi: z.number().int(),
    }),
  },
  // ── Fase 5C: Plan de tratamiento (estructurado, NUNCA title/notes/note) ──
  "treatment.plan_created": {
    version: 1,
    schema: z.object({ planId: z.string().uuid(), patientId: z.string().uuid() }),
  },
  "treatment.plan_status_changed": {
    version: 1,
    schema: z.object({ planId: z.string().uuid(), status: z.string() }),
  },
  "treatment.item_added": {
    version: 1,
    schema: z.object({
      itemId: z.string().uuid(),
      planId: z.string().uuid(),
      procedureType: z.string(),
      toothFdi: z.number().int().optional(),
    }),
  },
  "treatment.item_status_changed": {
    version: 1,
    schema: z.object({ itemId: z.string().uuid(), status: z.string() }),
  },
  // ── Fase 6A: Presupuestos (sin montos ni texto libre) ──
  "quote.created": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid(), patientId: z.string().uuid() }),
  },
  "quote.proposed": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid() }),
  },
  "quote.accepted": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid() }),
  },
  "quote.rejected": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid() }),
  },
  "quote.expired": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid() }),
  },
  "quote.canceled": {
    version: 1,
    schema: z.object({ quoteId: z.string().uuid() }),
  },
  // ── Fase 6B: Pagos (sin montos) ──
  "payment.recorded": {
    version: 1,
    schema: z.object({ paymentId: z.string().uuid(), quoteId: z.string().uuid(), patientId: z.string().uuid() }),
  },
  "payment.reversed": {
    version: 1,
    schema: z.object({ paymentId: z.string().uuid(), reversesPaymentId: z.string().uuid(), quoteId: z.string().uuid(), patientId: z.string().uuid() }),
  },
} as const;

export type EventType = keyof typeof eventRegistry;

export interface ValidatedEvent {
  type: EventType;
  version: number;
  payload: unknown;
}

/**
 * Valida un evento contra su esquema. Falla cerrado:
 * si el type no existe o el payload no valida, devuelve error y el evento NO se emite.
 */
export function validateEvent(
  type: string,
  payload: unknown,
):
  | { ok: true; event: ValidatedEvent }
  | { ok: false; error: string } {
  const def = (eventRegistry as Record<string, { version: number; schema: z.ZodTypeAny }>)[type];
  if (!def) return { ok: false, error: `Tipo de evento desconocido: ${type}` };

  const parsed = def.schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: `Payload inválido para ${type}: ${parsed.error.message}` };
  }
  return {
    ok: true,
    event: { type: type as EventType, version: def.version, payload: parsed.data },
  };
}

export function listEventTypes(): { type: string; version: number }[] {
  return Object.entries(eventRegistry).map(([type, def]) => ({ type, version: def.version }));
}
