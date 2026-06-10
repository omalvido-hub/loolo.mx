// Header inteligente del dashboard: resumen honesto del día.
// Solo usa datos ya disponibles (citas de hoy). Sin permiso o sin citas,
// muestra un estado claro en vez de inventar cifras.

import Link from "next/link";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
}

function buildMessage(appointmentsToday: AppointmentListItem[] | null): string {
  if (appointmentsToday === null) {
    return "Conecta tu agenda para ver el resumen de tu día.";
  }
  const n = appointmentsToday.length;
  if (n === 0) return "Aún no hay citas para hoy.";
  return `Hoy tienes ${n} ${n === 1 ? "cita programada" : "citas programadas"}.`;
}

export function DashboardTodayHeader({ appointmentsToday }: Props) {
  const message = buildMessage(appointmentsToday);

  return (
    <div className="rounded-2xl border bg-card px-5 py-4 ring-1 ring-foreground/[0.04] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Hoy en tu clínica
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/agenda"
          className="inline-flex items-center rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver agenda
        </Link>
        <Link
          href="/pacientes"
          className="inline-flex items-center rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver pacientes
        </Link>
        <Link
          href="/cobros"
          className="inline-flex items-center rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver cobros
        </Link>
      </div>
    </div>
  );
}
