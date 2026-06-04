import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { resolvePatientLiveRecord } from "@/server/domain/patient-record/resolver";
import { listEncountersSafeForPatient } from "@/server/domain/clinical/encounter-views";
import { getOdontogramMasterView } from "@/server/domain/clinical/odontogram-views";
import { PatientLiveRecordView } from "@/components/patients/PatientLiveRecordView";
import { OdontogramMasterSection } from "@/components/odontogram/OdontogramMasterSection";
import { OdontogramNoPermission } from "@/components/odontogram/OdontogramNoPermission";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

export default async function PacienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let organizationId: string;
  let userId: string;

  try {
    const org = await requireOrganization();
    organizationId = org.organizationId;
    userId = org.user.id;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      redirect("/login");
    }
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);
  const result = await resolvePatientLiveRecord(run, ctx, id);

  if (!result.ok) {
    if (result.reason === "NOT_FOUND" || result.reason === "ARCHIVED") {
      notFound();
    }
    if (result.reason === "FORBIDDEN") {
      return (
        <div className="p-8">
          <p className="text-muted-foreground">Sin acceso a este paciente.</p>
        </div>
      );
    }
    notFound();
  }

  // Cargar historial de consultas cuando el actor tiene clinical.view
  // (resolver ya lo confirmó si la sección clínica está presente en el resultado).
  let encounters: EncounterListItem[] = [];
  if (result.value.clinical !== undefined) {
    const encResult = await listEncountersSafeForPatient(run, ctx, id);
    if (encResult.ok) {
      encounters = encResult.value.items;
    }
  }

  // Odontograma vigente — UI-4 solo lectura.
  const odoResult = await getOdontogramMasterView(run, ctx, id);

  return (
    <div>
      <PatientLiveRecordView record={result.value} encounters={encounters} patientId={id} />
      <div className="px-8 pb-10 max-w-4xl mx-auto space-y-6">
        {odoResult.ok ? (
          <OdontogramMasterSection view={odoResult.value} patientId={id} />
        ) : odoResult.reason === "FORBIDDEN" ? (
          <OdontogramNoPermission />
        ) : null}
      </div>
    </div>
  );
}
