// Presentacional puro. Fila de un hallazgo en el panel de hallazgos.
// Solo renderiza los campos del DTO público (FindingPanelItem). Sin datos internos.

import Link from "next/link";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";

const FINDING_TYPE_LABEL: Record<string, string> = {
  CARIES:      "Caries",
  RESTORATION: "Restauración",
  CROWN:       "Corona",
  ENDODONTICS: "Endodoncia",
  IMPLANT:     "Implante",
  FRACTURE:    "Fractura",
  MOBILITY:    "Movilidad",
  MISSING:     "Ausente",
  SEALANT:     "Sellante",
  OTHER:       "Otro",
};

const TOOTH_STATUS_LABEL: Record<string, string> = {
  PRESENT:   "Presente",
  ABSENT:    "Ausente",
  EXTRACTED: "Extraído",
  IMPACTED:  "Impactado",
  UNERUPTED: "Sin erupcionar",
  ROOT_ONLY: "Solo raíz",
};

const SURFACE_LABEL: Record<string, string> = {
  MESIAL:     "Mesial",
  DISTAL:     "Distal",
  OCCLUSAL:   "Oclusal",
  VESTIBULAR: "Vestibular",
  LINGUAL:    "Lingual",
  INCISAL:    "Incisal",
};

const FINDING_TYPE_COLOR: Record<string, string> = {
  CARIES:      "#dc2626",
  RESTORATION: "#2563eb",
  CROWN:       "#7c3aed",
  ENDODONTICS: "#ea580c",
  IMPLANT:     "#6b7280",
  FRACTURE:    "#f59e0b",
  MOBILITY:    "#ca8a04",
  MISSING:     "#374151",
  SEALANT:     "#0891b2",
  OTHER:       "#9ca3af",
};

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "short",
});

function fDate(iso: string): string {
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

interface Props {
  finding: FindingPanelItem;
  patientId?: string;
}

export function FindingRow({ finding, patientId }: Props) {
  const color = FINDING_TYPE_COLOR[finding.findingType] ?? "#9ca3af";

  return (
    <div className="flex items-start gap-3 py-2 text-sm border-b last:border-0">
      {/* Indicador de color */}
      <div
        className="mt-0.5 w-2.5 h-2.5 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded text-muted-foreground">
            {finding.toothFdi}
          </span>
          <span className="font-medium">
            {FINDING_TYPE_LABEL[finding.findingType] ?? finding.findingType}
          </span>
          {finding.surface && (
            <span className="text-xs text-muted-foreground">
              · {SURFACE_LABEL[finding.surface] ?? finding.surface}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{TOOTH_STATUS_LABEL[finding.toothStatus] ?? finding.toothStatus}</span>
          <span>·</span>
          <span>{fDate(finding.createdAt)}</span>
          {finding.encounterId && patientId && (
            <>
              <span>·</span>
              <Link
                href={`/pacientes/${patientId}/consultas/${finding.encounterId}`}
                className="underline hover:text-foreground transition-colors"
              >
                Ver consulta
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
