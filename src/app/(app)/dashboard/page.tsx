import { getSessionWithMemberships } from "@/lib/session";
import { redirect } from "next/navigation";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { DashboardWidgetGrid } from "@/components/dashboard/DashboardWidgetGrid";

function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("es-MX", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" }).format(date)
  );
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;
  const org = memberships[0]?.organization;
  const greeting = greetingFor(new Date());
  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,0,0,0.035),transparent)]"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 sm:px-8 lg:py-10">
        <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] sm:px-8 sm:py-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[conic-gradient(from_140deg,theme(colors.sky.300/.25),theme(colors.violet.300/.2),theme(colors.fuchsia.200/.2),transparent_70%)] blur-2xl"
          />
          <div className="relative space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {greeting} · tu espacio de trabajo
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bienvenido, {firstName}
            </h1>
            {org && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {org.name}
              </span>
            )}
          </div>
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
    </div>
  );
}
