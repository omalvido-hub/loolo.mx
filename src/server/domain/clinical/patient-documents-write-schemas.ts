// NELZZON — Schemas Zod de entrada para escritura de documentos del paciente
// (PATIENT-DOCUMENTS-4B). Validan los METADATOS declarados por el actor antes
// de tocar archivo o BD. La validación del ARCHIVO en sí (tamaño, tipo real
// por magic bytes) vive en el dominio — no es responsabilidad de Zod.
//
// "GENERATED" se excluye deliberadamente de los kinds permitidos para carga
// manual: la migración 0019 lo describe como "generado por el sistema"
// (presupuestos, planes en PDF, etc.), no como algo que el staff suba a mano.

import { z } from "zod";

export const UPLOAD_DOCUMENT_KINDS = [
  "CLINICAL",
  "RADIOGRAPH",
  "INTRAORAL_IMAGE",
  "EXTERNAL_STUDY",
  "CLINICAL_EVIDENCE",
  "ADMINISTRATIVE",
  "CONSENT",
  "PRESCRIPTION",
  "FINANCIAL",
  "OTHER",
] as const;

export const UPLOAD_SENSITIVITY_LEVELS = [
  "NORMAL",
  "SENSITIVE_CLINICAL",
  "SENSITIVE_FINANCIAL",
  "SENSITIVE_PERSONAL",
] as const;

export const UPLOAD_RETENTION_CATEGORIES = [
  "CLINICAL_RECORD",
  "FINANCIAL_RECORD",
  "ADMINISTRATIVE",
  "CONSENT",
  "TEMPORARY",
] as const;

export const UploadPatientDocumentMetaZ = z.object({
  kind: z.enum(UPLOAD_DOCUMENT_KINDS),
  sensitivityLevel: z.enum(UPLOAD_SENSITIVITY_LEVELS),
  retentionCategory: z.enum(UPLOAD_RETENTION_CATEGORIES),
  fileName: z
    .string()
    .trim()
    .min(1, "El nombre del archivo es obligatorio.")
    .max(255, "El nombre del archivo es demasiado largo."),
});
export type UploadPatientDocumentMetaInput = z.infer<typeof UploadPatientDocumentMetaZ>;

/** Devuelve los metadatos validados o un mensaje de error legible (sin detalles internos). */
export function parseUploadMeta(
  raw: unknown,
): { ok: true; value: UploadPatientDocumentMetaInput } | { ok: false; detail: string } {
  const r = UploadPatientDocumentMetaZ.safeParse(raw);
  if (!r.success) {
    return { ok: false, detail: r.error.issues.map((i) => i.message).join(" ") };
  }
  return { ok: true, value: r.data };
}
