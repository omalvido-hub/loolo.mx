"use server";

// LOOLO — Server Actions FVO (FVO-1d). Wrappers 1:1 sobre fvo-write.ts.
// Patrón: sesión → actor context → dominio → revalidatePath → ActionResult.
// Sin lógica de negocio. Sin validación propia (vive en el dominio vía Zod).

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import {
  upsertDemographics,
  upsertAddress,
  upsertCommercialOrigin,
  upsertClinicalProfile,
  createMedicalAlert,
  deactivateMedicalAlert,
  upsertTaxProfile,
  addGuardian,
  addEmergencyContact,
  grantConsent,
  revokeConsent,
} from "@/server/domain/patient-record/fvo-write";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

// ── Demografía ────────────────────────────────────────────────────────────────

export async function upsertDemographicsAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ demographicsId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => upsertDemographics(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al guardar demografía." };
  }
}

// ── Domicilio ─────────────────────────────────────────────────────────────────

export async function upsertAddressAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ addressId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => upsertAddress(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al guardar domicilio." };
  }
}

// ── Origen comercial ──────────────────────────────────────────────────────────

export async function upsertCommercialOriginAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ commercialOriginId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => upsertCommercialOrigin(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al guardar origen comercial." };
  }
}

// ── Perfil clínico ────────────────────────────────────────────────────────────

export async function upsertClinicalProfileAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ clinicalProfileId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => upsertClinicalProfile(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al guardar perfil clínico." };
  }
}

// ── Alerta médica — crear ─────────────────────────────────────────────────────

export async function createMedicalAlertAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ alertId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => createMedicalAlert(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al crear alerta médica." };
  }
}

// ── Alerta médica — desactivar ────────────────────────────────────────────────
// patientId: solo para revalidatePath. alertId: para el dominio.

export async function deactivateMedicalAlertAction(
  patientId: string,
  alertId: string,
): Promise<ActionResult> {
  try {
    const { ctx, run } = await getCtx();
    await run((exec) => deactivateMedicalAlert(exec, ctx, alertId));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: undefined };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al desactivar alerta médica." };
  }
}

// ── Datos fiscales del paciente ───────────────────────────────────────────────

export async function upsertTaxProfileAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ taxProfileId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => upsertTaxProfile(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al guardar datos fiscales." };
  }
}

// ── Tutor ─────────────────────────────────────────────────────────────────────

export async function addGuardianAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ guardianId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => addGuardian(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al agregar tutor." };
  }
}

// ── Contacto de emergencia ────────────────────────────────────────────────────

export async function addEmergencyContactAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ contactId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => addEmergencyContact(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al agregar contacto de emergencia." };
  }
}

// ── Consentimiento — otorgar ──────────────────────────────────────────────────

export async function grantConsentAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ consentId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => grantConsent(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al registrar consentimiento." };
  }
}

// ── Consentimiento — revocar ──────────────────────────────────────────────────

export async function revokeConsentAction(
  patientId: string,
  data: unknown,
): Promise<ActionResult<{ consentId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) => revokeConsent(exec, ctx, patientId, data));
    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al revocar consentimiento." };
  }
}
