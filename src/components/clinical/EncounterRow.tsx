// Presentacional puro. Fila de consulta en el historial.

import Link from "next/link";
import { EncounterStatusBadge } from "./EncounterStatusBadge";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

const FMT = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT.format(new Date(iso)); } catch { return "—"; }
}

interface Props {
  item: EncounterListItem;
  patientId: string;
}

export function EncounterRow({ item, patientId }: Props) {
  return (
    <Link
      href={`/pacientes/${patientId}/consultas/${item.encounterId}`}
      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium truncate">{item.chiefComplaint}</span>
        <span className="text-muted-foreground text-xs">{fDate(item.createdAt)}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {item.notesCount > 0 && (
          <span className="text-xs text-muted-foreground">{item.notesCount} nota{item.notesCount !== 1 ? "s" : ""}</span>
        )}
        <EncounterStatusBadge status={item.status} />
      </div>
    </Link>
  );
}
