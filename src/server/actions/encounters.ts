"use server";

// NELZZON — Server Actions de Consulta clínica (NELZZON-ENCOUNTERS-1A-ACTIONS).
// Wrappers 1:1 sobre el dominio encounters.ts (Fase 5A). Sin lógica clínica propia:
// la validación (Zod), las transiciones de estado y el enforcement de permisos
// (clinical.create/edit/finalize/cancel/clinical_notes.add) viven en el dominio.
// Patrón: sesión → actor context → dominio → revalidatePath → ActionResult.

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import {
  createEncounter,
  startEncounter,
  updateEncounter,
  addClinicalNote,
  finalizeEncounter,
  cancelEncounter,
} from "@/server/domain/clinical/encounters";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

// ── Crear consulta ────────────────────────────────────────────────────────────

export async function createEncounterAction(
  patientId: string,
  data: {
    appointmentId?: string;
    professionalResourceId?: string;
    chiefComplaint: string;
    preliminaryDiagnosis?: string;
    observations?: string;
    indications?: string;
  },
): Promise<ActionResult<{ encounterId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => createEncounter(exec, ctx, { patientId, ...data }));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al crear la consulta." };
  }
}

// ── Iniciar consulta (DRAFT → IN_PROGRESS) ────────────────────────────────────

export async function startEncounterAction(
  patientId: string,
  encounterId: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => startEncounter(exec, ctx, encounterId));
    revalidatePath(`/pacientes/${patientId}/consultas/${encounterId}`);
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al iniciar la consulta." };
  }
}

// ── Editar consulta (solo DRAFT/IN_PROGRESS — FINALIZED inmutable) ───────────

export async function updateEncounterAction(
  patientId: string,
  data: {
    encounterId: string;
    chiefComplaint?: string;
    preliminaryDiagnosis?: string;
    observations?: string;
    indications?: string;
  },
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => updateEncounter(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}/consultas/${data.encounterId}`);
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al editar la consulta." };
  }
}

// ── Agregar nota clínica (append-only) ────────────────────────────────────────

export async function addClinicalNoteAction(
  patientId: string,
  data: { encounterId: string; body: string },
): Promise<ActionResult<{ noteId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => addClinicalNote(exec, ctx, data));
    revalidatePath(`/pacientes/${patientId}/consultas/${data.encounterId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al agregar la nota clínica." };
  }
}

// ── Finalizar consulta (DRAFT/IN_PROGRESS → FINALIZED, inmutable) ────────────

export async function finalizeEncounterAction(
  patientId: string,
  encounterId: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => finalizeEncounter(exec, ctx, encounterId));
    revalidatePath(`/pacientes/${patientId}/consultas/${encounterId}`);
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al finalizar la consulta." };
  }
}

// ── Cancelar consulta (DRAFT/IN_PROGRESS → CANCELED) ──────────────────────────

export async function cancelEncounterAction(
  patientId: string,
  encounterId: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => cancelEncounter(exec, ctx, encounterId));
    revalidatePath(`/pacientes/${patientId}/consultas/${encounterId}`);
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al cancelar la consulta." };
  }
}
