// KPIs principales del dashboard — Dashboard Control Center (Fase 1).
// Cada tarjeta comunica: dato, significado, riesgo/estado y acción.
// "Citas de hoy" usa datos reales de Agenda. El resto muestra estado honesto
// ("Pendiente de conectar" / "Próximamente") hasta tener agregaciones seguras
// (Fase 2) o configuración de gastos/metas (Fase 3). Nunca se inventan montos.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  CircleDollarSign,
  FileText,
  HeartPulse,
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

interface KpiCardProps {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  meaning: string;
  detail: string;
  href?: string;
  actionLabel: string;
  status: KpiStatus;
}

function KpiCard({ icon: Icon, accent, label, value, meaning, detail, href, actionLabel, status }: KpiCardProps) {
  const content = (
    <>
      <div className="flex w-full items-center justify-between">
        <span className={cn("flex items-center justify-center size-7 rounded-lg transition-transform group-hover:scale-105", accent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
          {status}
        </span>
      </div>

      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-foreground/80">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{meaning}</p>

      <div className="mt-1.5 w-full border-t pt-1.5">
        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{detail}</p>
        {href && (
          <span className="mt-1 inline-block text-[11px] font-medium text-primary/80 group-hover:text-primary transition-colors">
            {actionLabel} →
          </span>
        )}
      </div>
    </>
  );

  const className = "group relative flex flex-col items-start rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.2)]";

  if (!href) {
    return <div className={cn(className, "opacity-80")}>{content}</div>;
  }

  return (
    <Link href={href} className={cn(className, "hover:ring-foreground/10 cursor-pointer")}>
      {content}
    </Link>
  );
}

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
  patientsTotal: number | null;
}

export function DashboardKpiGrid({ appointmentsToday, patientsTotal }: Props) {
  // KPI 1 — Citas de hoy (REAL vía agenda/queries.ts).
  let citasValue = "—";
  let citasDetail = "Conecta Agenda para ver tus citas de hoy.";
  if (appointmentsToday !== null) {
    const n = appointmentsToday.length;
    citasValue = String(n);
    if (n === 0) {
      citasDetail = "Sin citas registradas para hoy.";
    } else {
      const counts = new Map<string, number>();
      for (const a of appointmentsToday) {
        counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
      }
      citasDetail = Array.from(counts.entries())
        .map(([status, count]) => `${count} ${APPT_STATUS_ES[status] ?? status.toLowerCase()}`)
        .join(" · ");
    }
  }

  // KPI 5 — Pacientes que requieren atención (PARCIAL: cartera total es real,
  // el cálculo de "requieren atención" llega en una fase futura).
  const pacientesDetail =
    patientsTotal !== null
      ? `${patientsTotal} ${patientsTotal === 1 ? "paciente registrado" : "pacientes registrados"}. Próximamente: saldos y seguimiento.`
      : "Próximamente: saldos y seguimiento.";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <KpiCard
        icon={CalendarCheck}
        accent="bg-emerald-500/10 text-emerald-600"
        label="Citas de hoy"
        value={citasValue}
        meaning="Citas programadas para hoy"
        detail={citasDetail}
        href="/agenda"
        actionLabel="Ver agenda"
        status="Activo"
      />

      <KpiCard
        icon={Wallet}
        accent="bg-violet-500/10 text-violet-600"
        label="Cobrado este mes"
        value="—"
        meaning="Ingresos confirmados del mes"
        detail="Pendiente de conectar con Cobros."
        href="/cobros"
        actionLabel="Ver cobros"
        status="Pendiente"
      />

      <KpiCard
        icon={CircleDollarSign}
        accent="bg-amber-500/10 text-amber-600"
        label="Dinero pendiente"
        value="—"
        meaning="Saldo que tus pacientes te deben"
        detail="Pendiente de conectar con Cobros."
        href="/cobros"
        actionLabel="Ver cobros"
        status="Pendiente"
      />

      <KpiCard
        icon={FileText}
        accent="bg-blue-500/10 text-blue-600"
        label="Presupuestos por cerrar"
        value="—"
        meaning="Presupuestos sin respuesta"
        detail="Pendiente de conectar con Presupuestos."
        href="/presupuestos"
        actionLabel="Ver presupuestos"
        status="Pendiente"
      />

      <KpiCard
        icon={HeartPulse}
        accent="bg-rose-500/10 text-rose-600"
        label="Pacientes que requieren atención"
        value="—"
        meaning="Pacientes con seguimiento pendiente"
        detail={pacientesDetail}
        href="/pacientes"
        actionLabel="Ver pacientes"
        status="Pendiente"
      />

      <KpiCard
        icon={Target}
        accent="bg-cyan-500/10 text-cyan-600"
        label="Meta / break-even"
        value="—"
        meaning="Punto de equilibrio mensual"
        detail="Configura tus gastos para calcular tu break-even."
        actionLabel="Próximamente"
        status="Configurable"
      />
    </div>
  );
}
