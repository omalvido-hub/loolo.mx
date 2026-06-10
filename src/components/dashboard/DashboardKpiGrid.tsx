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

interface KpiCardProps {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  meaning: string;
  detail: string;
  href?: string;
  actionLabel: string;
  pending?: boolean;
}

function KpiCard({ icon: Icon, accent, label, value, meaning, detail, href, actionLabel, pending }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center justify-center size-10 rounded-2xl transition-transform group-hover:scale-105", accent)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {pending && (
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
            Pendiente
          </span>
        )}
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground/80">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meaning}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p>
        {href && (
          <span className="shrink-0 text-[11px] font-medium text-primary/80 group-hover:text-primary transition-colors">
            {actionLabel} →
          </span>
        )}
      </div>
    </>
  );

  const className = "group relative flex flex-col rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.2)]";

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
      ? `Tienes ${patientsTotal} ${patientsTotal === 1 ? "paciente registrado" : "pacientes registrados"}. Próximamente: saldos, tratamientos, citas y documentos.`
      : "Próximamente: saldos, tratamientos, citas y documentos.";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        icon={CalendarCheck}
        accent="bg-emerald-500/10 text-emerald-600"
        label="Citas de hoy"
        value={citasValue}
        meaning="Citas programadas para hoy en tu agenda"
        detail={citasDetail}
        href="/agenda"
        actionLabel="Ver agenda"
      />

      <KpiCard
        icon={Wallet}
        accent="bg-violet-500/10 text-violet-600"
        label="Cobrado este mes"
        value="—"
        meaning="Ingresos confirmados en lo que va del mes"
        detail="Pendiente de conectar con Cobros."
        href="/cobros"
        actionLabel="Ver cobros"
        pending
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
        pending
      />

      <KpiCard
        icon={FileText}
        accent="bg-blue-500/10 text-blue-600"
        label="Presupuestos por cerrar"
        value="—"
        meaning="Presupuestos enviados sin respuesta del paciente"
        detail="Pendiente de conectar con Presupuestos."
        href="/presupuestos"
        actionLabel="Ver presupuestos"
        pending
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
        pending
      />

      <KpiCard
        icon={Target}
        accent="bg-cyan-500/10 text-cyan-600"
        label="Meta / break-even"
        value="—"
        meaning="Punto de equilibrio mensual de tu clínica"
        detail="Configura tus gastos para calcular tu break-even."
        actionLabel="Próximamente"
        pending
      />
    </div>
  );
}
