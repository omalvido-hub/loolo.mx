// NELZZON — Proyección segura de documentos del paciente (PATIENT-DOCUMENTS-2A,
// solo lectura; ampliada con campos de compliance en 2B). Exige
// patient_documents.view. Fail-closed ante falta de tenant, actor o permiso.
// Anti-IDOR: valida que cada documento pertenezca al paciente.
// NUNCA devuelve storageKey, checksum, voidReason, contenido binario, URLs
// firmadas, ni IDs internos de actores (uploadedByUserId, professionalAuthorUserId,
// reviewedByUserId, signedByUserId, portalSharedByUserId, portalRevokedByUserId)
// — esos campos viven solo en el servidor y se resuelven en fases futuras
// dedicadas (descarga, revisión, portal) con sus propios permisos y vistas.
// Audita el acceso SIN contenido sensible.

import { can, canAll } from "../identity/permissions.js";
import type { PermissionSet } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── DTOs públicos ─────────────────────────────────────────────────────────

export interface PatientDocumentLinkItem {
  linkType: string;
  linkedEntityId: string;
}

export interface PatientDocumentSafeItem {
  documentId: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedVia: string;
  sensitivityLevel: string;
  retentionCategory: string;
  portalStatus: string;
  status: string;
  replacesDocumentId: string | null;
  voidedAt: string | null;
  createdAt: string;
  links: PatientDocumentLinkItem[];
}

// ─── Filtro de visibilidad por sensibilidad (PATIENT-DOCUMENTS-4A-3) ───────

/**
 * Decide si el actor puede ver un documento dado su sensitivityLevel.
 * patient_documents.view ya fue verificado por el caller — esta función
 * decide el acceso ADICIONAL que exige cada nivel sensible. Fail-closed:
 * cualquier nivel desconocido (presente o futuro) se oculta por defecto.
 */
export function canSeeDocumentSensitivity(perms: PermissionSet, sensitivityLevel: string): boolean {
  switch (sensitivityLevel) {
    case "NORMAL":
      return true;
    case "SENSITIVE_CLINICAL":
      return canAll(perms, ["patient_documents.view", "patient_documents.sensitive_clinical_view"]);
    case "SENSITIVE_FINANCIAL":
      return canAll(perms, ["patient_documents.view", "patient_documents.financial_view"]);
    case "SENSITIVE_PERSONAL":
      return canAll(perms, ["patient_documents.view", "patient_documents.sensitive_personal_view"]);
    default:
      return false;
  }
}

// ─── listPatientDocumentsSafeForPatient ────────────────────────────────────

/**
 * Lista segura de documentos de un paciente para la UI.
 * Exige patient_documents.view. Fail-closed.
 * NUNCA expone storageKey, checksum, voidReason ni contenido.
 */
export async function listPatientDocumentsSafeForPatient(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<{ items: PatientDocumentSafeItem[] }>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "patient_documents.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patient_documents.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patient_documents.view");
  }

  return run(async (exec) => {
    // SELECT explícito — sin storageKey, checksum, uploadedByUserId ni voidReason.
    const rows = await exec(
      `SELECT
         d."id",
         d."kind",
         d."fileName",
         d."mimeType",
         d."sizeBytes",
         d."uploadedVia",
         d."sensitivityLevel",
         d."retentionCategory",
         d."portalStatus",
         d."status",
         d."replacesDocumentId",
         d."voidedAt",
         d."createdAt"
       FROM "patient_documents" d
       WHERE d."patientId" = $1
       ORDER BY d."createdAt" DESC`,
      [patientId],
    );

    // Filtro de visibilidad por sensibilidad — fail-closed ante niveles desconocidos.
    const visibleRows = (rows as any[]).filter((r) =>
      canSeeDocumentSensitivity(ctx.permissions, r.sensitivityLevel),
    );

    const documentIds: string[] = visibleRows.map((r: any) => r.id);
    const linksByDocument = new Map<string, PatientDocumentLinkItem[]>();
    if (documentIds.length > 0) {
      const linkRows = await exec(
        `SELECT "documentId", "linkType", "linkedEntityId"
         FROM "patient_document_links"
         WHERE "documentId" = ANY($1::uuid[])
         ORDER BY "createdAt" ASC`,
        [documentIds],
      );
      for (const lr of linkRows as any[]) {
        const list = linksByDocument.get(lr.documentId) ?? [];
        list.push({ linkType: lr.linkType, linkedEntityId: lr.linkedEntityId });
        linksByDocument.set(lr.documentId, list);
      }
    }

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "patient_documents.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { accessType: "listPatientDocumentsSafeForPatient", count: visibleRows.length },
    });

    return ok({
      items: visibleRows.map((r: any) => ({
        documentId: r.id,
        kind: r.kind,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: Number(r.sizeBytes),
        uploadedVia: r.uploadedVia,
        sensitivityLevel: r.sensitivityLevel,
        retentionCategory: r.retentionCategory,
        portalStatus: r.portalStatus,
        status: r.status,
        replacesDocumentId: r.replacesDocumentId ?? null,
        voidedAt: toIso(r.voidedAt),
        createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
        links: linksByDocument.get(r.id) ?? [],
      })),
    });
  });
}

// ─── listPatientDocumentLinksSafeByEntity ──────────────────────────────────

/**
 * Lista segura de documentos vinculados a UNA entidad de un módulo (p.ej. una
 * consulta, un hallazgo, un presupuesto). Exige patient_documents.view.
 * Anti-IDOR: valida que cada documento devuelto pertenezca al patientId dado.
 */
export async function listPatientDocumentLinksSafeByEntity(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
  linkType: string,
  linkedEntityId: string,
): Promise<Result<{ items: PatientDocumentSafeItem[] }>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "patient_documents.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patient_documents.view",
        entityType: linkType.toLowerCase(),
        entityId: linkedEntityId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patient_documents.view");
  }

  return run(async (exec) => {
    const rows = await exec(
      `SELECT
         d."id",
         d."patientId",
         d."kind",
         d."fileName",
         d."mimeType",
         d."sizeBytes",
         d."uploadedVia",
         d."sensitivityLevel",
         d."retentionCategory",
         d."portalStatus",
         d."status",
         d."replacesDocumentId",
         d."voidedAt",
         d."createdAt"
       FROM "patient_document_links" l
       JOIN "patient_documents" d ON d."id" = l."documentId"
       WHERE l."linkType" = $1 AND l."linkedEntityId" = $2
       ORDER BY d."createdAt" DESC`,
      [linkType, linkedEntityId],
    );

    // Anti-IDOR: solo documentos del paciente solicitado.
    // Filtro de visibilidad por sensibilidad — fail-closed ante niveles desconocidos.
    const ownRows = (rows as any[]).filter(
      (r) => r.patientId === patientId && canSeeDocumentSensitivity(ctx.permissions, r.sensitivityLevel),
    );

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "patient_documents.viewed",
      entityType: linkType.toLowerCase(),
      entityId: linkedEntityId,
      metadata: { accessType: "listPatientDocumentLinksSafeByEntity", count: ownRows.length },
    });

    return ok({
      items: ownRows.map((r) => ({
        documentId: r.id,
        kind: r.kind,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: Number(r.sizeBytes),
        uploadedVia: r.uploadedVia,
        sensitivityLevel: r.sensitivityLevel,
        retentionCategory: r.retentionCategory,
        portalStatus: r.portalStatus,
        status: r.status,
        replacesDocumentId: r.replacesDocumentId ?? null,
        voidedAt: toIso(r.voidedAt),
        createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
        links: [{ linkType, linkedEntityId }],
      })),
    });
  });
}
