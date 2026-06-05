// Presentacional puro. Header de consulta con acento de color por estado y breadcrumb.

import Link from "next/link";
import { EncounterStatusBadge } from "./EncounterStatusBadge";
import type { EncounterSafeView } from "@/server/domain/clinical/encounter-views";

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return ""; }
}

const STATUS_BG: Record<string, string> = {
  DRAFT:       "bg-card border-border",
  IN_PROGRESS: "bg-blue-50/50 border-blue-200",
  FINALIZED:   "bg-green-50/50 border-green-200",
  CANCELED:    "bg-red-50/30 border-red-200",
};

const STATUS_ACCENT: Record<string, string> = {
  DRAFT:       "bg-muted-foreground/30",
  IN_PROGRESS: "bg-blue-500",
  FINALIZED:   "bg-green-500",
  CANCELED:    "bg-red-400",
};

interface Props {
  view: EncounterSafeView;
  patientId: string;
}

export function EncounterHeader({ view, patientId }: Props) {
  const bg = STATUS_BG[view.status] ?? STATUS_BG.DRAFT;
  const accent = STATUS_ACCENT[view.status] ?? STATUS_ACCENT.DRAFT;

  return (
    <div className="px-8 pt-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/pacientes" className="hover:text-foreground transition-colors">
          Pacientes
        </Link>
        <span>/</span>
        <Link href={`/pacientes/${patientId}`} className="hover:text-foreground transition-colors">
          Ficha
        </Link>
        <span>/</span>
        <span className="text-foreground">Consulta</span>
      </div>

      <div className={`rounded-xl border overflow-hidden ring-1 ring-foreground/8 ${bg}`}>
        <div className={`h-1 ${accent}`} />
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold leading-tight">{view.chiefComplaint}</h1>
            <div className="shrink-0 pt-0.5">
              <EncounterStatusBadge status={view.status} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
            {view.professionalName && <span>{view.professionalName}</span>}
            {view.startedAt && <span>Inicio: {fDatetime(view.startedAt)}</span>}
            {view.finalizedAt && <span>Finalizada: {fDatetime(view.finalizedAt)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
