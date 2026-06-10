// KPI rail del dashboard — Dashboard Executive 2A.
// Mini cards de lectura rápida. "Citas de hoy" usa datos reales de Agenda.
// El resto muestra estado honesto (chip "Pendiente"/"Configurable") hasta
// tener agregaciones seguras (Cobros, Presupuestos, Seguimiento, metas).
// Nunca se inventan montos.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  CircleDollarSign,
  FileText,
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
        <span className={cn("flex items-center justify-center size-6 rounded-lg transition-transform group-hover:scale-105", accent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
          {status}
        </span>
      </div>

      <p className="mt-1.5 text-base font-semibold tracking-tight">{value}</p>
      <p className="w-full truncate text-[11px] font-medium text-foreground/70">{label}</p>
      <p className={cn("mt-1 w-full truncate text-[10px] font-medium", href ? "text-primary/80 group-hover:text-primary transition-colors" : "text-muted-foreground")}>
        {href ? `${footer} →` : footer}
      </p>
    </>
  );

  const className = "group relative flex flex-col items-start rounded-xl border bg-card p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]";

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

// Fila de 4 KPIs compactos. "Citas de hoy" usa datos reales de Agenda; el
// resto muestra estado honesto (chip "Pendiente") hasta tener agregaciones
// seguras de Cobros/Presupuestos. Nunca se inventan montos.
export function DashboardKpiGrid({ appointmentsToday }: Props) {
  // KPI 1 — Citas de hoy (REAL vía agenda/queries.ts).
  let citasValue = "—";
  let citasFooter = "Ver agenda";
  if (appointmentsToday !== null) {
    const n = appointmentsToday.length;
    citasValue = String(n);
    if (n > 0) {
      const counts = new Map<string, number>();
      for (const a of appointmentsToday) {
        counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
      }
      const [topStatus, topCount] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      citasFooter = `${topCount} ${APPT_STATUS_ES[topStatus] ?? topStatus.toLowerCase()}`;
    }
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
        label="Cobrado mes"
        value="—"
        status="Pendiente"
        footer="Ver cobros"
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
    </div>
  );
}
