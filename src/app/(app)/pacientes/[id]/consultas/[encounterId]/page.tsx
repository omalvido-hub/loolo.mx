import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { getEncounterSafeView } from "@/server/domain/clinical/encounter-views";
import { getOdontogramEncounterView } from "@/server/domain/clinical/odontogram-views";
import { EncounterDetailView } from "@/components/clinical/EncounterDetailView";
import { ClinicalNoPermission } from "@/components/clinical/ClinicalNoPermission";
import { EncounterFindings } from "@/components/odontogram/EncounterFindings";
import { OdontogramNoPermission } from "@/components/odontogram/OdontogramNoPermission";

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

  // Hallazgos de esta consulta — UI-4 solo lectura.
  const odoResult = await getOdontogramEncounterView(run, ctx, id, encounterId);

  return (
    <div>
      <EncounterDetailView view={result.value} patientId={id} />
      <div className="px-8 pb-10 max-w-3xl mx-auto">
        <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="font-medium text-base">Odontograma</h2>
          </div>
          <div className="px-4 py-4">
            {odoResult.ok ? (
              <EncounterFindings view={odoResult.value} patientId={id} />
            ) : odoResult.reason === "FORBIDDEN" ? (
              <OdontogramNoPermission />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
