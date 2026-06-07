// NELZZON — Proyección segura de consultas clínicas (UI-3, solo lectura;
// NELZZON-CLINICAL-NOTES-1B amplía a notas con autor y contenido).
// getEncounterSafeView SÍ devuelve clinical_notes.body y authorName — es la única
// vista autorizada para ello (exige clinical.view, fail-closed, anti-IDOR).
// listEncountersSafeForPatient sigue sin exponer body (solo conteo/metadatos).
// NUNCA exponer body/authorName fuera de esta vista: ni en auditoría, eventos,
// búsqueda global ni reportes (regla NO NEGOCIABLE — datos clínicos).
// Audita el acceso SIN contenido sensible.

import { can } from "../identity/permissions.js";
import { resolveMemberDisplayNames } from "../../auth/identity-names.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── DTOs públicos ─────────────────────────────────────────────────────────

export interface NoteMetaItem {
  id: string;
  createdAt: string;
  authorName: string | null;
  body: string;
}

export interface NotesSummary {
  count: number;
  latestCreatedAt: string | null;
  items: NoteMetaItem[];
}

export interface EncounterSafeView {
  encounterId: string;
  patientId: string;
  appointmentId: string | null;
  professionalName: string | null;
  status: string;
  chiefComplaint: string;
  preliminaryDiagnosis: string | null;
  observations: string | null;
  indications: string | null;
  startedAt: string | null;
  finalizedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  notesSummary: NotesSummary;
}

export interface EncounterListItem {
  encounterId: string;
  status: string;
  chiefComplaint: string;
  startedAt: string | null;
  finalizedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  notesCount: number;
}

// ─── getEncounterSafeView ──────────────────────────────────────────────────

/**
 * Proyección segura de UNA consulta clínica para la UI.
 * Exige clinical.view. Fail-closed si falta organizationId, userId o permiso.
 * Valida que encounterId pertenezca al patientId solicitado (anti-IDOR).
 * NUNCA devuelve clinical_notes.body ni organizationId ni UUIDs internos.
 */
export async function getEncounterSafeView(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
  encounterId: string,
): Promise<Result<EncounterSafeView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "clinical.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "clinical.view",
        entityType: "clinical_encounter",
        entityId: encounterId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: clinical.view");
  }

  return run(async (exec) => {
    // SELECT explícito — sin organizationId, sin UUIDs internos de auditoría.
    const rows = await exec(
      `SELECT
         e."id",
         e."patientId",
         e."appointmentId",
         e."professionalResourceId",
         e."status",
         e."chiefComplaint",
         e."preliminaryDiagnosis",
         e."observations",
         e."indications",
         e."startedAt",
         e."finalizedAt",
         e."canceledAt",
         e."createdAt"
       FROM "clinical_encounters" e
       WHERE e."id" = $1`,
      [encounterId],
    );

    if (rows.length === 0) return fail("NOT_FOUND", "Consulta no encontrada.");

    const e = rows[0];

    // Anti-IDOR: validar que la consulta pertenece al paciente solicitado.
    if (e.patientId !== patientId) {
      return fail("NOT_FOUND", "La consulta no pertenece al paciente indicado.");
    }

    // Resolver nombre del profesional (si existe), sin exponer UUID.
    let professionalName: string | null = null;
    if (e.professionalResourceId) {
      const rr = await exec(
        `SELECT "name" FROM "resources" WHERE "id" = $1`,
        [e.professionalResourceId],
      );
      professionalName = rr[0]?.name ?? null;
    }

    // Notas clínicas — vista autorizada (clinical.view ya exigido arriba).
    // authorUserId se usa SOLO para resolver el nombre a mostrar; nunca se devuelve
    // como UUID crudo. users no es accesible por app_user (RLS), por lo que el
    // nombre se resuelve vía adminDb en la capa de identidad (resolveMemberDisplayNames),
    // scoped por organizationId — anti fuga cross-tenant, en un solo lote (no N+1).
    const noteRows = await exec(
      `SELECT "id", "authorUserId", "body", "createdAt"
       FROM "clinical_notes"
       WHERE "encounterId" = $1
       ORDER BY "createdAt" ASC`,
      [encounterId],
    );

    const authorNames = await resolveMemberDisplayNames(
      noteRows.map((n: any) => n.authorUserId),
      ctx.organizationId,
    );

    const noteItems: NoteMetaItem[] = noteRows.map((n: any) => ({
      id: n.id,
      createdAt: toIso(n.createdAt) ?? new Date().toISOString(),
      authorName: authorNames.get(n.authorUserId) ?? null,
      body: n.body,
    }));

    const notesSummary: NotesSummary = {
      count: noteItems.length,
      latestCreatedAt: noteItems.length > 0 ? noteItems[noteItems.length - 1].createdAt : null,
      items: noteItems,
    };

    // Auditar apertura — SIN contenido clínico.
    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "clinical.viewed",
      entityType: "clinical_encounter",
      entityId: encounterId,
      metadata: { patientId, accessType: "getEncounterSafeView" },
    });

    return ok<EncounterSafeView>({
      encounterId: e.id,
      patientId: e.patientId,
      appointmentId: e.appointmentId ?? null,
      professionalName,
      status: e.status,
      chiefComplaint: e.chiefComplaint,
      preliminaryDiagnosis: e.preliminaryDiagnosis ?? null,
      observations: e.observations ?? null,
      indications: e.indications ?? null,
      startedAt: toIso(e.startedAt),
      finalizedAt: toIso(e.finalizedAt),
      canceledAt: toIso(e.canceledAt),
      createdAt: toIso(e.createdAt) ?? new Date().toISOString(),
      notesSummary,
    });
  });
}

// ─── listEncountersSafeForPatient ─────────────────────────────────────────

/**
 * Lista segura de consultas de un paciente para la UI.
 * Exige clinical.view. Fail-closed. No expone body de notas.
 */
export async function listEncountersSafeForPatient(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<{ items: EncounterListItem[] }>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "clinical.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "clinical.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: clinical.view");
  }

  return run(async (exec) => {
    const rows = await exec(
      `SELECT
         e."id",
         e."status",
         e."chiefComplaint",
         e."startedAt",
         e."finalizedAt",
         e."canceledAt",
         e."createdAt",
         (SELECT COUNT(*) FROM "clinical_notes" n WHERE n."encounterId" = e."id") AS "notesCount"
       FROM "clinical_encounters" e
       WHERE e."patientId" = $1
       ORDER BY e."createdAt" DESC`,
      [patientId],
    );

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "clinical.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { accessType: "listEncountersSafeForPatient", count: rows.length },
    });

    return ok({
      items: rows.map((r: any) => ({
        encounterId: r.id,
        status: r.status,
        chiefComplaint: r.chiefComplaint,
        startedAt: toIso(r.startedAt),
        finalizedAt: toIso(r.finalizedAt),
        canceledAt: toIso(r.canceledAt),
        createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
        notesCount: Number(r.notesCount ?? 0),
      })),
    });
  });
}
