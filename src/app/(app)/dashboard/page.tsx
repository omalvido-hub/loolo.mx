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
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          Bienvenido, {session.user.name.split(" ")[0]}
        </h1>
        {org && <p className="text-muted-foreground">{org.name}</p>}
      </div>

      <DashboardKpiGrid />
      <DashboardWidgetGrid />

      <p className="text-xs text-muted-foreground">
        Las cifras de arriba son una vista previa (datos de muestra) mientras se conectan
        las consultas reales de agenda, cobros y seguimiento a este dashboard.
      </p>
    </div>
  );
}
