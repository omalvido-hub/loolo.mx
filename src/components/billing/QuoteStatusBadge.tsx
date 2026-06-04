// Presentacional puro. Badge de estado de presupuesto.

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
  CANCELED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PROPOSED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  EXPIRED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  CANCELED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface Props {
  status: string;
}

export function QuoteStatusBadge({ status }: Props) {
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
