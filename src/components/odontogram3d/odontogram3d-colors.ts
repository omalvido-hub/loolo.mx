// Paleta hex para el render 3D (three.js necesita valores de color, no clases Tailwind).
// Refleja visualmente los mismos estados/hallazgos que ToothDetailPanel en el odontograma 2D.

import { GLOBAL_FINDING_PRIORITY } from "@/components/odontogram/tooth-utils";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";

export const FINDING_TYPE_COLOR_HEX: Record<string, string> = {
  CARIES: "#dc2626",
  RESTORATION: "#2563eb",
  CROWN: "#7c3aed",
  ENDODONTICS: "#ea580c",
  IMPLANT: "#6b7280",
  FRACTURE: "#f59e0b",
  MOBILITY: "#ca8a04",
  MISSING: "#374151",
  SEALANT: "#0891b2",
  OTHER: "#9ca3af",
};

export const TOOTH_STATUS_COLOR_HEX: Record<string, string> = {
  PRESENT: "#f5f2ea",
  ABSENT: "#4b5563",
  EXTRACTED: "#4b5563",
  IMPACTED: "#ca8a04",
  UNERUPTED: "#059669",
  ROOT_ONLY: "#dc2626",
  MISSING: "#4b5563",
};

export const SELECTED_OUTLINE_COLOR_HEX = "#60a5fa";
export const HOVER_TINT_COLOR_HEX = "#93c5fd";
export const SURFACE_DOT_COLOR_HEX = "#94a3b8";

/** Color dominante de una pieza: hallazgo activo de mayor prioridad, o el estado base de la pieza. */
export function pickToothColorHex(status: string, findings: FindingPanelItem[]): string {
  let best: string | null = null;
  let bestRank = Infinity;
  for (const f of findings) {
    if (f.lifecycleStatus === "VOIDED") continue;
    const idx = GLOBAL_FINDING_PRIORITY.indexOf(f.findingType);
    const rank = idx === -1 ? GLOBAL_FINDING_PRIORITY.length : idx;
    if (rank < bestRank) { bestRank = rank; best = f.findingType; }
  }
  if (best) return FINDING_TYPE_COLOR_HEX[best] ?? FINDING_TYPE_COLOR_HEX.OTHER;
  return TOOTH_STATUS_COLOR_HEX[status] ?? TOOTH_STATUS_COLOR_HEX.PRESENT;
}
