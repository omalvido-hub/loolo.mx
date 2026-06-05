import Link from "next/link";
import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

const FMT_CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return FMT_DATETIME.format(new Date(iso));
  } catch {
    return "—";
  }
}

function fCents(cents: number): string {
  return FMT_CURRENCY.format(cents / 100);
}

type CardVariant = "default" | "active" | "warn" | "ok";

function StatusCard({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: CardVariant;
}) {
  const borderClass =
    variant === "active"
      ? "border-blue-300 dark:border-blue-700"
      : variant === "warn"
        ? "border-amber-300 dark:border-amber-700"
        : variant === "ok"
          ? "border-green-300 dark:border-green-700"
          : "border-border";

  const bgClass =
    variant === "active"
      ? "bg-blue-50 dark:bg-blue-950/30"
      : variant === "warn"
        ? "bg-amber-50 dark:bg-amber-950/20"
        : variant === "ok"
          ? "bg-green-50 dark:bg-green-950/20"
          : "bg-muted/20";

  const dotClass =
    variant === "active"
      ? "bg-blue-400"
      : variant === "warn"
        ? "bg-amber-400"
        : variant === "ok"
          ? "bg-green-400"
          : "bg-muted-foreground/30";

  return (
    <div
      className={`rounded-xl border ${borderClass} ${bgClass} px-4 py-3.5 flex flex-col gap-1.5 min-w-0`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

interface Props {
  record: PatientLiveRecord;
  encounters?: EncounterListItem[];
  patientId: string;
}

export function PatientStatusBar({ record, encounters, patientId }: Props) {
  const { operative, treatment, financial } = record;

  // Consulta activa: la más reciente con DRAFT o IN_PROGRESS
  // encounters viene ordenado DESC por createdAt desde listEncountersSafeForPatient
  const activeEncounter =
    encounters?.find(
      (e) => e.status === "IN_PROGRESS" || e.status === "DRAFT",
    ) ?? null;

  const nextAppt = operative.nextAppointment;

  const proposedItems = treatment?.itemsByStatus["PROPOSED"] ?? 0;
  const inProgressItems = treatment?.itemsByStatus["IN_PROGRESS"] ?? 0;
  const hasPlan = !!treatment?.activePlanId;

  const balance = financial?.balanceCents ?? null;

  // Variantes de color por tarjeta
  const apptVariant: CardVariant = nextAppt ? "ok" : "default";

  const encounterVariant: CardVariant =
    activeEncounter?.status === "IN_PROGRESS" ? "active" : "default";

  const planVariant: CardVariant = proposedItems > 0 ? "warn" : hasPlan ? "ok" : "default";

  const balanceVariant: CardVariant =
    balance === null ? "default" : balance > 0 ? "warn" : "ok";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Estado actual del paciente
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Resumen operativo para saber qué sigue.
        </p>
      </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Próxima cita */}
      <StatusCard label="Próxima cita" variant={apptVariant}>
        {nextAppt ? (
          <>
            <span className="text-sm font-medium leading-tight">
              {fDatetime(nextAppt.startAt)}
            </span>
            {nextAppt.reason && (
              <span className="text-xs text-muted-foreground truncate" title={nextAppt.reason}>
                {nextAppt.reason}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin cita próxima</span>
        )}
      </StatusCard>

      {/* Consulta activa */}
      <StatusCard label="Consulta activa" variant={encounterVariant}>
        {activeEncounter ? (
          <>
            <span className="text-sm font-medium leading-tight">
              {activeEncounter.status === "IN_PROGRESS" ? "En consulta" : "Borrador"}
            </span>
            <span
              className="text-xs text-muted-foreground truncate"
              title={activeEncounter.chiefComplaint}
            >
              {activeEncounter.chiefComplaint}
            </span>
            <Link
              href={`/pacientes/${patientId}/consultas/${activeEncounter.encounterId}`}
              className="mt-0.5 inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Continuar →
            </Link>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin consulta activa</span>
        )}
      </StatusCard>

      {/* Plan de tratamiento */}
      <StatusCard label="Plan de tratamiento" variant={planVariant}>
        {hasPlan ? (
          <>
            {proposedItems > 0 && (
              <span className="text-sm font-medium leading-tight">
                {proposedItems} {proposedItems === 1 ? "ítem propuesto" : "ítems propuestos"}
              </span>
            )}
            {inProgressItems > 0 && (
              <span className="text-sm font-medium leading-tight">
                {inProgressItems} en progreso
              </span>
            )}
            {proposedItems === 0 && inProgressItems === 0 && (
              <span className="text-sm text-muted-foreground">Plan activo</span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin plan activo</span>
        )}
      </StatusCard>

      {/* Saldo */}
      <StatusCard label="Saldo" variant={balanceVariant}>
        {balance === null ? (
          <span className="text-sm text-muted-foreground">Sin información</span>
        ) : balance > 0 ? (
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 leading-tight">
            {fCents(balance)} pendiente
          </span>
        ) : balance < 0 ? (
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Saldo a favor
          </span>
        ) : (
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Al corriente
          </span>
        )}
      </StatusCard>
    </div>
    </section>
  );
}
