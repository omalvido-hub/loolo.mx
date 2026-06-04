// Presentacional puro. Vista de detalle de consulta clínica. Solo metadatos de notas.

import Link from "next/link";
import { EncounterStatusBadge } from "./EncounterStatusBadge";
import { ClinicalNotesSummary } from "./ClinicalNotesSummary";
import type { EncounterSafeView } from "@/server/domain/clinical/encounter-views";

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  );
}

interface RowProps { label: string; value: React.ReactNode }
function Row({ label, value }: RowProps) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

interface Props {
  view: EncounterSafeView;
  patientId: string;
}

export function EncounterDetailView({ view, patientId }: Props) {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Navegación */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/pacientes" className="hover:text-foreground transition-colors">Pacientes</Link>
        <span>/</span>
        <Link href={`/pacientes/${patientId}`} className="hover:text-foreground transition-colors">Ficha</Link>
        <span>/</span>
        <span className="text-foreground">Consulta</span>
      </div>

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{view.chiefComplaint}</h1>
          <p className="text-sm text-muted-foreground mt-1">Creada el {fDate(view.createdAt)}</p>
        </div>
        <EncounterStatusBadge status={view.status} />
      </div>

      {/* Datos generales */}
      <SectionCard title="Información de la consulta">
        <Row label="Estado" value={<EncounterStatusBadge status={view.status} />} />
        <Row label="Profesional" value={view.professionalName} />
        <Row label="Motivo de consulta" value={view.chiefComplaint} />
        <Row label="Inicio" value={fDatetime(view.startedAt)} />
        <Row label="Finalización" value={fDatetime(view.finalizedAt)} />
        {view.canceledAt && <Row label="Cancelación" value={fDatetime(view.canceledAt)} />}
        <Row label="Creada" value={fDatetime(view.createdAt)} />
      </SectionCard>

      {/* Contenido clínico */}
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

      {/* Notas clínicas — solo metadatos */}
      <SectionCard title="Notas clínicas">
        <ClinicalNotesSummary summary={view.notesSummary} />
      </SectionCard>
    </div>
  );
}
