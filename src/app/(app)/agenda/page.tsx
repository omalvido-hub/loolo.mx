import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { listAppointmentsByRange, listResources } from "@/server/domain/agenda/queries";
import { getAgendaPatientContext } from "@/server/domain/agenda/patient-context";
import { can } from "@/server/domain/identity/permissions";
import { AgendaView } from "@/components/agenda/AgendaView";

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; resourceId?: string; patientId?: string }>;
}) {
  const params = await searchParams;

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

  const from = parseDate(params.from);
  const to = parseDate(params.to);
  const resourceId = typeof params.resourceId === "string" ? params.resourceId : undefined;
  const patientId = typeof params.patientId === "string" ? params.patientId : undefined;
  const canCreateAppointment = can(ctx.permissions, "appointments.create");

  const [apptResult, resResult, patientResult] = await Promise.all([
    listAppointmentsByRange(run, ctx, { from, to, resourceId }),
    listResources(run, ctx),
    patientId ? getAgendaPatientContext(run, ctx, patientId) : Promise.resolve(null),
  ]);

  const patient = patientResult && patientResult.ok ? patientResult.value : null;

  if (!apptResult.ok) {
    if (apptResult.reason === "FORBIDDEN") {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Agenda</h1>
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Sin acceso</p>
            <p className="text-sm mt-2">No tienes permiso para ver la agenda.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Agenda</h1>
        <p className="text-destructive text-sm">Error al cargar la agenda.</p>
      </div>
    );
  }

  return (
    <AgendaView
      appointments={apptResult.value}
      resources={resResult.ok ? resResult.value : null}
      patientId={patientId}
      patient={patient}
      canCreateAppointment={canCreateAppointment}
    />
  );
}
