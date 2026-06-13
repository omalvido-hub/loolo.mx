import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { listAppointmentsByRange } from "@/server/domain/agenda/queries";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";
import { DashboardKpiOrderedGrid } from "@/components/dashboard/DashboardKpiOrderedGrid";
import { ModuleCard } from "@/components/ui/module-card";
import { ChartPreviewCard } from "@/components/ui/chart-preview-card";

export default async function DashboardPage() {
  let organizationId: string;
  let userId: string;
  try {
    const orgCtx = await requireOrganization();
    organizationId = orgCtx.organizationId;
    userId = orgCtx.user.id;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) redirect("/login");
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);

  let appointmentsToday: AppointmentListItem[] | null = null;
  if (can(ctx.permissions, "appointments.view")) {
    const result = await listAppointmentsByRange(run, ctx, {});
    if (result.ok) appointmentsToday = result.value.items;
  }

  return (
    <div className="dashboard-shell mx-auto max-w-6xl space-y-4 px-6 py-6 pb-12 sm:px-8">
      {/* KPIs — orden y tamaño según "Acomoda tu dashboard" */}
      <DashboardKpiOrderedGrid className="dashboard-grid" appointmentsToday={appointmentsToday} />

      {/* Vista previa visual — decorativa, sin datos operativos reales */}
      <ModuleCard title="Panorama" subtitle="Una vista previa de cómo se vería tu actividad" badge="Vista previa">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ChartPreviewCard title="Actividad de la semana" kind="bars" />
          <ChartPreviewCard title="Distribución" kind="donut" />
          <ChartPreviewCard title="Tendencia" kind="sparkline" />
        </div>
      </ModuleCard>
    </div>
  );
}
