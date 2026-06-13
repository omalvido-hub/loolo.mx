import { CalendarDays, CalendarX2 } from "lucide-react";
import type { AppointmentListResult, ResourceListResult } from "@/server/domain/agenda/queries";
import type { AgendaPatientContext } from "@/server/domain/agenda/patient-context";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { AppointmentForm } from "./AppointmentForm";

const FMT_TIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatTime(iso: string): string {
  try { return FMT_TIME.format(new Date(iso)); } catch { return "—"; }
}

function formatDateHeading(iso: string): string {
  try {
    const s = FMT_DATE.format(new Date(iso));
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return "—"; }
}

const KIND_LABEL: Record<string, string> = {
  PROFESSIONAL: "Profesional",
  CHAIR: "Sillón",
  ROOM: "Sala",
};

interface Props {
  appointments: AppointmentListResult;
  resources: ResourceListResult | null;
  patientId?: string;
  patient: AgendaPatientContext | null;
  canCreateAppointment: boolean;
}

export function AgendaView({ appointments, resources, patientId, patient, canCreateAppointment }: Props) {
  const { items, from } = appointments;

  const resourceMap = new Map(
    (resources?.items ?? []).map((r) => [r.id, r]),
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center size-10 shrink-0 rounded-full bg-primary/10 text-primary ring-2 ring-background">
          <CalendarDays className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDateHeading(from)}
          </p>
        </div>
      </div>

      {canCreateAppointment && (
        <AppointmentForm
          resources={resources}
          patientId={patientId}
          patient={patient}
          defaultDate={from.slice(0, 10)}
        />
      )}

      <SectionCard
        title="Citas del día"
        badge={`${items.length} ${items.length === 1 ? "cita" : "citas"}`}
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 className="size-5" />}
            title="Sin citas para este día"
            description="No hay citas agendadas en el rango seleccionado."
          />
        ) : (
          <div className="space-y-2">
            {/* Encabezado de columnas — solo en pantallas grandes; las filas son tarjetas, no celdas de tabla */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div className="sm:col-span-2">Hora</div>
              <div className="sm:col-span-3">Paciente / Contacto</div>
              <div className="sm:col-span-2">Estado</div>
              <div className="sm:col-span-2">Doctor / Recurso</div>
              <div className="sm:col-span-3">Motivo</div>
            </div>

            {items.map((appt) => {
              const profResource = appt.professionalResourceId
                ? resourceMap.get(appt.professionalResourceId)
                : null;
              const resourceLabel =
                appt.professionalName ??
                profResource?.name ??
                (appt.chairResourceId ? resourceMap.get(appt.chairResourceId)?.name : null) ??
                "—";
              const kindLabel = profResource
                ? KIND_LABEL[profResource.kind] ?? profResource.kind
                : "";

              return (
                <div
                  key={appt.id}
                  className="rounded-lg border bg-surface-elevated shadow-soft ring-1 ring-foreground/5 px-4 py-3 grid grid-cols-2 sm:grid-cols-12 gap-2 sm:items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="sm:col-span-2 tabular-nums text-sm font-medium text-foreground whitespace-nowrap">
                    {formatTime(appt.startAt)}
                    <span className="mx-1 text-muted-foreground">–</span>
                    {formatTime(appt.endAt)}
                  </div>
                  <div className="sm:col-span-3 font-medium truncate">
                    {appt.displayName ?? (
                      <span className="text-muted-foreground italic">Sin nombre</span>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                  <div className="sm:col-span-2 text-sm text-muted-foreground truncate">
                    {resourceLabel}
                    {kindLabel && (
                      <span className="ml-1 text-xs text-muted-foreground/60">
                        ({kindLabel})
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-3 text-sm text-muted-foreground truncate">
                    {appt.reason ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
