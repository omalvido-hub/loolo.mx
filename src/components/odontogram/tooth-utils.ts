// Utilidades puras para el renderer del odontograma. Sin JSX — testeable con vitest.

import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";

// Prioridad de hallazgos globales de pieza (sin superficie) para el borde visual.
export const GLOBAL_FINDING_PRIORITY = [
  "CROWN", "ENDODONTICS", "IMPLANT", "MOBILITY", "FRACTURE", "OTHER",
];

/**
 * Devuelve el hallazgo global de pieza (surface=null) de mayor prioridad, o null.
 * Se usa para pintar el borde coloreado del diente cuando el centro ya está ocupado
 * por un hallazgo de superficie (OCCLUSAL/INCISAL).
 */
export function pickGlobalBorderFinding(findings: FindingPanelItem[]): string | null {
  let best: string | null = null;
  let bestIdx = Infinity;
  for (const f of findings) {
    if (f.surface) continue;
    const idx = GLOBAL_FINDING_PRIORITY.indexOf(f.findingType);
    const rank = idx === -1 ? GLOBAL_FINDING_PRIORITY.length : idx;
    if (rank < bestIdx) { bestIdx = rank; best = f.findingType; }
  }
  return best;
}
