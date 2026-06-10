// KPI rail del dashboard — Dashboard Final v2 (8 tarjetas en 2 bloques).
// Cada bloque combina 2 tarjetas verticales (portrait) + 2 horizontales
// compactas. "Citas de hoy" usa datos reales de Agenda. El resto muestra
// estado honesto (chip "Pendiente"/"Configurable") hasta tener agregaciones
// seguras (Cobros, Tratamientos, Presupuestos, metas). Nunca se inventan montos.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  CircleDollarSign,
  FileText,
  ClipboardList,
  TrendingUp,
  Scale,
  Target,
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

interface CardProps {
  cardId: string;
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  status: KpiStatus;
  footer: string;
  href?: string;
}

// Tarjeta vertical tipo portrait — para los 2 KPIs principales de cada bloque.
export function VerticalKpiCard({ cardId, icon: Icon, accent, label, value, status, footer, href }: CardProps) {
  const content = (
    <>
      <div className="flex w-full items-center justify-between">
        <span className={cn("flex items-center justify-center size-8 rounded-xl transition-transform group-hover:scale-105", accent)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
          {status}
        </span>
      </div>

      <div>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs font-medium text-foreground/70">{label}</p>
      </div>

      <p className={cn("text-[11px] font-medium", href ? "text-primary/80 group-hover:text-primary transition-colors" : "text-muted-foreground")}>
        {href ? `${footer} →` : footer}
      </p>
    </>
  );

  const className = "group relative flex h-[220px] sm:h-[290px] w-full flex-col justify-between rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]";

  if (!href) {
    return (
      <div data-dashboard-card={cardId} className={cn(className, "opacity-90")}>
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

// Tarjeta horizontal compacta — para los 2 KPIs secundarios de cada bloque.
export function HorizontalKpiCard({ cardId, icon: Icon, accent, label, value, status, footer, href }: CardProps) {
  const content = (
    <>
      <span className={cn("flex shrink-0 items-center justify-center size-9 rounded-xl transition-transform group-hover:scale-105", accent)}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground/70">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
          {status}
        </span>
        <span className={cn("text-[11px] font-medium", href ? "text-primary/80 group-hover:text-primary transition-colors" : "text-muted-foreground")}>
          {href ? `${footer} →` : footer}
        </span>
      </div>
    </>
  );

  const className = "group relative flex h-[118px] sm:h-[132px] w-full items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]";

  if (!href) {
    return (
      <div data-dashboard-card={cardId} className={cn(className, "opacity-90")}>
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

// Bloque 1 — vertical 1: Citas de hoy (REAL vía agenda/queries.ts).
export function CitasHoyKpi({ appointmentsToday }: Props) {
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
    <VerticalKpiCard
      cardId="kpi-citas"
      icon={CalendarCheck}
      accent="bg-emerald-500/10 text-emerald-600"
      label="Citas de hoy"
      value={citasValue}
      status="Activo"
      footer={citasFooter}
      href="/agenda"
    />
  );
}

// Bloque 1 — vertical 2: Cobrado este mes.
export function CobradoMesKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-cobrado"
      icon={Wallet}
      accent="bg-violet-500/10 text-violet-600"
      label="Cobrado este mes"
      value="—"
      status="Pendiente"
      footer="Este mes"
      href="/cobros"
    />
  );
}

// Bloque 1 — horizontal 1: Por cobrar.
export function PorCobrarKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-porcobrar"
      icon={CircleDollarSign}
      accent="bg-amber-500/10 text-amber-600"
      label="Por cobrar"
      value="—"
      status="Pendiente"
      footer="Ver cobros"
      href="/cobros"
    />
  );
}

// Bloque 1 — horizontal 2: Presupuestos pendientes.
export function PresupuestosPendientesKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-presupuestos"
      icon={FileText}
      accent="bg-blue-500/10 text-blue-600"
      label="Presupuestos pendientes"
      value="—"
      status="Pendiente"
      footer="Ver presupuestos"
      href="/presupuestos"
    />
  );
}

// Bloque 2 — vertical 1: Tratamientos activos.
export function TratamientosActivosKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-tratamientos"
      icon={ClipboardList}
      accent="bg-rose-500/10 text-rose-600"
      label="Tratamientos activos"
      value="—"
      status="Pendiente"
      footer="Pendiente"
    />
  );
}

// Bloque 2 — vertical 2: Ingresos del mes.
export function IngresosMesKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-ingresos"
      icon={TrendingUp}
      accent="bg-teal-500/10 text-teal-600"
      label="Ingresos del mes"
      value="—"
      status="Pendiente"
      footer="Este mes"
    />
  );
}

// Bloque 2 — horizontal 1: Punto de equilibrio.
export function PuntoEquilibrioKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-punto-equilibrio"
      icon={Scale}
      accent="bg-cyan-500/10 text-cyan-600"
      label="Punto de equilibrio"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}

// Bloque 2 — horizontal 2: Meta mensual.
export function MetaMensualKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-meta-mensual"
      icon={Target}
      accent="bg-fuchsia-500/10 text-fuchsia-600"
      label="Meta mensual"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}
