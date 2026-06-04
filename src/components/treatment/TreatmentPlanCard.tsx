// Presentacional puro. Tarjeta de un plan de tratamiento con sus ítems.

import type { TreatmentPlanView } from "@/server/domain/clinical/treatment-views";
import { TreatmentPlanStatusBadge } from "./TreatmentPlanStatusBadge";
import { TreatmentItemRow } from "./TreatmentItemRow";

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

interface Props {
  plan: TreatmentPlanView;
  highlighted?: boolean;
}

export function TreatmentPlanCard({ plan, highlighted = false }: Props) {
  const title = plan.title ?? "Plan de tratamiento";
  const dateLabel = plan.activatedAt
    ? `Activado el ${fDate(plan.activatedAt)}`
    : plan.proposedAt
    ? `Propuesto el ${fDate(plan.proposedAt)}`
    : `Creado el ${fDate(plan.createdAt)}`;

  const liveCount = plan.liveItemsCount;
  const totalCount = plan.itemsCount;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        highlighted
          ? "ring-2 ring-green-400/60 bg-card"
          : "bg-card ring-1 ring-foreground/10"
      }`}
    >
      {/* Cabecera del plan */}
      <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${highlighted ? "bg-green-50/60" : "bg-muted/30"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TreatmentPlanStatusBadge status={plan.status} variant="plan" />
            {highlighted && (
              <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                Plan activo
              </span>
            )}
          </div>
          <p className="font-medium text-sm mt-1 truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground whitespace-nowrap">
          {totalCount === 0
            ? "Sin ítems"
            : `${liveCount} vivo${liveCount !== 1 ? "s" : ""} / ${totalCount} total`}
        </div>
      </div>

      {/* Lista de ítems */}
      <div className="px-1 py-1">
        {plan.items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Sin procedimientos registrados.</p>
        ) : (
          <div>
            {/* Cabecera de columnas */}
            <div className="flex items-center gap-3 px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="w-14 shrink-0 text-center">Pieza</span>
              <span className="flex-1">Procedimiento</span>
              <span className="w-20 shrink-0 text-right">Prioridad</span>
              <span className="shrink-0">Estado</span>
            </div>
            {plan.items.map((item) => (
              <TreatmentItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Fechas relevantes al pie */}
      {(plan.completedAt || plan.rejectedAt || plan.canceledAt) && (
        <div className="px-4 py-2 border-t bg-muted/20">
          {plan.completedAt && (
            <p className="text-xs text-muted-foreground">Completado el {fDate(plan.completedAt)}</p>
          )}
          {plan.rejectedAt && (
            <p className="text-xs text-muted-foreground">Rechazado el {fDate(plan.rejectedAt)}</p>
          )}
          {plan.canceledAt && (
            <p className="text-xs text-muted-foreground">Cancelado el {fDate(plan.canceledAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}
