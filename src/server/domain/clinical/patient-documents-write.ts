// NELZZON — Escritura de documentos del paciente (PATIENT-DOCUMENTS-4B).
// Primera carga REAL desde staff interno (uploadedVia = 'STAFF', status = 'ACTIVE').
// NO portal del paciente, NO descarga, NO reemplazo/anulación todavía.
//
// Orden de operaciones (fail-closed, sin filas huérfanas):
//   1. permiso patient_documents.upload
//   2. metadatos (Zod) → kind/sensitivityLevel/retentionCategory/fileName
//   3. archivo: no vacío, tamaño máximo, tipo real por magic bytes (nunca el
//      Content-Type declarado por el navegador — eso se puede falsificar)
//   4. paciente pertenece a la organización activa (anti-IDOR / fail-closed)
//   5. checksum SHA-256 + documentId + storageKey opacos generados en servidor
//   6. SUBIR AL STORAGE PRIMERO — si falla, NO se inserta nada en patient_documents
//      (evita filas huérfanas que apunten a objetos inexistentes)
//   7. INSERT patient_documents + patient_document_links(PATIENT) + auditoría
//
// Auditoría: SIN storageKey, checksum, fileName ni contenido — solo hechos
// operativos no sensibles (documentId, kind, sensibilidad, tamaño, mimeType).

import { createHash, randomUUID } from "node:crypto";
import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { parseUploadMeta } from "./patient-documents-write-schemas.js";
import { getDocumentStorage } from "../../storage/document-storage.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── Reglas de archivo (4B: solo PDF / JPG / PNG / WEBP, máx. 25 MB) ───────

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

interface MagicByteSignature {
  mimeType: string;
  matches: (buf: Buffer) => boolean;
}

const MAGIC_BYTE_SIGNATURES: MagicByteSignature[] = [
  {
    mimeType: "application/pdf",
    matches: (b) => b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  {
    mimeType: "image/jpeg",
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mimeType: "image/png",
    matches: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: "image/webp",
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/**
 * Detecta el tipo real del archivo por sus primeros bytes (magic bytes),
 * NUNCA confiando en el Content-Type declarado por el navegador.
 * Devuelve null si el contenido no corresponde a ningún tipo permitido.
 */
export function detectMimeFromMagicBytes(buf: Buffer): string | null {
  for (const sig of MAGIC_BYTE_SIGNATURES) {
    if (sig.matches(buf)) return sig.mimeType;
  }
  return null;
}

// ─── uploadPatientDocument ─────────────────────────────────────────────────

export interface UploadPatientDocumentInput {
  patientId: string;
  kind: string;
  sensitivityLevel: string;
  retentionCategory: string;
  fileName: string;
  declaredMimeType: string;
  fileBuffer: Buffer;
}

/** Resumen seguro del documento recién creado — NUNCA storageKey/checksum. */
export interface UploadedPatientDocumentSafe {
  documentId: string;
  kind: string;
  status: string;
  sensitivityLevel: string;
  retentionCategory: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Sube un documento de paciente desde personal interno (uploadedVia=STAFF).
 * Exige patient_documents.upload. Fail-closed en cada paso.
 * El usuario NUNCA controla: organizationId, storageKey, checksum,
 * uploadedByUserId, status, mimeType final (se detecta por magic bytes).
 */
export async function uploadPatientDocument(
  run: TenantRunner,
  ctx: ActorContext,
  input: UploadPatientDocumentInput,
): Promise<Result<{ item: UploadedPatientDocumentSafe }>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "patient_documents.upload")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patient_documents.upload",
        entityType: "patient",
        entityId: input.patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patient_documents.upload");
  }

  const meta = parseUploadMeta({
    kind: input.kind,
    sensitivityLevel: input.sensitivityLevel,
    retentionCategory: input.retentionCategory,
    fileName: input.fileName,
  });
  if (!meta.ok) {
    return fail("INVALID", meta.detail);
  }

  if (!Buffer.isBuffer(input.fileBuffer) || input.fileBuffer.length === 0) {
    return fail("INVALID", "El archivo está vacío.");
  }
  if (input.fileBuffer.length > MAX_UPLOAD_SIZE_BYTES) {
    return fail("INVALID", "El archivo excede el tamaño máximo permitido (25 MB).");
  }

  const realMimeType = detectMimeFromMagicBytes(input.fileBuffer);
  if (!realMimeType) {
    return fail(
      "INVALID",
      "Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG o WEBP.",
    );
  }
  if (realMimeType !== input.declaredMimeType) {
    return fail(
      "INVALID",
      "El tipo de archivo no coincide con su contenido real. Verifica el archivo seleccionado.",
    );
  }

  // Anti-IDOR / fail-closed: el paciente debe existir DENTRO de la organización
  // activa (RLS ya filtra por tenant_isolation; cero filas ⇒ no pertenece aquí).
  const patientRows = await run(async (exec) =>
    exec(`SELECT 1 FROM "patients" WHERE "id" = $1`, [input.patientId]),
  );
  if (patientRows.length === 0) {
    return fail("NOT_FOUND", "El paciente no existe en esta organización.");
  }

  const documentId = randomUUID();
  const checksum = createHash("sha256").update(input.fileBuffer).digest("hex");
  // Opaco: ni fileName ni datos del paciente viajan en la ruta de almacenamiento.
  const storageKey = `org/${ctx.organizationId}/patient/${input.patientId}/${documentId}`;

  // Subir al storage ANTES de tocar la BD: si falla, no queda fila huérfana.
  const storage = getDocumentStorage();
  const putResult = await storage.putObject({
    storageKey,
    body: input.fileBuffer,
    mimeType: realMimeType,
  });
  if (!putResult.ok) {
    return fail(putResult.reason, putResult.detail);
  }

  return run(async (exec) => {
    const row = (
      await exec(
        `INSERT INTO "patient_documents"
           ("id","organizationId","patientId","kind","fileName","mimeType","sizeBytes",
            "storageKey","checksum","uploadedByUserId","uploadedVia",
            "sensitivityLevel","retentionCategory","status")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'STAFF',$11,$12,'ACTIVE')
         RETURNING "id","kind","status","sensitivityLevel","retentionCategory","mimeType","sizeBytes","createdAt"`,
        [
          documentId,
          ctx.organizationId,
          input.patientId,
          meta.value.kind,
          meta.value.fileName,
          realMimeType,
          input.fileBuffer.length,
          storageKey,
          checksum,
          ctx.userId,
          meta.value.sensitivityLevel,
          meta.value.retentionCategory,
        ],
      )
    )[0];

    await exec(
      `INSERT INTO "patient_document_links"("organizationId","documentId","linkType","linkedEntityId")
       VALUES ($1,$2,'PATIENT',$3)`,
      [ctx.organizationId, documentId, input.patientId],
    );

    // Metadata SIN storageKey/checksum/fileName/contenido — solo hechos operativos.
    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "patient_documents.uploaded",
      entityType: "patient",
      entityId: input.patientId,
      metadata: {
        documentId,
        kind: meta.value.kind,
        sensitivityLevel: meta.value.sensitivityLevel,
        retentionCategory: meta.value.retentionCategory,
        mimeType: realMimeType,
        sizeBytes: input.fileBuffer.length,
        uploadedVia: "STAFF",
      },
    });

    return ok({
      item: {
        documentId: row.id,
        kind: row.kind,
        status: row.status,
        sensitivityLevel: row.sensitivityLevel,
        retentionCategory: row.retentionCategory,
        mimeType: row.mimeType,
        sizeBytes: Number(row.sizeBytes),
        createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      },
    });
  });
}
