// Cockpit principal del dashboard — Dashboard Executive 2A.
// "Agenda de hoy" usa datos reales de Agenda. "Dinero por atender" y
// "Acciones sugeridas" muestran estado honesto hasta tener las
// agregaciones de Cobros/Presupuestos/Seguimiento. Sin datos inventados.

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

function PanelCard({
  title,
  badge,
  accentBar,
  className,
  children,
}: {
  title: string;
  badge?: string;
  accentBar: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.16)]", className)}>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-70", accentBar)} />
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {badge && (
          <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 pb-3">{children}</div>
    </div>
  );
}

function CompactHint({ icon: Icon, accent, children }: { icon: React.ElementType; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-muted/40 to-transparent px-3 py-2.5 transition-colors group-hover:from-muted/60">
      <span className={cn("flex shrink-0 items-center justify-center size-7 rounded-lg transition-transform group-hover:scale-105", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-xs leading-snug text-muted-foreground">{children}</p>
    </div>
  );
}

interface AgendaPanelProps {
  appointmentsToday: AppointmentListItem[] | null;
}

// A) Agenda de hoy — REAL, panel principal.
export function AgendaPanel({ appointmentsToday }: AgendaPanelProps) {
  return (
    <PanelCard title="Agenda de hoy" accentBar="from-emerald-400 to-emerald-300">
      {appointmentsToday === null || appointmentsToday.length === 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-b from-muted/40 to-transparent px-3 py-2 transition-colors group-hover:from-muted/60">
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-105">
              <CalendarClock className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs leading-snug text-muted-foreground">
              {appointmentsToday === null ? "Conecta tu agenda" : "Sin citas hoy"}
            </p>
          </div>
          <Link href="/agenda" className="shrink-0 text-xs font-medium text-primary/80 hover:text-primary transition-colors">
            Ver agenda →
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {appointmentsToday.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
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
          <div className="mt-2 flex justify-end">
            <Link href="/agenda" className="text-xs font-medium text-primary/80 hover:text-primary transition-colors">
              Ver agenda →
            </Link>
          </div>
        </>
      )}
    </PanelCard>
  );
}

// B) Dinero por atender — honesto, pendiente.
export function MoneyPanel() {
  return (
    <PanelCard title="Dinero por atender" accentBar="from-violet-400 to-violet-300" badge="Por conectar">
      <CompactHint icon={Wallet2} accent="bg-violet-500/10 text-violet-600">
        Por conectar
      </CompactHint>
      <div className="mt-2 flex justify-end">
        <Link href="/cobros" className="text-xs font-medium text-primary/80 hover:text-primary transition-colors">
          Ver cobros →
        </Link>
      </div>
    </PanelCard>
  );
}

// C) Acciones sugeridas — honesto, pendiente.
export function ActionsPanel() {
  return (
    <PanelCard title="Acciones sugeridas" accentBar="from-amber-400 to-amber-300" badge="Próximamente">
      <CompactHint icon={Compass} accent="bg-amber-500/10 text-amber-600">
        Se activará al conectar Agenda, Cobros y Seguimiento
      </CompactHint>
    </PanelCard>
  );
}
