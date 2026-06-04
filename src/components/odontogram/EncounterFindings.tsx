// Presentacional puro. Sección de hallazgos de una consulta específica.
// Muestra SOLO lo registrado en esa consulta — no mezcla con el estado vigente global.
// Solo renderiza los campos del DTO público (OdontogramEncounterView). Sin datos internos.

import type { OdontogramEncounterView } from "@/server/domain/clinical/odontogram-views";
import { FindingsPanel } from "./FindingsPanel";
import { OdontogramEmpty } from "./OdontogramEmpty";

interface Props {
  view: OdontogramEncounterView;
  patientId: string;
}

export function EncounterFindings({ view, patientId }: Props) {
  const { findingsPanel, summary } = view;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">Hallazgos de esta consulta</h3>
        {summary.findingsCount > 0 && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            {summary.findingsCount} hallazgo{summary.findingsCount !== 1 ? "s" : ""}
            {summary.affectedTeethCount > 0 && (
              <> · {summary.affectedTeethCount} pieza{summary.affectedTeethCount !== 1 ? "s" : ""}</>
            )}
          </span>
        )}
      </div>

      {findingsPanel.length === 0 ? (
        <OdontogramEmpty />
      ) : (
        <FindingsPanel findings={findingsPanel} patientId={patientId} />
      )}
    </div>
  );
}
