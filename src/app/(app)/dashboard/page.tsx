import { getSessionWithMemberships } from "@/lib/session";
import { redirect } from "next/navigation";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { DashboardWidgetGrid } from "@/components/dashboard/DashboardWidgetGrid";

export default async function DashboardPage() {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;
  const org = memberships[0]?.organization;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 sm:px-8 lg:py-10">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tu espacio de trabajo
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Bienvenido, {session.user.name.split(" ")[0]}
        </h1>
        {org && <p className="text-sm text-muted-foreground">{org.name}</p>}
      </div>

      <div className="space-y-6">
        <DashboardKpiGrid />
        <DashboardWidgetGrid />
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Estas cifras son una vista previa con datos de muestra — cobrarán vida en cuanto
        conectemos Agenda, Cobros y Seguimiento a tu dashboard.
      </p>
    </div>
  );
}
