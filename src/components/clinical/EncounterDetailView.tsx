// Presentacional puro. Tarjetas de contenido clínico de una consulta.
// No incluye breadcrumb ni header de estado — eso está en EncounterHeader.

import { ClinicalNotesSummary } from "./ClinicalNotesSummary";
import type { EncounterSafeView } from "@/server/domain/clinical/encounter-views";

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

interface Props {
  view: EncounterSafeView;
}

export function EncounterDetailView({ view }: Props) {
  const hasDetails = view.professionalName || view.startedAt || view.finalizedAt || view.canceledAt;

  return (
    <div className="space-y-4">
      {hasDetails && (
        <SectionCard title="Detalles">
          {view.professionalName && <Row label="Profesional" value={view.professionalName} />}
          {view.startedAt && <Row label="Inicio" value={fDatetime(view.startedAt)} />}
          {view.finalizedAt && <Row label="Finalización" value={fDatetime(view.finalizedAt)} />}
          {view.canceledAt && <Row label="Cancelación" value={fDatetime(view.canceledAt)} />}
        </SectionCard>
      )}

      <SectionCard title="Contenido clínico">
        {view.preliminaryDiagnosis && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diagnóstico preliminar</p>
            <p className="text-sm whitespace-pre-wrap">{view.preliminaryDiagnosis}</p>
          </div>
        )}
        {view.observations && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observaciones</p>
            <p className="text-sm whitespace-pre-wrap">{view.observations}</p>
          </div>
        )}
        {view.indications && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Indicaciones</p>
            <p className="text-sm whitespace-pre-wrap">{view.indications}</p>
          </div>
        )}
        {!view.preliminaryDiagnosis && !view.observations && !view.indications && (
          <p className="text-sm text-muted-foreground">Sin contenido clínico registrado.</p>
        )}
      </SectionCard>

      <SectionCard title="Notas clínicas">
        <ClinicalNotesSummary summary={view.notesSummary} />
      </SectionCard>
    </div>
  );
}
