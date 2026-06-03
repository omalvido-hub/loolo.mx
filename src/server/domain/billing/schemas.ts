// LOOLO — Validadores Zod + transiciones de Presupuesto (Fase 6A). Fail-closed.

import { z } from "zod";
import { ToothSurfaceZ } from "../clinical/odontogram-schemas.js";
import { ProcedureTypeZ } from "../clinical/treatment-schemas.js";

export const QuoteStatusZ = z.enum(["DRAFT", "PROPOSED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELED"]);
export const CurrencyZ = z.enum(["MXN"]);

// Transiciones (matriz explícita).
export const QUOTE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PROPOSED", "CANCELED"],
  PROPOSED: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELED"],
  ACCEPTED: [], REJECTED: [], EXPIRED: [], CANCELED: [],
};
export const QUOTE_TERMINAL = new Set(["ACCEPTED", "REJECTED", "EXPIRED", "CANCELED"]);
export const canQuoteTransition = (from: string, to: string): boolean => (QUOTE_TRANSITIONS[from] ?? []).includes(to);

const fdiOpt = z.number().int().refine(
  (n) => n >= 11 && n <= 48 && Math.floor(n / 10) >= 1 && Math.floor(n / 10) <= 4 && n % 10 >= 1 && n % 10 <= 8,
  { message: "toothFdi inválido (11-48)" },
).optional();

export const LineInputZ = z.object({
  description: z.string().min(1).max(200),
  procedureType: ProcedureTypeZ.optional(),
  toothFdi: fdiOpt,
  surface: ToothSurfaceZ.optional(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  discountCents: z.number().int().min(0).default(0),
  taxRateBps: z.number().int().min(0).max(100000).default(0),
  treatmentPlanItemId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const CreateQuoteInputZ = z.object({
  patientId: z.string().uuid(),
  treatmentPlanId: z.string().uuid().optional(),
  quoteNumber: z.string().max(40).optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(LineInputZ).max(200).optional(),
});

export const AddLineInputZ = LineInputZ.extend({ quoteId: z.string().uuid() });
export const UpdateLineInputZ = z.object({
  lineId: z.string().uuid(),
  description: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(1).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  discountCents: z.number().int().min(0).optional(),
  taxRateBps: z.number().int().min(0).max(100000).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).refine((o) => Object.keys(o).length > 1, { message: "updateLine requiere al menos un campo" });

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 6A falló: " + r.error.message);
  return r.data;
}
