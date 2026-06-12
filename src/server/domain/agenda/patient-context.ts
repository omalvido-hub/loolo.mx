// NELZZON — Contexto mínimo de paciente para Agenda (FASE 1K-E). Lectura
// tenant-safe (RLS), solo para que /agenda muestre "Paciente: <nombre>" y
// pueda enviar patientId/contactId al crear una cita real. Requiere
// patients.view. Fail-closed: NOT_FOUND si no existe, está archivado, o no
// pertenece a la organización actual (RLS lo filtra). No expone datos
// clínicos ni financieros.

import { can } from "../identity/permissions.js";
import { recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AgendaPatientContext {
  patientId: string;
  contactId: string;
  fullName: string | null;
}

export async function getAgendaPatientContext(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<AgendaPatientContext>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId (fail-closed).");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId (fail-closed).");

  if (!can(ctx.permissions, "patients.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patients.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patients.view");
  }

  if (!UUID_RE.test(patientId)) return fail("NOT_FOUND", "Paciente no encontrado o sin acceso.");

  return run(async (exec): Promise<Result<AgendaPatientContext>> => {
    const rows: any[] = await exec(
      `SELECT p."id" AS "patientId", p."contactId", c."fullName"
       FROM "patients" p
       JOIN "contacts" c ON c."id" = p."contactId"
       WHERE p."id" = $1
         AND p."state" != 'ARCHIVED'
         AND p."archivedAt" IS NULL
         AND p."deletedAt" IS NULL`,
      [patientId],
    );

    if (rows.length === 0) return fail("NOT_FOUND", "Paciente no encontrado o sin acceso.");

    const row = rows[0];
    return ok({
      patientId: row.patientId,
      contactId: row.contactId,
      fullName: row.fullName ?? null,
    });
  });
}
