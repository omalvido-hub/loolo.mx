// Visualización de la cadena de atención Nelzzon: los 6 módulos conectados y su estado actual.
// Puramente presentacional — sin queries, sin side effects, solo datos ya disponibles.

import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";

type StageStatus = "done" | "warn" | "empty";

interface Stage {
  key: string;
  label: string;
  sublabel: string | null;
  status: StageStatus;
}

const FMT_CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fCents(cents: number): string {
  return FMT_CURRENCY.format(cents / 100);
}

function buildStages(record: PatientLiveRecord, documentsCount?: number): Stage[] {
  const { clinical, odontogramSummary, treatment, financial } = record;

  const activeFindings = odontogramSummary?.findingsByStatus["ACTIVE"] ?? 0;

  return [
    {
      key: "consulta",
      label: "Consultas",
      sublabel:
        clinical && clinical.encountersCount > 0
          ? `${clinical.encountersCount} registrada${clinical.encountersCount !== 1 ? "s" : ""}`
          : null,
      status: clinical && clinical.encountersCount > 0 ? "done" : "empty",
    },
    {
      key: "odontograma",
      label: "Odontograma",
      sublabel:
        odontogramSummary && odontogramSummary.totalFindings > 0
          ? `${odontogramSummary.totalFindings} hallazgo${odontogramSummary.totalFindings !== 1 ? "s" : ""}`
          : null,
      status:
        odontogramSummary && odontogramSummary.totalFindings > 0
          ? activeFindings > 0
            ? "warn"
            : "done"
          : "empty",
    },
    {
      key: "plan",
      label: "Plan",
      sublabel: treatment?.activePlanId
        ? (treatment.itemsByStatus["PROPOSED"] ?? 0) > 0
          ? `${treatment.itemsByStatus["PROPOSED"]} propuesto${(treatment.itemsByStatus["PROPOSED"] ?? 0) !== 1 ? "s" : ""}`
          : "Plan activo"
        : treatment && treatment.plansCount > 0
          ? `${treatment.plansCount} plan${treatment.plansCount !== 1 ? "es" : ""}`
          : null,
      status: treatment?.activePlanId
        ? (treatment.itemsByStatus["PROPOSED"] ?? 0) > 0
          ? "warn"
          : "done"
        : "empty",
    },
    {
      key: "presupuesto",
      label: "Presupuesto",
      sublabel:
        financial && financial.quotesCount > 0
          ? fCents(
              financial.totalAcceptedCents > 0
                ? financial.totalAcceptedCents
                : financial.totalProposedCents,
            )
          : null,
      status:
        financial && financial.quotesCount > 0
          ? (financial.quotesByStatus["DRAFT"] ?? 0) > 0
            ? "warn"
            : "done"
          : "empty",
    },
    {
      key: "cobro",
      label: "Cobros",
      sublabel:
        financial && financial.balanceCents > 0
          ? `${fCents(financial.balanceCents)} pendiente`
          : financial && financial.paidCents > 0
            ? `${fCents(financial.paidCents)} pagado`
            : null,
      status:
        financial
          ? financial.balanceCents > 0
            ? "warn"
            : financial.paidCents > 0
              ? "done"
              : "empty"
          : "empty",
    },
    {
      key: "documentos",
      label: "Documentos",
      sublabel:
        documentsCount != null && documentsCount > 0
          ? `${documentsCount} archivo${documentsCount !== 1 ? "s" : ""}`
          : null,
      status: documentsCount != null && documentsCount > 0 ? "done" : "empty",
    },
  ];
}

function StageDot({ status }: { status: StageStatus }) {
  const cls =
    status === "done"
      ? "bg-green-500"
      : status === "warn"
        ? "bg-amber-400"
        : "bg-foreground/10";
  return <span className={`size-2 rounded-full shrink-0 ${cls}`} />;
}

interface Props {
  record: PatientLiveRecord;
  documentsCount?: number;
}

export function PatientCareChain({ record, documentsCount }: Props) {
  const stages = buildStages(record, documentsCount);

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        Cadena de atención
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-3 gap-x-1">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex flex-col items-center gap-1 min-w-0 relative">
            {/* Conector horizontal (desktop only, not on last) */}
            {i < stages.length - 1 && (
              <span
                className="hidden sm:block absolute top-[7px] left-[calc(50%+8px)] right-[-4px] h-px bg-border"
                aria-hidden
              />
            )}
            <div className="flex items-center gap-1 z-10">
              <StageDot status={stage.status} />
              <span
                className={`text-[11px] font-medium leading-none ${
                  stage.status === "empty"
                    ? "text-muted-foreground/50"
                    : "text-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
            <span
              className={`text-[10px] text-center leading-tight px-1 ${
                stage.status === "warn"
                  ? "text-amber-600 dark:text-amber-400"
                  : stage.status === "done"
                    ? "text-muted-foreground"
                    : "text-muted-foreground/35"
              }`}
            >
              {stage.sublabel ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
