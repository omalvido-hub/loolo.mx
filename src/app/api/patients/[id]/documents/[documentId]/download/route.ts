// NELZZON — GET /api/patients/[id]/documents/[documentId]/download (5A).
// Descarga segura de documentos del paciente para staff interno.
//
// Garantías de seguridad en este endpoint:
//   - Autenticación obligatoria (sesión + organización activa).
//   - Actor context real con RLS tenant-scoped.
//   - El dominio verifica permisos, estado del documento y sensibilidad ANTES de leer R2.
//   - Los bytes se leen en servidor y se envían directamente al cliente en la respuesta.
//   - NUNCA se envía al cliente: storageKey, checksum, bucket, accountId, endpoint R2.
//   - NUNCA se hace redirect a R2 ni se envía una signed URL.
//   - Content-Disposition: attachment (solo descarga, no inline preview).
//   - Cache-Control: private, no-store.
//   - En error: mensajes genéricos (403/404/502) sin detalles internos.

import { NextRequest, NextResponse } from "next/server";
import {
  requireOrganization,
  UnauthorizedError,
  NoOrganizationError,
} from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { downloadPatientDocument } from "@/server/domain/clinical/patient-documents-download";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id: patientId, documentId } = await params;

  // 1. Autenticación + organización.
  let userId: string;
  let organizationId: string;
  try {
    const org = await requireOrganization();
    userId = org.user.id;
    organizationId = org.organizationId;
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return new NextResponse(null, { status: 401 });
    }
    if (e instanceof NoOrganizationError) {
      return new NextResponse(null, { status: 403 });
    }
    throw e;
  }

  // 2. Actor context + tenant runner con RLS.
  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);

  // 3. Delegar al dominio: permisos, estado, sensibilidad, storage, auditoría.
  const result = await downloadPatientDocument(run, ctx, patientId, documentId);

  if (!result.ok) {
    switch (result.reason) {
      case "FORBIDDEN":
        return new NextResponse(null, { status: 403 });
      case "NOT_FOUND":
        return new NextResponse(null, { status: 404 });
      case "BLOCKED":
        // Storage no disponible o no configurado — no filtramos detalles.
        return new NextResponse(null, { status: 502 });
      default:
        return new NextResponse(null, { status: 500 });
    }
  }

  const { bytes, mimeType, safeFileName } = result.value;

  // 4. Respuesta segura: attachment, no-store, sin headers internos.
  // Buffer → Uint8Array: Next.js Response (Web API) espera BodyInit, no Buffer de Node.
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      // attachment = descarga obligatoria; filename sanitizado (sin storageKey,
      // bucket, accountId ni rutas internas).
      "Content-Disposition": `attachment; filename="${safeFileName.replace(/"/g, '\\"')}"`,
      // No almacenar en caché compartido ni en caché del navegador — datos clínicos.
      "Cache-Control": "private, no-store",
      // Impedir que el navegador intente detectar el tipo y potencialmente renderice HTML.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
