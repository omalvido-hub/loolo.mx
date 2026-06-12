"use server";

// NELZZON — Server Actions de Agenda (FASE 1K-B). Wrapper 1:1 sobre
// src/server/domain/agenda/appointments.ts. Patrón: sesión → actor context →
// dominio → revalidatePath → ActionResult. Sin lógica de negocio propia; la
// validación (Zod), permisos, disponibilidad y anti-solapamiento viven en el
// dominio (authorize() + createAppointment()).

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { PermissionDeniedError } from "@/server/domain/identity/authorize";
import {
  createAppointment,
  OverlapError,
  NotAvailableError,
  TransitionError,
  OrgRefError,
} from "@/server/domain/agenda/appointments";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

// ── Crear cita ──────────────────────────────────────────────────────────────

export async function createAppointmentAction(
  input: unknown,
): Promise<ActionResult<{ appointmentId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const { appointmentId } = await run((exec) => createAppointment(exec, ctx, input));

    revalidatePath("/agenda");
    const patientId = (input as { patientId?: unknown } | null)?.patientId;
    if (typeof patientId === "string" && patientId) {
      revalidatePath(`/pacientes/${patientId}`);
    }

    return { ok: true, data: { appointmentId } };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    if (e instanceof PermissionDeniedError) {
      return { ok: false, error: "No tienes permiso para crear citas." };
    }
    if (e instanceof OverlapError) {
      return { ok: false, error: "El horario se cruza con otra cita." };
    }
    if (e instanceof NotAvailableError) {
      return { ok: false, error: "El horario no está disponible." };
    }
    if (e instanceof OrgRefError) {
      return { ok: false, error: "La cita tiene referencias inválidas para esta organización." };
    }
    if (e instanceof TransitionError) {
      return { ok: false, error: "No se pudo completar la operación de la cita." };
    }
    if (e instanceof Error && e.message.startsWith("Validación")) {
      return { ok: false, error: "Revisa los datos de la cita." };
    }
    return { ok: false, error: "No se pudo crear la cita." };
  }
}
