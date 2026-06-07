"use server";

// NELZZON — Server Actions de Odontograma (UI-7B-B + Lifecycle 1A).
// Wrapper 1:1 sobre el dominio odontogram.ts.
// Patrón: sesión → actor context → dominio → revalidatePath → ActionResult.

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { recordFinding, voidFinding, treatFinding, resolveFinding } from "@/server/domain/clinical/odontogram";
import { getToothHistory } from "@/server/domain/clinical/odontogram-views";
import type { ToothHistoryView } from "@/server/domain/clinical/odontogram-views";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

export async function recordFindingAction(
  patientId: string,
  encounterId: string,
  data: {
    toothFdi: number;
    findingType: string;
    toothStatus: string;
    surface?: string;
    note?: string;
  },
): Promise<ActionResult<{ findingId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) =>
      recordFinding(exec, ctx, { patientId, encounterId, ...data }),
    );
    revalidatePath(`/pacientes/${patientId}/consultas/${encounterId}`);
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al registrar el hallazgo." };
  }
}

export async function voidFindingAction(
  patientId: string,
  data: { findingId: string; lifecycleReason: string; encounterId?: string },
): Promise<ActionResult<{ findingId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => voidFinding(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    if (data.encounterId) revalidatePath(`/pacientes/${patientId}/consultas/${data.encounterId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al anular el hallazgo." };
  }
}

export async function treatFindingAction(
  patientId: string,
  data: { findingId: string; lifecycleReason?: string; linkedTreatmentItemId?: string; encounterId?: string },
): Promise<ActionResult<{ findingId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => treatFinding(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    if (data.encounterId) revalidatePath(`/pacientes/${patientId}/consultas/${data.encounterId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al marcar el hallazgo como tratado." };
  }
}

export async function resolveFindingAction(
  patientId: string,
  data: { findingId: string; targetStatus: "RESOLVED" | "CONTROLLED" | "OBSERVATION"; lifecycleReason?: string; encounterId?: string },
): Promise<ActionResult<{ findingId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => resolveFinding(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    if (data.encounterId) revalidatePath(`/pacientes/${patientId}/consultas/${data.encounterId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al resolver el hallazgo." };
  }
}

// Lectura del historial cronológico de una pieza (TOOTH-HISTORY-1A). Solo lectura.
export async function getToothHistoryAction(
  patientId: string,
  toothFdi: number,
): Promise<ActionResult<ToothHistoryView>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await getToothHistory(run, ctx, patientId, toothFdi);
    if (!result.ok) {
      return { ok: false, error: result.detail ?? result.reason };
    }
    return { ok: true, data: result.value };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al cargar el historial de la pieza." };
  }
}
