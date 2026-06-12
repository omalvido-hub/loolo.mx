// NELZZON — Historial clínico del paciente (1H-C). Línea de tiempo read-only
// que combina proyecciones YA seguras que la ficha del paciente ya carga:
// consultas, hallazgos de odontograma, ítems de plan de tratamiento (con su
// origen en el odontograma, 1G-B) y documentos clínicos.
// 100% lectura: no hace consultas nuevas, no escribe auditoría, no expone
// datos sensibles. NUNCA muestra .body de notas clínicas, ni storageKey,
// checksum, voidReason o IDs internos de actores. Presupuestos, pagos y
// cobros NO forman parte de este historial clínico — viven en sus propias
// secciones (Presupuestos / Cobros).

import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import type { TreatmentPlanView } from "@/server/domain/clinical/treatment-views";
import type { PatientDocumentSafeItem } from "@/server/domain/clinical/patient-documents-views";
import { KIND_LABEL } from "./patient-document-labels";

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDateTime(iso: string | null): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  FINALIZED: "Finalizada",
  CANCELED: "Cancelada",
};

const FINDING_TYPE_LABEL: Record<string, string> = {
  CARIES: "Caries",
  RESTORATION: "Restauración",
  CROWN: "Corona",
  ENDODONTICS: "Endodoncia",
  IMPLANT: "Implante",
  FRACTURE: "Fractura",
  MOBILITY: "Movilidad",
  MISSING: "Ausente",
  SEALANT: "Sellante",
  OTHER: "Otro",
};

const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  OBSERVATION: "Observación",
  TREATED: "Tratado",
  RESOLVED: "Resuelto",
  CONTROLLED: "Controlado",
  VOIDED: "Anulado",
};

const SURFACE_LABEL: Record<string, string> = {
  MESIAL: "Mesial",
  DISTAL: "Distal",
  OCCLUSAL: "Oclusal",
  VESTIBULAR: "Vestibular",
  LINGUAL: "Lingual",
  INCISAL: "Incisal",
};

const PROCEDURE_LABEL: Record<string, string> = {
  EXAM: "Exploración",
  PROPHYLAXIS: "Profilaxis",
  RESTORATION: "Restauración",
  ENDODONTICS: "Endodoncia",
  EXTRACTION: "Extracción",
  CROWN: "Corona",
  BRIDGE: "Puente",
  IMPLANT: "Implante",
  PERIODONTAL: "Periodontal",
  ORTHODONTICS: "Ortodoncia",
  SURGERY: "Cirugía",
  OTHER: "Otro",
};

const ITEM_STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
};

const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  QUARANTINED: "En revisión",
  ACTIVE: "Activo",
  SUPERSEDED: "Reemplazado",
  VOIDED: "Anulado",
};

type TimelineCategory = "encounter" | "finding" | "treatment_item" | "document";

interface TimelineEntry {
  id: string;
  date: string;
  category: TimelineCategory;
  title: string;
  lines: string[];
  statusLabel: string | null;
}

const CATEGORY_DOT: Record<TimelineCategory, string> = {
  encounter: "bg-blue-500",
  finding: "bg-amber-500",
  treatment_item: "bg-purple-500",
  document: "bg-slate-500",
};

const CATEGORY_LABEL: Record<TimelineCategory, string> = {
  encounter: "Consulta",
  finding: "Hallazgo",
  treatment_item: "Tratamiento",
  document: "Documento",
};

// Etiqueta "Pieza X · Superficie — Tipo" usada tanto para hallazgos como para
// el origen de un ítem de tratamiento vinculado (1G-B, formato consistente
// con TreatmentPlansSectionClient.findingOptionLabel).
function findingLabel(f: FindingPanelItem): string {
  const typeLabel = FINDING_TYPE_LABEL[f.findingType] ?? f.findingType;
  const surfaceLabel = f.surface ? ` · ${SURFACE_LABEL[f.surface] ?? f.surface}` : "";
  return `Pieza ${f.toothFdi}${surfaceLabel} — ${typeLabel}`;
}

function buildTimeline(
  encounters: EncounterListItem[],
  findings: FindingPanelItem[],
  treatmentPlans: TreatmentPlanView[],
  documents: PatientDocumentSafeItem[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const findingsById = new Map(findings.map((f) => [f.findingId, f]));

  for (const e of encounters) {
    const lines: string[] = [];
    if (e.chiefComplaint) lines.push(e.chiefComplaint);
    if (e.notesCount > 0) {
      lines.push(`${e.notesCount} nota${e.notesCount !== 1 ? "s" : ""} registrada${e.notesCount !== 1 ? "s" : ""}`);
    }
    entries.push({
      id: `encounter-${e.encounterId}`,
      date: e.createdAt,
      category: "encounter",
      title: "Consulta clínica",
      lines,
      statusLabel: ENCOUNTER_STATUS_LABEL[e.status] ?? e.status,
    });
  }

  for (const f of findings) {
    entries.push({
      id: `finding-${f.findingId}`,
      date: f.createdAt,
      category: "finding",
      title: findingLabel(f),
      lines: [],
      statusLabel: LIFECYCLE_LABEL[f.lifecycleStatus] ?? f.lifecycleStatus,
    });
  }

  for (const p of treatmentPlans) {
    for (const it of p.items) {
      const procedureLabel = PROCEDURE_LABEL[it.procedureType] ?? it.procedureType;
      const pieceLabel = it.toothFdi
        ? ` — Pieza ${it.toothFdi}${it.surface ? ` · ${SURFACE_LABEL[it.surface] ?? it.surface}` : ""}`
        : "";

      const lines: string[] = [];
      if (it.linkedFindingId) {
        const f = findingsById.get(it.linkedFindingId);
        lines.push(f ? `Origen: Odontograma · ${findingLabel(f)}` : "Origen: Odontograma");
      }

      entries.push({
        id: `treatment-item-${it.id}`,
        date: it.completedAt ?? it.canceledAt ?? it.createdAt,
        category: "treatment_item",
        title: `${procedureLabel}${pieceLabel}`,
        lines,
        statusLabel: ITEM_STATUS_LABEL[it.status] ?? it.status,
      });
    }
  }

  for (const d of documents) {
    entries.push({
      id: `document-${d.documentId}`,
      date: d.createdAt,
      category: "document",
      title: d.fileName,
      lines: [KIND_LABEL[d.kind] ?? d.kind],
      statusLabel: DOCUMENT_STATUS_LABEL[d.status] ?? d.status,
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

interface Props {
  encounters: EncounterListItem[];
  findings: FindingPanelItem[];
  treatmentPlans: TreatmentPlanView[];
  documents: PatientDocumentSafeItem[];
}

function TimelineEntryItem({ entry }: { entry: TimelineEntry }) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_DOT[entry.category]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{entry.title}</span>
          {entry.statusLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
              {entry.statusLabel}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            {CATEGORY_LABEL[entry.category]}
          </span>
        </div>
        {entry.lines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground mt-0.5 truncate">{line}</p>
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
        {fDateTime(entry.date)}
      </span>
    </li>
  );
}

const VISIBLE_ENTRIES = 5;

export function PatientTimeline({ encounters, findings, treatmentPlans, documents }: Props) {
  const entries = buildTimeline(encounters, findings, treatmentPlans, documents);
  const visible = entries.slice(0, VISIBLE_ENTRIES);
  const rest = entries.slice(VISIBLE_ENTRIES);

  return (
    <section className="rounded-xl border bg-card">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-foreground">Historial clínico</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Consultas, hallazgos, tratamientos y documentos clínicos en orden cronológico — solo lectura.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground px-4 py-6 text-center">
          Sin historial clínico registrado.
        </p>
      ) : (
        <>
          <ol className="divide-y">
            {visible.map((entry) => (
              <TimelineEntryItem key={entry.id} entry={entry} />
            ))}
          </ol>
          {rest.length > 0 && (
            <details className="border-t">
              <summary className="cursor-pointer text-xs text-muted-foreground px-4 py-2.5">
                Ver historial completo ({rest.length} más)
              </summary>
              <ol className="divide-y border-t">
                {rest.map((entry) => (
                  <TimelineEntryItem key={entry.id} entry={entry} />
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}
