import { getSessionWithMemberships } from "@/lib/session";
import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { listAppointmentsByRange } from "@/server/domain/agenda/queries";
import { listPatientsForOrg } from "@/server/domain/patient-record/list";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";
import { DashboardTodayHeader } from "@/components/dashboard/DashboardTodayHeader";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { AgendaPanel, MoneyPanel, ActionsPanel } from "@/components/dashboard/DashboardWidgetGrid";
import { DraggableDashboardLayout } from "@/components/dashboard/DraggableDashboardLayout";

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

  let patientsTotal: number | null = null;
  if (can(ctx.permissions, "patients.view")) {
    const result = await listPatientsForOrg(run, ctx, { limit: 1 });
    if (result.ok) patientsTotal = result.value.total;
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,0,0,0.035),transparent)]"
      />

      <div className="mx-auto max-w-7xl space-y-3 px-6 pt-4 pb-10 sm:px-8 lg:pt-6">
        <div className="relative overflow-hidden rounded-2xl border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] sm:px-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[conic-gradient(from_140deg,theme(colors.sky.300/.25),theme(colors.violet.300/.2),theme(colors.fuchsia.200/.2),transparent_70%)] blur-2xl"
          />
          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Bienvenido, {firstName}
            </h1>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {greeting} · tu espacio de trabajo
            </p>
            {org && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {org.name}
              </span>
            )}
          </div>

          <DashboardTodayHeader appointmentsToday={appointmentsToday} />
        </div>

        <DraggableDashboardLayout
          storageKey="nelzzon.dashboard.layout.v1.top"
          defaultOrder={["agenda", "side", "kpis"]}
          items={{
            agenda: <AgendaPanel appointmentsToday={appointmentsToday} />,
            side: (
              <DraggableDashboardLayout
                storageKey="nelzzon.dashboard.layout.v1.side"
                defaultOrder={["dinero", "acciones"]}
                items={{ dinero: <MoneyPanel />, acciones: <ActionsPanel /> }}
                className="flex flex-col gap-2.5"
              />
            ),
            kpis: <DashboardKpiGrid appointmentsToday={appointmentsToday} patientsTotal={patientsTotal} />,
          }}
          className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:items-start"
          itemClassName={(id) =>
            id === "agenda" || id === "kpis"
              ? "lg:col-span-2"
              : id === "side"
                ? "lg:row-span-2"
                : undefined
          }
        />
      </div>
    </div>
  );
}
