// Presentacional puro. Sin consultas, sin permisos, sin mutaciones.

const LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  FINALIZED: "Finalizada",
  CANCELED: "Cancelada",
};

const COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  FINALIZED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-600",
};

interface Props {
  status: string;
}

export function EncounterStatusBadge({ status }: Props) {
  const label = LABELS[status] ?? status;
  const color = COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
