// Presentacional puro. Lista de consultas del historial clínico.

import { EncounterRow } from "./EncounterRow";
import { EncountersEmpty } from "./EncountersEmpty";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

interface Props {
  items: EncounterListItem[];
  patientId: string;
}

export function EncounterList({ items, patientId }: Props) {
  if (items.length === 0) return <EncountersEmpty />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <EncounterRow key={item.encounterId} item={item} patientId={patientId} />
      ))}
    </div>
  );
}
