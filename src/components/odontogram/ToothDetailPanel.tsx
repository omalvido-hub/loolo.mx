"use client";

// Panel de detalle de una pieza dental seleccionada.
// Muestra FDI, nombre, estado, hallazgos y link a consulta activa si existe.
// No guarda directamente — redirige a la consulta activa para registrar hallazgos.

import Link from "next/link";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { getToothName } from "./tooth-names";
import { ToothDiagram } from "./ToothDiagram";

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
  MISSING:   "Ausente",
};

const TOOTH_STATUS_COLOR: Record<string, string> = {
  PRESENT:   "bg-green-50 text-green-700 border-green-200",
  ABSENT:    "bg-gray-100 text-gray-600 border-gray-200",
  EXTRACTED: "bg-gray-100 text-gray-600 border-gray-200",
  IMPACTED:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  UNERUPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ROOT_ONLY: "bg-red-50 text-red-700 border-red-200",
  MISSING:   "bg-gray-100 text-gray-600 border-gray-200",
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
  fdi: number;
  status: string;
  findings: FindingPanelItem[];
  patientId?: string;
  activeEncounterId?: string | null;
  onClose: () => void;
}

export function ToothDetailPanel({ fdi, status, findings, patientId, activeEncounterId, onClose }: Props) {
  const name = getToothName(fdi);
  const statusLabel = TOOTH_STATUS_LABEL[status] ?? status;
  const statusColorClass = TOOTH_STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-4 py-3 bg-blue-50/60 border-b border-blue-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex flex-col items-center shrink-0">
            <ToothDiagram fdi={fdi} status={status} findings={findings} size={64} />
            <p className="text-[8px] text-muted-foreground/50 mt-0.5 text-center leading-tight">
              Superficies
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
              Pieza seleccionada
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-foreground leading-tight">
                Pieza {fdi}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusColorClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-tight font-medium">
              {name.full}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none mt-0.5 flex-shrink-0"
          aria-label="Cerrar panel"
        >
          ×
        </button>
      </div>

      {/* Hallazgos */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Hallazgos en esta pieza
        </p>

        {findings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sin hallazgos en esta pieza
          </p>
        ) : (
          <div className="space-y-1.5">
            {findings.map((f, i) => {
              const color = FINDING_TYPE_COLOR[f.findingType] ?? "#9ca3af";
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div
                    className="mt-0.5 w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <span className="font-medium">
                      {FINDING_TYPE_LABEL[f.findingType] ?? f.findingType}
                    </span>
                    {f.surface && (
                      <span className="text-muted-foreground">
                        {" · "}{SURFACE_LABEL[f.surface] ?? f.surface}
                      </span>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {fDate(f.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acción — navegar a consulta activa con pieza preseleccionada */}
      <div className="px-3 pb-3">
        {activeEncounterId && patientId ? (
          <Link
            href={`/pacientes/${patientId}/consultas/${activeEncounterId}?toothFdi=${fdi}&openFinding=1`}
            className="flex items-center justify-center w-full text-xs py-1.5 px-3 rounded border border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
          >
            + Agregar hallazgo en consulta activa
          </Link>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 text-center py-1.5">
            Para agregar hallazgos, inicia o continúa una consulta activa.
          </p>
        )}
      </div>
    </div>
  );
}
