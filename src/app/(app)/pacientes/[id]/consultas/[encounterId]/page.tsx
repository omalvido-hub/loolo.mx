import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { getEncounterSafeView } from "@/server/domain/clinical/encounter-views";
import { EncounterDetailView } from "@/components/clinical/EncounterDetailView";
import { ClinicalNoPermission } from "@/components/clinical/ClinicalNoPermission";

export default async function ConsultaDetallePage({
  params,
}: {
  params: Promise<{ id: string; encounterId: string }>;
}) {
  const { id, encounterId } = await params;

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

  const result = await getEncounterSafeView(run, ctx, id, encounterId);

  if (!result.ok) {
    if (result.reason === "FORBIDDEN") {
      return (
        <div className="p-8">
          <ClinicalNoPermission />
        </div>
      );
    }
    // NOT_FOUND o cualquier otro fallo → 404 seguro
    notFound();
  }

  return <EncounterDetailView view={result.value} patientId={id} />;
}
