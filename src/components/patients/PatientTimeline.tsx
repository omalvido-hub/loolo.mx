// NELZZON — Línea de tiempo general del paciente (TOOTH-HISTORY sigue siendo la fuente
// para el detalle por pieza; esta sección combina varias proyecciones YA seguras
// que la página de ficha del paciente ya carga, en un solo orden cronológico.
// 100% lectura: no hace consultas nuevas, no escribe auditoría, no expone datos
// sensibles (sin note, sin lifecycleReason, sin PAN/CLABE — solo lo que ya se
// muestra en sus propias secciones).

import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import type { TreatmentPlanView } from "@/server/domain/clinical/treatment-views";
import type { QuoteView } from "@/server/domain/billing/billing-views";
import { getToothName } from "@/components/odontogram/tooth-names";

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDateTime(iso: string | null): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const FMT_NUM2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fCents(c: number): string {
  return "$" + (c % 100 !== 0 ? FMT_NUM2 : FMT_NUM).format(c / 100);
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

const PLAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
};

const QUOTE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Propuesto",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

type TimelineCategory = "encounter" | "finding" | "treatment_plan" | "quote" | "payment";

interface TimelineEntry {
  id: string;
  date: string;
  category: TimelineCategory;
  title: string;
  detail: string | null;
  statusLabel: string | null;
}

const CATEGORY_DOT: Record<TimelineCategory, string> = {
  encounter: "bg-blue-500",
  finding: "bg-amber-500",
  treatment_plan: "bg-purple-500",
  quote: "bg-emerald-500",
  payment: "bg-teal-500",
};

const CATEGORY_LABEL: Record<TimelineCategory, string> = {
  encounter: "Consulta",
  finding: "Hallazgo",
  treatment_plan: "Plan de tratamiento",
  quote: "Presupuesto",
  payment: "Cobro",
};

function buildTimeline(
  encounters: EncounterListItem[],
  findings: FindingPanelItem[],
  treatmentPlans: TreatmentPlanView[],
  quotes: QuoteView[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const e of encounters) {
    entries.push({
      id: `encounter-${e.encounterId}`,
      date: e.createdAt,
      category: "encounter",
      title: "Consulta clínica",
      detail: e.chiefComplaint || null,
      statusLabel: ENCOUNTER_STATUS_LABEL[e.status] ?? e.status,
    });
  }

  for (const f of findings) {
    const name = getToothName(f.toothFdi);
    entries.push({
      id: `finding-${f.findingId}`,
      date: f.createdAt,
      category: "finding",
      title: `Hallazgo: ${FINDING_TYPE_LABEL[f.findingType] ?? f.findingType}`,
      detail: `Pieza ${f.toothFdi} · ${name.full}`,
      statusLabel: LIFECYCLE_LABEL[f.lifecycleStatus] ?? f.lifecycleStatus,
    });
  }

  for (const p of treatmentPlans) {
    entries.push({
      id: `plan-${p.id}`,
      date: p.createdAt,
      category: "treatment_plan",
      title: "Plan de tratamiento",
      detail: p.title || `${p.itemsCount} ${p.itemsCount === 1 ? "ítem" : "ítems"}`,
      statusLabel: PLAN_STATUS_LABEL[p.status] ?? p.status,
    });
  }

  for (const q of quotes) {
    entries.push({
      id: `quote-${q.id}`,
      date: q.createdAt,
      category: "quote",
      title: "Presupuesto",
      detail: `${q.quoteNumber ?? "Sin folio"} · ${fCents(q.totalCents)} ${q.currency}`,
      statusLabel: QUOTE_STATUS_LABEL[q.status] ?? q.status,
    });

    for (const pay of q.payments) {
      if (!pay.paidAt) continue;
      entries.push({
        id: `payment-${pay.id}`,
        date: pay.paidAt,
        category: "payment",
        title: pay.entryKind === "REVERSAL" ? "Reverso de pago" : "Pago registrado",
        detail: `${fCents(pay.amountCents)} ${q.currency} · ${q.quoteNumber ?? "Sin folio"}`,
        statusLabel: null,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

interface Props {
  encounters: EncounterListItem[];
  findings: FindingPanelItem[];
  treatmentPlans: TreatmentPlanView[];
  quotes: QuoteView[];
}

export function PatientTimeline({ encounters, findings, treatmentPlans, quotes }: Props) {
  const entries = buildTimeline(encounters, findings, treatmentPlans, quotes);

  return (
    <section className="rounded-xl border bg-card">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-foreground">Historial del paciente</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Actividad clínica y administrativa en orden cronológico — solo lectura.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground px-4 py-6 text-center">
          Aún no hay actividad registrada para este paciente.
        </p>
      ) : (
        <ol className="divide-y">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
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
                {entry.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                {fDateTime(entry.date)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
