// NELZZON — Validadores Zod 7A (Configuración / Catálogos / Onboarding). Fail-closed.
// Precios en centavos (enteros). Porcentajes en basis points (0–10000). Fail-closed en todo.

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────

const centsZ = z.number().int().min(0, "Monto debe ser ≥ 0 centavos");
const minutesZ = z.number().int().min(1, "Duración debe ser ≥ 1 minuto");
const bpsZ = z.number().int().min(0).max(10000, "Basis points deben estar entre 0 y 10 000");

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeZ = z.string().regex(TIME_HH_MM, "Hora debe estar en formato HH:MM");

// RFC MX: 3–4 letras (A-Z, Ñ, &) + 6 dígitos + 3 alfanuméricos.
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const rfcZ = z.string().min(12).max(13).refine(
  (s) => RFC_RE.test(s.trim().toUpperCase()),
  "RFC inválido (formato SAT, debe estar en mayúsculas)"
);

const fiscalZipZ = z.string().regex(/^\d{5}$/, "Código postal debe tener 5 dígitos");

const variableNameZ = z.string().regex(/^[a-z][a-z0-9_]*$/, "Nombre de variable inválido (a-z, 0-9, _)");

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 7A falló: " + r.error.message);
  return r.data;
}

// ── service_catalog ──────────────────────────────────────────────────

export const CreateServiceInputZ = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  basePriceCents: centsZ,
  defaultDurationMin: minutesZ,
  suggestedDepositCents: centsZ.optional().default(0),
  specialty: z.string().max(100).optional(),
});
export type CreateServiceInput = z.infer<typeof CreateServiceInputZ>;

export const UpdateServiceInputZ = z.object({
  name: z.string().min(1).max(200).optional(),
  basePriceCents: centsZ.optional(),
  defaultDurationMin: minutesZ.optional(),
  suggestedDepositCents: centsZ.optional(),
  specialty: z.string().max(100).nullable().optional(),
});
export type UpdateServiceInput = z.infer<typeof UpdateServiceInputZ>;

// ── payment_method_config ─────────────────────────────────────────────

const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "CHECK", "OTHER"] as const;
export const PaymentMethodZ = z.enum(PAYMENT_METHODS);
export type PaymentMethodType = z.infer<typeof PaymentMethodZ>;

export const UpsertPaymentMethodConfigZ = z.object({
  method: PaymentMethodZ,
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0).optional().default(0),
});
export type UpsertPaymentMethodConfigInput = z.infer<typeof UpsertPaymentMethodConfigZ>;

// ── quote_setting ─────────────────────────────────────────────────────

export const UpsertQuoteSettingZ = z.object({
  validityDays: z.number().int().min(1).max(365),
  defaultDepositBps: bpsZ,
});
export type UpsertQuoteSettingInput = z.infer<typeof UpsertQuoteSettingZ>;

// ── clinic_tax_profile ───────────────────────────────────────────────

export const UpsertTaxProfileZ = z.object({
  rfc: rfcZ,
  legalName: z.string().min(1).max(200),
  regimeCode: z.string().min(1).max(10),
  fiscalZip: fiscalZipZ,
  fiscalAddress: z.string().max(300).optional(),
});
export type UpsertTaxProfileInput = z.infer<typeof UpsertTaxProfileZ>;

// ── medication_catalog ───────────────────────────────────────────────

export const CreateMedicationInputZ = z.object({
  name: z.string().min(1).max(200),
  presentation: z.string().max(100).optional(),
  defaultDose: z.string().max(100).optional(),
});
export type CreateMedicationInput = z.infer<typeof CreateMedicationInputZ>;

export const UpdateMedicationInputZ = z.object({
  name: z.string().min(1).max(200).optional(),
  presentation: z.string().max(100).nullable().optional(),
  defaultDose: z.string().max(100).nullable().optional(),
});
export type UpdateMedicationInput = z.infer<typeof UpdateMedicationInputZ>;

// ── document_templates ───────────────────────────────────────────────

const DOC_KINDS = ["PRESCRIPTION", "CONSENT", "DOCUMENT", "MESSAGE"] as const;
export const DocumentTemplateKindZ = z.enum(DOC_KINDS);
export type DocumentTemplateKindType = z.infer<typeof DocumentTemplateKindZ>;

function extractBodyVars(body: string): string[] {
  // Regex creada localmente por llamada — evita estado compartido de lastIndex con /g.
  return [...body.matchAll(/\{\{([^{}]+?)\}\}/g)].map((m) => m[1].trim());
}

export const CreateDocumentTemplateInputZ = z.object({
  kind: DocumentTemplateKindZ,
  name: z.string().min(1).max(200),
  body: z.string().min(1),
  variables: z.array(variableNameZ).default([]),
}).superRefine((data, ctx) => {
  const usedVars = extractBodyVars(data.body);
  for (const v of usedVars) {
    if (!data.variables.includes(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Variable '{{${v}}}' usada en body pero no está en la allowlist de variables` });
    }
  }
});
export type CreateDocumentTemplateInput = z.infer<typeof CreateDocumentTemplateInputZ>;

export const UpdateDocumentTemplateInputZ = z.object({
  name: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  variables: z.array(variableNameZ).optional(),
}).superRefine((data, ctx) => {
  if (data.body && data.variables) {
    const usedVars = extractBodyVars(data.body);
    for (const v of usedVars) {
      if (!data.variables.includes(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Variable '{{${v}}}' usada en body pero no está en la allowlist de variables` });
      }
    }
  }
});
export type UpdateDocumentTemplateInput = z.infer<typeof UpdateDocumentTemplateInputZ>;

// ── notification_rule ────────────────────────────────────────────────

const NOTIF_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"] as const;
export const NotificationChannelZ = z.enum(NOTIF_CHANNELS);

export const UpsertNotificationRuleZ = z.object({
  eventKey: z.string().min(1).max(100),
  channel: NotificationChannelZ,
  enabled: z.boolean(),
  maxPerDay: z.number().int().min(0).max(999),
  quietStart: timeZ.optional(),
  quietEnd: timeZ.optional(),
  requiresOptin: z.boolean().optional().default(false),
});
export type UpsertNotificationRuleInput = z.infer<typeof UpsertNotificationRuleZ>;

// ── import ───────────────────────────────────────────────────────────

export const PatientImportRowZ = z.object({
  phone: z.string().min(1),
  fullName: z.string().min(1).max(200).optional(),
});
export type PatientImportRow = z.infer<typeof PatientImportRowZ>;

export const ServiceImportRowZ = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  basePriceCents: centsZ,
  defaultDurationMin: minutesZ,
  specialty: z.string().max(100).optional(),
  suggestedDepositCents: centsZ.optional(),
});
export type ServiceImportRow = z.infer<typeof ServiceImportRowZ>;

export const RunImportInputZ = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("PATIENTS"), rows: z.array(PatientImportRowZ) }),
  z.object({ kind: z.literal("SERVICES"), rows: z.array(ServiceImportRowZ) }),
]);
export type RunImportInput = z.infer<typeof RunImportInputZ>;
