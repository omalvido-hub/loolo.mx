// KPI rail del dashboard — Dashboard Final Adjustments.
// 4 tarjetas verticales tipo portrait (2 por bloque). "Citas de hoy" usa datos
// reales de Agenda. El resto muestra estado honesto (chip "Pendiente"/
// "Configurable") hasta tener agregaciones seguras (Cobros, Tratamientos,
// metas). Nunca se inventan montos.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  ClipboardList,
  Scale,
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
  className?: string;
}

export function KpiCard({ cardId, icon: Icon, accent, label, value, status, footer, href, className }: KpiCardProps) {
  const content = (
    <>
      <div className="flex w-full items-center justify-between">
        <span className={cn("flex items-center justify-center size-7 rounded-xl transition-transform group-hover:scale-105", accent)}>
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

  const baseClassName = "group relative flex aspect-[4/5] w-full flex-col justify-between self-start rounded-3xl border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]";

  if (!href) {
    return (
      <div data-dashboard-card={cardId} className={cn(baseClassName, "opacity-80", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className={cn(baseClassName, "hover:ring-foreground/10 cursor-pointer", className)}>
      {content}
    </Link>
  );
}

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
  className?: string;
}

// KPI 1 — Citas de hoy (REAL vía agenda/queries.ts).
export function CitasHoyKpi({ appointmentsToday, className }: Props) {
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
    <KpiCard
      cardId="kpi-citas"
      icon={CalendarCheck}
      accent="bg-emerald-500/10 text-emerald-600"
      label="Citas de hoy"
      value={citasValue}
      status="Activo"
      footer={citasFooter}
      href="/agenda"
      className={className}
    />
  );
}

// KPI 2 — Cobrado este mes — honesto, pendiente.
export function CobradoMesKpi({ className }: { className?: string }) {
  return (
    <KpiCard
      cardId="kpi-cobrado"
      icon={Wallet}
      accent="bg-violet-500/10 text-violet-600"
      label="Cobrado este mes"
      value="—"
      status="Pendiente"
      footer="Este mes"
      href="/cobros"
      className={className}
    />
  );
}

// KPI 3 — Tratamientos activos — honesto, pendiente (sin duplicar Pacientes).
export function TratamientosActivosKpi({ className }: { className?: string }) {
  return (
    <KpiCard
      cardId="kpi-tratamientos"
      icon={ClipboardList}
      accent="bg-rose-500/10 text-rose-600"
      label="Tratamientos activos"
      value="—"
      status="Pendiente"
      footer="Pendiente"
      className={className}
    />
  );
}

// KPI 4 — Punto de equilibrio — honesto, configurable.
export function PuntoEquilibrioKpi({ className }: { className?: string }) {
  return (
    <KpiCard
      cardId="kpi-punto-equilibrio"
      icon={Scale}
      accent="bg-cyan-500/10 text-cyan-600"
      label="Punto de equilibrio"
      value="—"
      status="Configurable"
      footer="Configurar"
      className={className}
    />
  );
}
