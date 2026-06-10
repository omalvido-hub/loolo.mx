// Widgets centrales del dashboard — Dashboard Control Center (Fase 1).
// "Agenda viva de hoy" usa datos reales de Agenda. "Próximas acciones" y
// "Radar de dinero atorado" muestran estado honesto hasta tener las
// agregaciones de cobros/seguimiento (Fase 2+). Sin datos inventados.

import Link from "next/link";
import { CalendarClock, Compass, Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

const FMT_TIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "numeric",
  minute: "2-digit",
});

const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
  NO_SHOW: "No presentó",
  RESCHEDULED: "Reagendada",
};

const APPT_STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELED: "bg-muted text-muted-foreground line-through",
  NO_SHOW: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
  RESCHEDULED: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
};

function fTime(iso: string): string {
  try {
    return FMT_TIME.format(new Date(iso));
  } catch {
    return "—";
  }
}

function WidgetCard({
  title,
  subtitle,
  accentBar,
  badge,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  accentBar: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.16)] ${className ?? ""}`}>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-70", accentBar)} />
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3.5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <span className="mt-0.5 shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function EmptyHint({ icon: Icon, accent, children }: { icon: React.ElementType; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-muted/40 to-transparent px-4 py-9 text-center transition-colors group-hover:from-muted/60">
      <span className={cn("flex items-center justify-center size-11 rounded-2xl transition-transform group-hover:scale-105", accent)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="max-w-[230px] text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
}

export function DashboardWidgetGrid({ appointmentsToday }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* A) Agenda viva de hoy — REAL */}
      <WidgetCard
        title="Agenda viva de hoy"
        subtitle="Tus próximas citas, en orden"
        accentBar="from-emerald-400 to-emerald-300"
        className="lg:col-span-2"
      >
        {appointmentsToday === null ? (
          <EmptyHint icon={CalendarClock} accent="bg-emerald-500/10 text-emerald-600">
            Conecta Agenda para ver tus citas de hoy aquí.
          </EmptyHint>
        ) : appointmentsToday.length === 0 ? (
          <EmptyHint icon={CalendarClock} accent="bg-emerald-500/10 text-emerald-600">
            Aún no hay citas para hoy.
          </EmptyHint>
        ) : (
          <ul className="divide-y">
            {appointmentsToday.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium tabular-nums text-foreground/80 shrink-0">
                    {fTime(a.startAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.displayName ?? "Paciente sin nombre"}
                    </p>
                    {a.professionalName && (
                      <p className="text-xs text-muted-foreground truncate">{a.professionalName}</p>
                    )}
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", APPT_STATUS_CLASS[a.status] ?? "bg-muted text-muted-foreground")}>
                  {APPT_STATUS_LABELS[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-end">
          <Link href="/agenda" className="text-xs font-medium text-primary/80 hover:text-primary transition-colors">
            Ver agenda completa →
          </Link>
        </div>
      </WidgetCard>

      {/* B) Próximas acciones — honesto, pendiente */}
      <WidgetCard title="Próximas acciones" accentBar="from-amber-400 to-amber-300" badge="Próximamente">
        <EmptyHint icon={Compass} accent="bg-amber-500/10 text-amber-600">
          Las acciones inteligentes se activarán al conectar Cobros, Agenda y Seguimiento.
        </EmptyHint>
      </WidgetCard>

      {/* C) Radar de dinero atorado — honesto, pendiente */}
      <WidgetCard title="Radar de dinero atorado" subtitle="Pacientes con saldo pendiente" accentBar="from-violet-400 to-violet-300" badge="Próximamente" className="lg:col-span-3">
        <EmptyHint icon={Wallet2} accent="bg-violet-500/10 text-violet-600">
          Pendiente de conectar con Cobros y Presupuestos.
        </EmptyHint>
        <div className="mt-3 flex justify-end">
          <Link href="/cobros" className="text-xs font-medium text-primary/80 hover:text-primary transition-colors">
            Ir a cobros →
          </Link>
        </div>
      </WidgetCard>
    </div>
  );
}
