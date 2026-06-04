import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { resolvePatientLiveRecord } from "@/server/domain/patient-record/resolver";
import { PatientLiveRecordView } from "@/components/patients/PatientLiveRecordView";

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

  return <PatientLiveRecordView record={result.value} />;
}
