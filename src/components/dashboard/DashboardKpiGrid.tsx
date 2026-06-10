// KPI rail del dashboard — Dashboard Final (8 KPIs verticales).
// Tarjetas tipo portrait, 2 filas de 4 en desktop. "Citas de hoy" y
// "Citas confirmadas" usan datos reales de Agenda. El resto muestra estado
// honesto (chip "Pendiente"/"Configurable") hasta tener agregaciones seguras
// (Cobros, Presupuestos, Pacientes, metas). Nunca se inventan montos.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  CircleDollarSign,
  FileText,
  UserPlus,
  TrendingUp,
  BadgeCheck,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

const APPT_STATUS_ES: Record<string, string> = {
  SCHEDULED: "programadas",
  CONFIRMED: "confirmadas",
  COMPLETED: "completadas",
  CANCELED: "canceladas",
  NO_SHOW: "no presentadas",
  RESCHEDULED: "reagendadas",
};

type KpiStatus = "Activo" | "Pendiente" | "Configurable";

const STATUS_CHIP_CLASS: Record<KpiStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  Pendiente: "bg-muted/60 text-muted-foreground",
  Configurable: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
};

interface KpiCardProps {
  cardId: string;
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  status: KpiStatus;
  footer: string;
  href?: string;
}

function KpiCard({ cardId, icon: Icon, accent, label, value, status, footer, href }: KpiCardProps) {
  const content = (
    <>
      <div className="flex w-full items-center justify-between">
        <span className={cn("flex items-center justify-center size-7 rounded-lg transition-transform group-hover:scale-105", accent)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
          {status}
        </span>
      </div>

      <div>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        <p className="mt-0.5 w-full truncate text-[11px] font-medium text-foreground/70">{label}</p>
      </div>

      <p className={cn("w-full truncate text-[10px] font-medium", href ? "text-primary/80 group-hover:text-primary transition-colors" : "text-muted-foreground")}>
        {href ? `${footer} →` : footer}
      </p>
    </>
  );

  const className = "group relative flex aspect-[4/5] w-full flex-col justify-between rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]";

  if (!href) {
    return (
      <div data-dashboard-card={cardId} className={cn(className, "opacity-80")}>
        {content}
      </div>
    );
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className={cn(className, "hover:ring-foreground/10 cursor-pointer")}>
      {content}
    </Link>
  );
}

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
}

export function DashboardKpiGrid({ appointmentsToday }: Props) {
  // KPI 1 — Citas de hoy (REAL vía agenda/queries.ts).
  let citasValue = "—";
  let citasFooter = "Ver agenda";
  let confirmadasValue = "—";
  let confirmadasStatus: KpiStatus = "Pendiente";
  let confirmadasFooter = "Ver agenda";

  if (appointmentsToday !== null) {
    const n = appointmentsToday.length;
    citasValue = String(n);
    confirmadasStatus = "Activo";

    const counts = new Map<string, number>();
    for (const a of appointmentsToday) {
      counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
    }

    if (n > 0) {
      const [topStatus, topCount] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      citasFooter = `${topCount} ${APPT_STATUS_ES[topStatus] ?? topStatus.toLowerCase()}`;
    }

    const confirmadas = counts.get("CONFIRMED") ?? 0;
    confirmadasValue = String(confirmadas);
    confirmadasFooter = "Hoy";
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <KpiCard
        cardId="kpi-citas"
        icon={CalendarCheck}
        accent="bg-emerald-500/10 text-emerald-600"
        label="Citas de hoy"
        value={citasValue}
        status="Activo"
        footer={citasFooter}
        href="/agenda"
      />

      <KpiCard
        cardId="kpi-cobrado"
        icon={Wallet}
        accent="bg-violet-500/10 text-violet-600"
        label="Cobrado este mes"
        value="—"
        status="Pendiente"
        footer="Este mes"
        href="/cobros"
      />

      <KpiCard
        cardId="kpi-porcobrar"
        icon={CircleDollarSign}
        accent="bg-amber-500/10 text-amber-600"
        label="Por cobrar"
        value="—"
        status="Pendiente"
        footer="Ver cobros"
        href="/cobros"
      />

      <KpiCard
        cardId="kpi-presupuestos"
        icon={FileText}
        accent="bg-blue-500/10 text-blue-600"
        label="Presupuestos"
        value="—"
        status="Pendiente"
        footer="Ver presupuestos"
        href="/presupuestos"
      />

      <KpiCard
        cardId="kpi-nuevos-pacientes"
        icon={UserPlus}
        accent="bg-rose-500/10 text-rose-600"
        label="Nuevos pacientes"
        value="—"
        status="Pendiente"
        footer="Este mes"
      />

      <KpiCard
        cardId="kpi-ingresos"
        icon={TrendingUp}
        accent="bg-teal-500/10 text-teal-600"
        label="Ingresos del mes"
        value="—"
        status="Pendiente"
        footer="Este mes"
      />

      <KpiCard
        cardId="kpi-confirmadas"
        icon={BadgeCheck}
        accent="bg-sky-500/10 text-sky-600"
        label="Citas confirmadas"
        value={confirmadasValue}
        status={confirmadasStatus}
        footer={confirmadasFooter}
        href="/agenda"
      />

      <KpiCard
        cardId="kpi-conversion"
        icon={Percent}
        accent="bg-cyan-500/10 text-cyan-600"
        label="Conversión"
        value="—"
        status="Configurable"
        footer="Configurar"
      />
    </div>
  );
}
