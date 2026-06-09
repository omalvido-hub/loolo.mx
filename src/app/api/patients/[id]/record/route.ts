// NELZZON — GET /api/patients/[id]/record (7C-A). Solo lectura. Interno del consultorio.
// Requiere sesión activa + organización activa + permiso patients.view.
// La auditoría (patient_record.viewed / permission.denied) ocurre dentro del resolver (7B).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { resolvePatientLiveRecord } from "@/server/domain/patient-record/resolver";
import { mapRecordResult } from "@/server/domain/patient-record/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  let organizationId: string;

  try {
    const org = await requireOrganization();
    userId = org.user.id;
    organizationId = org.organizationId;
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (e instanceof NoOrganizationError) {
      return NextResponse.json({ error: "Sin organización activa" }, { status: 403 });
    }
    throw e;
  }

  const { id: patientId } = await params;
  if (!z.string().uuid().safeParse(patientId).success) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);
  const result = await resolvePatientLiveRecord(run, ctx, patientId);
  const { status, body } = mapRecordResult(result);
  return NextResponse.json(body, { status });
}
