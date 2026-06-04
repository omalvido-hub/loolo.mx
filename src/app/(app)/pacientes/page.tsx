import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { listPatientsForOrg } from "@/server/domain/patient-record/list";
import { PatientListView } from "@/components/patients/PatientListView";

export default async function PacientesPage() {
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
  const result = await listPatientsForOrg(run, ctx);

  if (!result.ok) {
    if (result.reason === "FORBIDDEN") {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Pacientes</h1>
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Sin acceso</p>
            <p className="text-sm mt-2">No tienes permiso para ver la lista de pacientes.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Pacientes</h1>
        <p className="text-destructive text-sm">Error al cargar la lista de pacientes.</p>
      </div>
    );
  }

  return <PatientListView data={result.value} />;
}
