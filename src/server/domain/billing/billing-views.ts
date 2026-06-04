// LOOLO — Proyección segura de Presupuestos y Pagos (UI-6, solo lectura).
// NUNCA devuelve: notes, reference, createdBy, organizationId.
// Exige quote.view. Fail-closed ante falta de tenant, actor o permiso.
// Audita el acceso sin texto libre ni montos sensibles de líneas individuales.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { computeBalance } from "./payments-calc.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── DTOs públicos ──────────────────────────────────────────────────────────

export interface QuoteLineView {
  id: string;
  description: string;
  procedureType: string | null;
  toothFdi: number | null;
  surface: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  taxRateBps: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  sortOrder: number;
  treatmentPlanItemId: string | null;
}

export interface PaymentEntryView {
  id: string;
  entryKind: "PAYMENT" | "REVERSAL";
  amountCents: number;
  method: string;
  reversesPaymentId: string | null;
  paidAt: string | null;
}

export interface QuoteView {
  id: string;
  status: string;
  currency: string;
  quoteNumber: string | null;
  validUntil: string | null;
  treatmentPlanId: string | null;
  subtotalCents: number;
  discountTotalCents: number;
  taxTotalCents: number;
  totalCents: number;
  createdAt: string;
  proposedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  canceledAt: string | null;
  expiredAt: string | null;
  lines: QuoteLineView[];
  payments: PaymentEntryView[];
  paidCents: number;
  balanceCents: number;
  liquidado: boolean;
}

export interface PatientQuotesView {
  patientId: string;
  quotes: QuoteView[];
  totalQuotes: number;
}

// ─── getQuotesSafeView ──────────────────────────────────────────────────────

/**
 * Presupuestos del paciente con sus líneas y saldo calculado.
 * Exige quote.view. Fail-closed si falta tenant, actor o permiso.
 * NUNCA devuelve notes, reference, createdBy ni organizationId.
 * Audita el acceso sin contenido financiero libre.
 */
export async function getQuotesSafeView(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<PatientQuotesView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "quote.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "quote.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: quote.view");
  }

  return run(async (exec) => {
    // SELECT explícito — sin notes, sin createdBy, sin organizationId.
    const quoteRows = await exec(
      `SELECT "id","status","currency","quoteNumber","validUntil","treatmentPlanId",
              "subtotalCents","discountTotalCents","taxTotalCents","totalCents",
              "createdAt","proposedAt","acceptedAt","rejectedAt","canceledAt","expiredAt"
       FROM "quotes"
       WHERE "patientId" = $1
       ORDER BY "createdAt" DESC`,
      [patientId],
    );

    const quoteIds: string[] = quoteRows.map((q: any) => q.id);
    let allLines: any[] = [];
    let allPayments: any[] = [];

    if (quoteIds.length > 0) {
      // SELECT explícito — sin organizationId.
      allLines = await exec(
        `SELECT "id","quoteId","description","procedureType","toothFdi","surface",
                "quantity","unitPriceCents","discountCents","taxRateBps",
                "subtotalCents","taxCents","totalCents","sortOrder","treatmentPlanItemId"
         FROM "quote_lines"
         WHERE "quoteId" = ANY($1)
         ORDER BY "quoteId" ASC, "sortOrder" ASC, "createdAt" ASC`,
        [quoteIds],
      );

      // Payment entries — sin reference, sin recordedByUserId, sin organizationId.
      allPayments = await exec(
        `SELECT "id","quoteId","entryKind","amountCents","method","reversesPaymentId","paidAt"
         FROM "payments"
         WHERE "quoteId" = ANY($1)
         ORDER BY "quoteId" ASC, "createdAt" ASC`,
        [quoteIds],
      );
    }

    const linesByQuote: Record<string, any[]> = {};
    for (const l of allLines) {
      if (!linesByQuote[l.quoteId]) linesByQuote[l.quoteId] = [];
      linesByQuote[l.quoteId].push(l);
    }

    const paymentsByQuote: Record<string, any[]> = {};
    for (const p of allPayments) {
      if (!paymentsByQuote[p.quoteId]) paymentsByQuote[p.quoteId] = [];
      paymentsByQuote[p.quoteId].push(p);
    }

    const quotes: QuoteView[] = quoteRows.map((q: any) => {
      const lines: QuoteLineView[] = (linesByQuote[q.id] ?? []).map((l: any) => ({
        id: l.id,
        description: l.description,
        procedureType: l.procedureType ?? null,
        toothFdi: l.toothFdi != null ? Number(l.toothFdi) : null,
        surface: l.surface ?? null,
        quantity: Number(l.quantity),
        unitPriceCents: Number(l.unitPriceCents),
        discountCents: Number(l.discountCents),
        taxRateBps: Number(l.taxRateBps),
        subtotalCents: Number(l.subtotalCents),
        taxCents: Number(l.taxCents),
        totalCents: Number(l.totalCents),
        sortOrder: Number(l.sortOrder),
        treatmentPlanItemId: l.treatmentPlanItemId ?? null,
      }));

      const payRows = paymentsByQuote[q.id] ?? [];
      const entries = payRows.map((p: any) => ({
        entryKind: p.entryKind as "PAYMENT" | "REVERSAL",
        amountCents: Number(p.amountCents),
      }));
      const { paidCents, balanceCents, liquidado } = computeBalance(Number(q.totalCents), entries);

      const payments: PaymentEntryView[] = payRows.map((p: any) => ({
        id: p.id,
        entryKind: p.entryKind as "PAYMENT" | "REVERSAL",
        amountCents: Number(p.amountCents),
        method: p.method,
        reversesPaymentId: p.reversesPaymentId ?? null,
        paidAt: toIso(p.paidAt),
      }));

      return {
        id: q.id,
        status: q.status,
        currency: q.currency,
        quoteNumber: q.quoteNumber ?? null,
        validUntil: toIso(q.validUntil),
        treatmentPlanId: q.treatmentPlanId ?? null,
        subtotalCents: Number(q.subtotalCents),
        discountTotalCents: Number(q.discountTotalCents),
        taxTotalCents: Number(q.taxTotalCents),
        totalCents: Number(q.totalCents),
        createdAt: toIso(q.createdAt) ?? new Date().toISOString(),
        proposedAt: toIso(q.proposedAt),
        acceptedAt: toIso(q.acceptedAt),
        rejectedAt: toIso(q.rejectedAt),
        canceledAt: toIso(q.canceledAt),
        expiredAt: toIso(q.expiredAt),
        lines,
        payments,
        paidCents,
        balanceCents,
        liquidado,
      };
    });

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "quote.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { accessType: "getQuotesSafeView", count: quotes.length },
    });

    return ok<PatientQuotesView>({
      patientId,
      quotes,
      totalQuotes: quotes.length,
    });
  });
}
