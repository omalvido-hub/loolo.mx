// Presentacional puro. Fila de un ítem del plan de tratamiento.

import { TreatmentPlanStatusBadge } from "./TreatmentPlanStatusBadge";
import type { TreatmentItemView } from "@/server/domain/clinical/treatment-views";

const PROCEDURE_LABELS: Record<string, string> = {
  EXAM: "Exploración",
  PROPHYLAXIS: "Profilaxis",
  RESTORATION: "Restauración",
  ENDODONTICS: "Endodoncia",
  EXTRACTION: "Extracción",
  CROWN: "Corona",
  BRIDGE: "Puente",
  IMPLANT: "Implante",
  PERIODONTAL: "Periodontal",
  ORTHODONTICS: "Ortodoncia",
  SURGERY: "Cirugía",
  OTHER: "Otro",
};

const SURFACE_LABELS: Record<string, string> = {
  MESIAL: "M",
  DISTAL: "D",
  OCCLUSAL: "O",
  BUCCAL: "V",
  LINGUAL: "L",
  INCISAL: "I",
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baja",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-600 font-semibold",
  HIGH: "text-orange-600",
  NORMAL: "text-muted-foreground",
  LOW: "text-muted-foreground",
};

interface Props {
  item: TreatmentItemView;
}

export function TreatmentItemRow({ item }: Props) {
  const procedureLabel = PROCEDURE_LABELS[item.procedureType] ?? item.procedureType;
  const surfaceLabel = item.surface ? SURFACE_LABELS[item.surface] ?? item.surface : null;
  const priorityLabel = PRIORITY_LABELS[item.priority] ?? item.priority;
  const priorityColor = PRIORITY_COLORS[item.priority] ?? "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors text-sm">
      {/* Pieza + superficie */}
      <div className="w-14 shrink-0 text-center">
        {item.toothFdi ? (
          <span className="font-mono font-medium text-foreground">
            {item.toothFdi}
            {surfaceLabel && (
              <span className="text-xs text-muted-foreground ml-0.5">{surfaceLabel}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Procedimiento */}
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate">{procedureLabel}</span>
      </div>

      {/* Prioridad */}
      <div className="w-20 shrink-0 text-right">
        <span className={`text-xs ${priorityColor}`}>{priorityLabel}</span>
      </div>

      {/* Estado */}
      <div className="shrink-0">
        <TreatmentPlanStatusBadge status={item.status} variant="item" />
      </div>
    </div>
  );
}
