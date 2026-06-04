const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
  NO_SHOW: "No se presentó",
  RESCHEDULED: "Reagendada",
};

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-green-50 text-green-700",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELED: "bg-red-50 text-red-600",
  NO_SHOW: "bg-orange-50 text-orange-700",
  RESCHEDULED: "bg-yellow-50 text-yellow-700",
};

interface Props {
  status: string;
}

export function AppointmentStatusBadge({ status }: Props) {
  const label = STATUS_LABEL[status] ?? status;
  const cls = STATUS_CLASS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
