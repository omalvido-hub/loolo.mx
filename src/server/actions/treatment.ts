"use server";

// NELZZON — Server Actions de Plan de tratamiento (FASE 1A). Wrappers 1:1 sobre
// src/server/domain/clinical/treatment.ts. Patrón: sesión → actor context →
// dominio → revalidatePath → ActionResult. Sin lógica de negocio propia; la
// validación (Zod) y los permisos viven en el dominio (authorize()).

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import {
  createPlan,
  addItem,
  updateItem,
  setPlanStatus,
  setItemStatus,
} from "@/server/domain/clinical/treatment";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

// ── Crear plan de tratamiento ───────────────────────────────────────────────

export async function createPlanAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ planId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => createPlan(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al crear el plan de tratamiento." };
  }
}

// ── Agregar ítem al plan ─────────────────────────────────────────────────────

export async function addItemAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ itemId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => addItem(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al agregar el ítem al plan." };
  }
}

// ── Editar ítem del plan (no terminal) ──────────────────────────────────────

export async function updateItemAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ itemId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => updateItem(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al editar el ítem del plan." };
  }
}

// ── Cambiar estado del plan ──────────────────────────────────────────────────

export async function setPlanStatusAction(
  patientId: string,
  planId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => setPlanStatus(exec, ctx, planId, status));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al cambiar el estado del plan." };
  }
}

// ── Cambiar estado del ítem ──────────────────────────────────────────────────

export async function setItemStatusAction(
  patientId: string,
  itemId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => setItemStatus(exec, ctx, itemId, status));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al cambiar el estado del ítem." };
  }
}
