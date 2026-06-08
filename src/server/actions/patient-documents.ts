"use server";

// NELZZON — Server Actions de documentos del paciente (PATIENT-DOCUMENTS-4B).
// Wrapper 1:1 sobre uploadPatientDocument: sesión → actor context → dominio →
// revalidatePath → ActionResult seguro. Sin lógica de negocio propia.
// La respuesta NUNCA incluye storageKey, checksum ni rutas internas — el
// dominio ya devuelve un resumen seguro (UploadedPatientDocumentSafe).

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import {
  uploadPatientDocument,
  type UploadedPatientDocumentSafe,
} from "@/server/domain/clinical/patient-documents-write";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function safeErrorMessage(reason: string, detail?: string): string {
  switch (reason) {
    case "FORBIDDEN":
      return "No tienes permiso para subir documentos de este paciente.";
    case "NOT_FOUND":
      return "El paciente no existe en esta organización.";
    case "INVALID":
      // El dominio solo produce mensajes de validación legibles aquí (sin datos internos).
      return detail ?? "El archivo no es válido.";
    case "BLOCKED":
      // No exponemos el detalle interno (menciona variables de configuración de storage).
      return "La carga de documentos no está disponible todavía. Intenta más tarde.";
    default:
      return "No se pudo subir el documento.";
  }
}

export async function uploadPatientDocumentAction(
  patientId: string,
  formData: FormData,
): Promise<ActionResult<UploadedPatientDocumentSafe>> {
  try {
    const org = await requireOrganization();
    const ctx = await getActorContext(org.user.id, org.organizationId);
    const run = makeTenantRunner(org.organizationId);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "Selecciona un archivo para subir." };
    }
    if (file.size === 0) {
      return { ok: false, error: "El archivo está vacío." };
    }

    const kind = String(formData.get("kind") ?? "");
    const sensitivityLevel = String(formData.get("sensitivityLevel") ?? "");
    const retentionCategory = String(formData.get("retentionCategory") ?? "");

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadPatientDocument(run, ctx, {
      patientId,
      kind,
      sensitivityLevel,
      retentionCategory,
      fileName: file.name,
      declaredMimeType: file.type || "application/octet-stream",
      fileBuffer,
    });

    if (!result.ok) {
      return { ok: false, error: safeErrorMessage(result.reason, result.detail) };
    }

    revalidatePath(`/pacientes/${patientId}`);
    return { ok: true, data: result.value.item };
  } catch (e: unknown) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: "No se pudo subir el documento." };
  }
}
