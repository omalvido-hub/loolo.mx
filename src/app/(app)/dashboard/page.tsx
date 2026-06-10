import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { listAppointmentsByRange } from "@/server/domain/agenda/queries";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";
import {
  CitasHoyKpi,
  CobradoMesKpi,
  PorCobrarKpi,
  PresupuestosPendientesKpi,
  TratamientosActivosKpi,
  IngresosMesKpi,
  PuntoEquilibrioKpi,
  MetaMensualKpi,
} from "@/components/dashboard/DashboardKpiGrid";

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
    <div className="mx-auto max-w-7xl space-y-4 px-6 py-6 pb-12 sm:px-8">
      {/* Fila superior: 4 KPIs verticales */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CitasHoyKpi appointmentsToday={appointmentsToday} />
        <CobradoMesKpi />
        <TratamientosActivosKpi />
        <IngresosMesKpi />
      </div>

      {/* Fila inferior: 2 columnas de horizontales apiladas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <PorCobrarKpi />
          <PresupuestosPendientesKpi />
        </div>
        <div className="flex flex-col gap-4">
          <PuntoEquilibrioKpi />
          <MetaMensualKpi />
        </div>
      </div>
    </div>
  );
}
