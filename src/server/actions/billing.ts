"use server";

// LOOLO — Server Actions de Billing (UI-6).
// Mutaciones: crear presupuesto, editar precio de línea, cambiar estado, registrar pago.
// Cada acción: sesión → actor context → dominio → revalidatePath.
// Fail-closed: errores de sesión/permisos devuelven { ok: false, error }.

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import {
  createQuote,
  setQuoteStatus,
  updateLine,
} from "@/server/domain/billing/quotes";
import { recordPayment, reversePayment } from "@/server/domain/billing/payments";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

// ─── Crear presupuesto desde plan activo ────────────────────────────────────

export async function createQuoteFromPlanAction(
  patientId: string,
  treatmentPlanId: string,
  lines: Array<{
    description: string;
    treatmentPlanItemId: string;
    unitPriceCents: number;
    sortOrder: number;
  }>,
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const { quoteId } = await run((exec) =>
      createQuote(exec, ctx, {
        patientId,
        treatmentPlanId,
        lines: lines.map((l) => ({
          description: l.description,
          treatmentPlanItemId: l.treatmentPlanItemId,
          quantity: 1,
          unitPriceCents: l.unitPriceCents,
          discountCents: 0,
          taxRateBps: 0,
          sortOrder: l.sortOrder,
        })),
      }),
    );
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: { quoteId } };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al crear presupuesto." };
  }
}

// ─── Actualizar precio de línea (solo DRAFT) ────────────────────────────────

export async function updateLinePriceAction(
  patientId: string,
  lineId: string,
  unitPriceCents: number,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => updateLine(exec, ctx, { lineId, unitPriceCents }));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al actualizar precio." };
  }
}

// ─── Actualizar descuento de línea (solo DRAFT) ──────────────────────────────

export async function updateLineDiscountAction(
  patientId: string,
  lineId: string,
  discountCents: number,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => updateLine(exec, ctx, { lineId, discountCents }));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al actualizar descuento." };
  }
}

// ─── Cambiar estado del presupuesto ─────────────────────────────────────────

export async function setQuoteStatusAction(
  patientId: string,
  quoteId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => setQuoteStatus(exec, ctx, quoteId, status));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al cambiar estado." };
  }
}

// ─── Registrar pago ─────────────────────────────────────────────────────────

export async function recordPaymentAction(
  patientId: string,
  quoteId: string,
  amountCents: number,
  method: string,
): Promise<ActionResult<{ paymentId: string; balanceAfterCents: number }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) =>
      recordPayment(exec, ctx, { quoteId, amountCents, method }),
    );
    revalidatePath(`/pacientes/${patientId}`);
    return {
      ok: true,
      data: { paymentId: result.paymentId, balanceAfterCents: result.balanceAfterCents },
    };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al registrar pago." };
  }
}

// ─── Revertir pago ────────────────────────────────────────────────────────────

export async function reversePaymentAction(
  patientId: string,
  paymentId: string,
  reference?: string,
): Promise<ActionResult<{ paymentId: string; balanceAfterCents: number }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) =>
      reversePayment(exec, ctx, { paymentId, reference }),
    );
    revalidatePath(`/pacientes/${patientId}`);
    return {
      ok: true,
      data: { paymentId: result.paymentId, balanceAfterCents: result.balanceAfterCents },
    };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al revertir pago." };
  }
}
