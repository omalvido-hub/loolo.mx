import { redirect, notFound } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { resolvePatientLiveRecord } from "@/server/domain/patient-record/resolver";
import { getOdontogramMasterView } from "@/server/domain/clinical/odontogram-views";
import { listEncountersSafeForPatient } from "@/server/domain/clinical/encounter-views";
import { OdontogramNoPermission } from "@/components/odontogram/OdontogramNoPermission";
import { Odontogram3DShell } from "@/components/odontogram3d/Odontogram3DShell";

export default async function Odontograma3DPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  let organizationId: string;
  let userId: string;
  try {
    const org = await requireOrganization();
    organizationId = org.organizationId;
    userId = org.user.id;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) redirect("/login");
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);

  const patientResult = await resolvePatientLiveRecord(run, ctx, patientId);
  if (!patientResult.ok) {
    if (patientResult.reason === "NOT_FOUND" || patientResult.reason === "ARCHIVED") notFound();
    if (patientResult.reason === "FORBIDDEN") {
      return (
        <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/70">
          Sin acceso a este paciente.
        </div>
      );
    }
    notFound();
  }

  const odoResult = await getOdontogramMasterView(run, ctx, patientId);
  if (!odoResult.ok) {
    if (odoResult.reason === "FORBIDDEN") {
      return (
        <div className="flex h-screen items-center justify-center bg-neutral-950">
          <OdontogramNoPermission />
        </div>
      );
    }
    notFound();
  }

  const encResult = await listEncountersSafeForPatient(run, ctx, patientId);
  const activeEncounterId = encResult.ok
    ? encResult.value.items.find((e) => e.status === "IN_PROGRESS" || e.status === "DRAFT")?.encounterId ?? null
    : null;

  const canVoid = can(ctx.permissions, "odontogram.void");
  const canActOnFindings = can(ctx.permissions, "odontogram.record");

  return (
    <Odontogram3DShell
      patientId={patientId}
      patientName={patientResult.value.identity.fullName ?? "Paciente"}
      teeth={odoResult.value.teeth}
      activeEncounterId={activeEncounterId}
      canVoid={canVoid}
      canActOnFindings={canActOnFindings}
    />
  );
}
