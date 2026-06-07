import { notFound, redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { getEncounterSafeView } from "@/server/domain/clinical/encounter-views";
import { getOdontogramEncounterView } from "@/server/domain/clinical/odontogram-views";
import { EncounterDetailView } from "@/components/clinical/EncounterDetailView";
import { ClinicalNoPermission } from "@/components/clinical/ClinicalNoPermission";
import { EncounterFindings } from "@/components/odontogram/EncounterFindings";
import { OdontogramNoPermission } from "@/components/odontogram/OdontogramNoPermission";

export default async function ConsultaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; encounterId: string }>;
  searchParams: Promise<{ toothFdi?: string; openFinding?: string }>;
}) {
  const { id, encounterId } = await params;
  const sp = await searchParams;
  const initialToothFdi = sp.toothFdi ? parseInt(sp.toothFdi, 10) : undefined;
  const autoOpenForm = sp.openFinding === "1";

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

  // Hallazgos de esta consulta — UI-4 solo lectura / UI-7B-B escritura si activa.
  const odoResult = await getOdontogramEncounterView(run, ctx, id, encounterId);
  const canRecord = can(ctx.permissions, "odontogram.record");
  const canVoid = can(ctx.permissions, "odontogram.void");
  const canActOnFindings = can(ctx.permissions, "odontogram.record");
  const encounterStatus = result.value.status;

  // Permisos de escritura clínica — NELZZON-ENCOUNTERS-1B-UI.
  const canEditEncounter = can(ctx.permissions, "clinical.edit");
  const canAddNote = can(ctx.permissions, "clinical_notes.add");
  const canFinalize = can(ctx.permissions, "clinical.finalize");
  const canCancel = can(ctx.permissions, "clinical.cancel");

  return (
    <div>
      <EncounterDetailView
        view={result.value}
        patientId={id}
        canEdit={canEditEncounter}
        canAddNote={canAddNote}
        canFinalize={canFinalize}
        canCancel={canCancel}
      />
      <div className="px-8 pb-10 max-w-3xl mx-auto mt-8">
        <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="font-medium text-base">Odontograma</h2>
          </div>
          <div className="px-4 py-4">
            {odoResult.ok ? (
              <EncounterFindings
                view={odoResult.value}
                patientId={id}
                encounterId={encounterId}
                encounterStatus={encounterStatus}
                canRecord={canRecord}
                canVoid={canVoid}
                canActOnFindings={canActOnFindings}
                initialToothFdi={initialToothFdi}
                autoOpenForm={autoOpenForm}
              />
            ) : odoResult.reason === "FORBIDDEN" ? (
              <OdontogramNoPermission />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
