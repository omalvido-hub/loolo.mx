// Presentacional puro. Lista de hallazgos del odontograma. No muestra note ni recordedByUserId.

import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { FindingRow } from "./FindingRow";
import { OdontogramEmpty } from "./OdontogramEmpty";

interface Props {
  findings: FindingPanelItem[];
  patientId?: string;
  title?: string;
}

export function FindingsPanel({ findings, patientId, title = "Hallazgos" }: Props) {
  return (
    <div>
      {title && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {title}
        </p>
      )}
      {findings.length === 0 ? (
        <OdontogramEmpty />
      ) : (
        <div>
          {findings.map((f, i) => (
            <FindingRow key={i} finding={f} patientId={patientId} />
          ))}
        </div>
      )}
    </div>
  );
}
