// NELZZON — Descarga segura de documentos del paciente (PATIENT-DOCUMENTS-5A).
// Solo para staff interno; sin portal, sin signed URLs, sin redirect a R2.
//
// El storageKey NUNCA sale de este módulo: se consulta en BD en servidor,
// se pasa al storage y se descarta — el caller solo recibe bytes + metadata segura.
//
// Reglas de acceso:
//   - patient_documents.download + patient_documents.view (ambos obligatorios)
//   - filtro de sensibilidad idéntico al de la vista (canSeeDocumentSensitivity)
//   - documento status = ACTIVE (VOIDED / SUPERSEDED no descarga)
//   - documento pertenece al paciente y organización activa (anti-IDOR / RLS)
//
// Auditoría: registra downloaded / download_denied / download_failed
// SIN storageKey, checksum, bucket, accountId ni contenido.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { canSeeDocumentSensitivity } from "./patient-documents-views.js";
import { getDocumentStorage } from "../../storage/document-storage.js";

// ─── Sanitización de nombre para Content-Disposition ──────────────────────

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sanitiza un nombre de archivo para usarlo en el header Content-Disposition.
 * Elimina caracteres de control (CR/LF/null → header injection), separadores
 * de ruta (path traversal), comillas y secuencias ".." peligrosas. Si el
 * resultado queda vacío o ambiguo, devuelve un fallback opaco.
 */
export function sanitizeFilenameForContentDisposition(
  raw: string,
  documentId: string,
  mimeType: string,
): string {
  const ext = MIME_TO_EXT[mimeType] ?? "bin";
  const fallback = `documento-${documentId}.${ext}`;

  const cleaned = raw
    .replace(/[\x00-\x1f\x7f]/g, "") // control chars incl. CR, LF, null
    .replace(/[\\/:*?"<>|]/g, "") // path-dangerous / OS-unsafe chars
    .replace(/\.\./g, "") // prevent .. sequences (path traversal)
    .replace(/[^\x20-\x7e]/g, "_") // replace non-ASCII printable with _
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "_") return fallback;
  return cleaned.slice(0, 200);
}

// ─── DTO de resultado (seguro — sin storageKey ni checksum) ───────────────

export interface DownloadDocumentResult {
  bytes: Buffer;
  mimeType: string;
  contentLength: number;
  safeFileName: string;
}

// ─── downloadPatientDocument ──────────────────────────────────────────────

export async function downloadPatientDocument(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
  documentId: string,
): Promise<Result<DownloadDocumentResult>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  // Exige AMBOS permisos: download + view.
  if (
    !can(ctx.permissions, "patient_documents.download") ||
    !can(ctx.permissions, "patient_documents.view")
  ) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patient_documents.download",
        entityType: "patient_document",
        entityId: documentId,
      });
      await recordAudit(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        actorType: "USER",
        action: "patient_documents.download_denied",
        entityType: "patient",
        entityId: patientId,
        metadata: { documentId, reason: "MISSING_PERMISSION" },
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patient_documents.download");
  }

  // Leer metadata del documento — incluyendo storageKey (SOLO en servidor,
  // NUNCA sale de esta función). RLS asegura aislamiento por organización.
  type DocRow = {
    id: string;
    patientId: string;
    storageKey: string;
    mimeType: string;
    fileName: string;
    status: string;
    sensitivityLevel: string;
  };

  const rows = (await run(async (exec) =>
    exec(
      `SELECT "id","patientId","storageKey","mimeType","fileName","status","sensitivityLevel"
       FROM "patient_documents"
       WHERE "id" = $1 AND "patientId" = $2`,
      [documentId, patientId],
    ),
  )) as DocRow[];

  // Sin resultado: el documento no existe DENTRO de esta organización + paciente.
  if (rows.length === 0) {
    await run(async (exec) => {
      await recordAudit(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        actorType: "USER",
        action: "patient_documents.download_denied",
        entityType: "patient",
        entityId: patientId,
        metadata: { documentId, reason: "NOT_FOUND" },
      });
    });
    return fail("NOT_FOUND", "El documento no existe en este paciente.");
  }

  const doc = rows[0];

  // Solo documentos ACTIVE — VOIDED y SUPERSEDED no son descargables.
  if (doc.status !== "ACTIVE") {
    await run(async (exec) => {
      await recordAudit(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        actorType: "USER",
        action: "patient_documents.download_denied",
        entityType: "patient",
        entityId: patientId,
        metadata: { documentId, reason: "DOCUMENT_NOT_ACTIVE", status: doc.status },
      });
    });
    return fail("FORBIDDEN", "Solo se pueden descargar documentos activos.");
  }

  // Filtro de sensibilidad — misma lógica que listPatientDocumentsSafeForPatient.
  if (!canSeeDocumentSensitivity(ctx.permissions, doc.sensitivityLevel)) {
    await run(async (exec) => {
      await recordAudit(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        actorType: "USER",
        action: "patient_documents.download_denied",
        entityType: "patient",
        entityId: patientId,
        // No se incluye sensitivityLevel en el log para no revelar nivel de acceso
        // que el actor no debería saber que existe. Solo el hecho de denegación.
        metadata: { documentId, reason: "SENSITIVITY_LEVEL_FORBIDDEN" },
      });
    });
    return fail(
      "FORBIDDEN",
      "No tiene permiso para ver documentos con este nivel de sensibilidad.",
    );
  }

  // Leer bytes desde el storage (storageKey opaco, permanece en servidor).
  const storageResult = await getDocumentStorage().getObject(doc.storageKey);

  if (!storageResult.ok) {
    await run(async (exec) => {
      await recordAudit(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        actorType: "USER",
        action: "patient_documents.download_failed",
        entityType: "patient",
        entityId: patientId,
        // reason = storageResult.reason es seguro (BLOCKED/NOT_FOUND). Detail NO
        // se incluye: puede mencionar el endpoint, el bucket o el storageKey.
        metadata: { documentId, reason: storageResult.reason },
      });
    });
    return fail("BLOCKED", "No se pudo recuperar el archivo del almacenamiento.");
  }

  // Auditoría de descarga exitosa — SIN storageKey, SIN checksum, SIN bucket.
  await run(async (exec) => {
    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "patient_documents.downloaded",
      entityType: "patient",
      entityId: patientId,
      metadata: {
        documentId,
        kind: doc.mimeType,
        sensitivityLevel: doc.sensitivityLevel,
        sizeBytes: storageResult.value.contentLength,
      },
    });
  });

  const safeFileName = sanitizeFilenameForContentDisposition(doc.fileName, documentId, doc.mimeType);

  return ok({
    bytes: storageResult.value.bytes,
    mimeType: doc.mimeType,
    contentLength: storageResult.value.contentLength,
    safeFileName,
  });
}
