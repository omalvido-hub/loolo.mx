import type { AppointmentListResult, ResourceListResult } from "@/server/domain/agenda/queries";
import type { AgendaPatientContext } from "@/server/domain/agenda/patient-context";
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDateHeading(from)} · {items.length}{" "}
          {items.length === 1 ? "cita" : "citas"}
        </p>
      </div>

      {canCreateAppointment && (
        <AppointmentForm
          resources={resources}
          patientId={patientId}
          patient={patient}
          defaultDate={from.slice(0, 10)}
        />
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin citas para este día</p>
          <p className="text-sm mt-2">No hay citas agendadas en el rango seleccionado.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Paciente / Contacto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor / Recurso</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
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
                  <tr key={appt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {formatTime(appt.startAt)}
                      <span className="mx-1">–</span>
                      {formatTime(appt.endAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {appt.displayName ?? (
                        <span className="text-muted-foreground italic">Sin nombre</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {resourceLabel}
                      {kindLabel && (
                        <span className="ml-1 text-xs text-muted-foreground/60">
                          ({kindLabel})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {appt.reason ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
