import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { can } from "@/server/domain/identity/permissions";
import { listAppointmentsByRange, getChairCapacityToday } from "@/server/domain/agenda/queries";
import { getQuotesOverviewSafeView, getPaymentsOverviewSafeView } from "@/server/domain/billing/billing-views";
import { getTreatmentPlansOverviewSafeView } from "@/server/domain/clinical/treatment-views";
import { getFinancePeriodSafeView } from "@/server/domain/finance/finance-views";
import type { FinancePeriodView } from "@/server/domain/finance/finance-views";
import { SinapsisShell } from "@/components/sinapsis/SinapsisShell";
import type {
  SinapsisAhoraItem,
  SinapsisCarteraItem,
  SinapsisDashboardData,
  SinapsisFirmaItem,
  SinapsisTrendPoint,
} from "@/components/sinapsis/types";

const TZ = "America/Mexico_City";

function mxDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

export default async function DashboardPage() {
  let userId: string;
  let organizationId: string;
  let userName: string;
  try {
    const orgCtx = await requireOrganization();
    userId = orgCtx.user.id;
    organizationId = orgCtx.organizationId;
    userName = orgCtx.user.name ?? orgCtx.user.email;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) redirect("/login");
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);
  const run = makeTenantRunner(organizationId);

  const now = new Date();
  const todayKey = mxDateKey(now.toISOString());

  // Citas de hoy + tarjeta AHORA + minutos ocupados en sillón (para OCUPACIÓN).
  let citasHoyCount = 0;
  let bookedChairMinutes = 0;
  const ahoraItems: SinapsisAhoraItem[] = [];
  if (can(ctx.permissions, "appointments.view")) {
    const result = await listAppointmentsByRange(run, ctx, {});
    if (result.ok) {
      citasHoyCount = result.value.items.length;
      for (const a of result.value.items) {
        if (a.status === "CANCELED") continue;
        const start = new Date(a.startAt).getTime();
        const end = new Date(a.endAt).getTime();
        if (a.chairResourceId) bookedChairMinutes += (end - start) / 60_000;
        ahoraItems.push({
          id: a.id,
          patientName: a.displayName ?? "Paciente",
          startAt: a.startAt,
          endAt: a.endAt,
          status: a.status,
          isNow: now.getTime() >= start && now.getTime() < end,
        });
      }
    }
  }

  // OCUPACIÓN: minutos ocupados en sillón hoy vs minutos disponibles reales
  // (resources kind=CHAIR + availability_rules del día). Sin sillones/reglas
  // para hoy → null, nunca un porcentaje inventado.
  let ocupacionPercent: number | null = null;
  if (can(ctx.permissions, "resources.view")) {
    const result = await getChairCapacityToday(run, ctx);
    if (result.ok && result.value.availableMinutes > 0) {
      ocupacionPercent = Math.round(Math.min(1, bookedChairMinutes / result.value.availableMinutes) * 100);
    }
  }

  // Meta mensual y costos fijos del periodo actual (si la organización los
  // configuró). Sin fila para este año/mes → null, "sin datos suficientes".
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  let financePeriod: FinancePeriodView | null = null;
  if (can(ctx.permissions, "config.view")) {
    const result = await getFinancePeriodSafeView(run, ctx, { year: todayYear, month: todayMonth });
    if (result.ok) financePeriod = result.value;
  }

  // ESPERAN TU FIRMA: presupuestos DRAFT + planes DRAFT.
  // POR COBRAR: presupuestos ACCEPTED con saldo pendiente (misma consulta,
  // sin ida y vuelta extra al backend — ya trae balanceCents por presupuesto).
  const firmaItems: SinapsisFirmaItem[] = [];
  const carteraItems: SinapsisCarteraItem[] = [];
  let carteraTotalCents = 0;
  if (can(ctx.permissions, "quote.view")) {
    const result = await getQuotesOverviewSafeView(run, ctx, { limit: 200 });
    if (result.ok) {
      for (const q of result.value.quotes) {
        if (q.status === "DRAFT") {
          firmaItems.push({
            id: q.id,
            kind: "quote",
            patientName: q.patientName,
            label: q.quoteNumber ? `Presupuesto ${q.quoteNumber} · borrador` : "Presupuesto en borrador",
            href: `/pacientes/${q.patientId}`,
            createdAt: q.createdAt,
          });
        } else if (q.status === "ACCEPTED" && q.balanceCents > 0) {
          carteraItems.push({
            id: q.id,
            patientName: q.patientName,
            href: `/pacientes/${q.patientId}`,
            balanceCents: q.balanceCents,
            quoteNumber: q.quoteNumber,
            acceptedAt: q.acceptedAt ?? q.createdAt,
          });
          carteraTotalCents += q.balanceCents;
        }
      }
    }
  }
  if (can(ctx.permissions, "treatment.view")) {
    const result = await getTreatmentPlansOverviewSafeView(run, ctx, { statuses: ["DRAFT"], limit: 200 });
    if (result.ok) {
      for (const p of result.value.plans) {
        firmaItems.push({
          id: p.id,
          kind: "plan",
          patientName: p.patientName,
          label: `Plan de tratamiento · ${p.itemsCount} ${p.itemsCount === 1 ? "procedimiento" : "procedimientos"}`,
          href: `/pacientes/${p.patientId}`,
          createdAt: p.createdAt,
        });
      }
    }
  }

  // DINERO: cobrado bruto del mes en curso + tendencia diaria de los últimos
  // 7 días (mini-gráfica viva dentro de la tarjeta DINERO).
  let cobradoMesBrutoCents: number | null = null;
  const tendencia: SinapsisTrendPoint[] = [];
  if (can(ctx.permissions, "payment.view")) {
    const result = await getPaymentsOverviewSafeView(run, ctx, { limit: 500 });
    if (result.ok) {
      const monthKey = todayKey.slice(0, 7); // YYYY-MM
      let monthNet = 0;
      const byDay = new Map<string, number>();
      const last7 = new Set<string>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString("en-CA", { timeZone: TZ });
        byDay.set(key, 0);
        last7.add(key);
      }

      for (const p of result.value.payments) {
        const signed = p.entryKind === "REVERSAL" ? -p.amountCents : p.amountCents;
        const dayKey = mxDateKey(p.paidAt);
        if (dayKey.startsWith(monthKey)) monthNet += signed;
        if (last7.has(dayKey)) byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + signed);
      }

      cobradoMesBrutoCents = monthNet;
      for (const [date, netCents] of byDay.entries()) {
        tendencia.push({ date, netCents });
      }
      tendencia.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  // META, FLUJO NETO y PUNTO DE EQUILIBRIO salen de financePeriod + lo
  // realmente cobrado este mes. Sin periodo configurado, se declaran
  // honestamente como "sin datos suficientes" (null) en vez de inventarse.
  const metaPercent =
    financePeriod && financePeriod.monthlyGoalCents > 0 && cobradoMesBrutoCents !== null
      ? Math.round((cobradoMesBrutoCents / financePeriod.monthlyGoalCents) * 100)
      : null;
  const flujoNetoCents =
    financePeriod && cobradoMesBrutoCents !== null ? cobradoMesBrutoCents - financePeriod.fixedCostTotalCents : null;
  const equilibrioCents = financePeriod ? financePeriod.fixedCostTotalCents : null;

  const data: SinapsisDashboardData = {
    userName,
    citasHoyCount,
    citasHoyHref: "/agenda",
    cobradoMesBrutoCents,
    metaPercent,
    ocupacionPercent,
    fechaISO: now.toISOString(),
    firmaItems,
    ahoraItems,
    carteraItems,
    carteraTotalCents,
    tendencia,
    gastoConfigured: financePeriod !== null,
    flujoNetoCents,
    equilibrioCents,
  };

  return <SinapsisShell permissions={Array.from(ctx.permissions)} data={data} />;
}
