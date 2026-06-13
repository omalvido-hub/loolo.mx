// KPI rail del dashboard — Dashboard Final v2 (8 tarjetas en 2 bloques).
// Cada bloque combina 2 tarjetas verticales (portrait) + 2 horizontales
// compactas. "Citas de hoy" usa datos reales de Agenda. El resto muestra
// estado honesto (chip "Pendiente"/"Configurable") hasta tener agregaciones
// seguras (Cobros, Tratamientos, Presupuestos, metas). Nunca se inventan montos.
//
// FASE 1M-A: las tarjetas se renderizan con KPIWidget (componente reutilizable
// de la capa "Personalizar"), reaccionando a data-visual-* sin cambiar los
// datos ni la fuente de cada KPI.

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
import { KpiWidget, type KpiWidgetTone } from "@/components/ui/kpi-widget";
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

// Tono del KPIWidget según estado: "Activo" usa el acento de personalización
// (se nota al cambiar preset/acento), el resto queda neutro hasta tener datos.
const STATUS_TONE: Record<KpiStatus, KpiWidgetTone> = {
  Activo: "accent",
  Pendiente: "muted",
  Configurable: "muted",
};

interface CardProps {
  cardId: string;
  icon: React.ElementType;
  label: string;
  value: string;
  status: KpiStatus;
  footer: string;
  href?: string;
}

function StatusTrend({ status, footer, href }: Pick<CardProps, "status" | "footer" | "href">) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/5">
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
        {status}
      </span>
      <span className={cn("truncate text-[11px] font-medium", href ? "text-brand-accent" : "text-muted-foreground")}>
        {href ? `${footer} →` : footer}
      </span>
    </div>
  );
}

// Tarjeta vertical tipo portrait — para los 2 KPIs principales de cada bloque.
export function VerticalKpiCard({ cardId, icon: Icon, label, value, status, footer, href }: CardProps) {
  const widget = (
    <KpiWidget
      label={label}
      value={value}
      icon={<Icon className="h-4 w-4" />}
      tone={STATUS_TONE[status]}
      trend={<StatusTrend status={status} footer={footer} href={href} />}
      className={cn("flex h-[220px] sm:h-[290px] flex-col justify-between", !href && "opacity-90")}
    />
  );

  if (!href) {
    return <div data-dashboard-card={cardId}>{widget}</div>;
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className="block cursor-pointer">
      {widget}
    </Link>
  );
}

// Tarjeta horizontal compacta — para los 2 KPIs secundarios de cada bloque.
export function HorizontalKpiCard({ cardId, icon: Icon, label, value, status, footer, href }: CardProps) {
  const widget = (
    <KpiWidget
      label={label}
      value={value}
      icon={<Icon className="h-4 w-4" />}
      tone={STATUS_TONE[status]}
      trend={<StatusTrend status={status} footer={footer} href={href} />}
      className={cn("flex h-[118px] sm:h-[132px] flex-col justify-between", !href && "opacity-90")}
    />
  );

  if (!href) {
    return <div data-dashboard-card={cardId}>{widget}</div>;
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className="block cursor-pointer">
      {widget}
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
      label="Meta mensual"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}
