// Resumen "hoy" integrado en el header del dashboard.
// Solo usa datos ya disponibles (citas de hoy). Sin permiso o sin citas,
// muestra un estado claro y corto en vez de inventar cifras.

import Link from "next/link";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
}

function buildMessage(appointmentsToday: AppointmentListItem[] | null): string {
  if (appointmentsToday === null) return "Conecta tu agenda";
  const n = appointmentsToday.length;
  if (n === 0) return "Sin citas hoy";
  return `Hoy: ${n} ${n === 1 ? "cita" : "citas"}`;
}

export function DashboardTodayHeader({ appointmentsToday }: Props) {
  const message = buildMessage(appointmentsToday);

  return (
    <div className="relative mt-2 flex flex-col gap-1.5 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground">{message}</p>
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/agenda"
          className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver agenda
        </Link>
        <Link
          href="/pacientes"
          className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver pacientes
        </Link>
        <Link
          href="/cobros"
          className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          Ver cobros
        </Link>
      </div>
    </div>
  );
}
