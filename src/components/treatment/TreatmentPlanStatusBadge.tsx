// Presentacional puro. Sin consultas, sin permisos, sin mutaciones.

const PLAN_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
};

const PLAN_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PROPOSED: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-600",
  CANCELED: "bg-gray-100 text-gray-500",
};

const ITEM_LABELS: Record<string, string> = {
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
};

const ITEM_COLORS: Record<string, string> = {
  PROPOSED: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-600",
  CANCELED: "bg-gray-100 text-gray-500",
};

interface Props {
  status: string;
  variant?: "plan" | "item";
}

export function TreatmentPlanStatusBadge({ status, variant = "plan" }: Props) {
  const labels = variant === "item" ? ITEM_LABELS : PLAN_LABELS;
  const colors = variant === "item" ? ITEM_COLORS : PLAN_COLORS;
  const label = labels[status] ?? status;
  const color = colors[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
