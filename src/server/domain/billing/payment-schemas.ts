// NELZZON — Validadores Zod de Pagos (Fase 6B). Fail-closed.
// reference opcional ≤60, con validación anti-PAN (sin 13–19 dígitos seguidos).

import { z } from "zod";

export const PaymentMethodZ = z.enum(["CASH", "CARD", "TRANSFER", "CHECK", "OTHER"]);

// Rechaza secuencias de 13–19 dígitos seguidos (tarjeta/CLABE) en texto libre.
const noPan = (s: string | undefined): boolean => !(s && /\d{13,19}/.test(s));
const referenceZ = z.string().max(60).optional().refine(noPan, { message: "reference no debe contener números de tarjeta/CLABE (13-19 dígitos seguidos)" });

export const RecordPaymentInputZ = z.object({
  quoteId: z.string().uuid(),
  amountCents: z.number().int().min(1),
  method: PaymentMethodZ,
  reference: referenceZ,
});

export const ReversePaymentInputZ = z.object({
  paymentId: z.string().uuid(),
  reference: referenceZ,
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 6B falló: " + r.error.message);
  return r.data;
}
