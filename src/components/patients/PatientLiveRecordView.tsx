import Link from "next/link";
import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";
import { StatCard } from "@/components/ui/stat-card";
import { EncounterList } from "@/components/clinical/EncounterList";
import { PatientFVOSectionsClient, PatientClinicalProfileSection } from "@/components/patients/PatientFVOSectionsClient";
import { PatientDisclosureSection } from "@/components/patients/PatientDisclosureSection";
import type { EncounterListItem } from "@/server/domain/clinical/encounter-views";

interface FVOPermissions {
  canEditDemographics: boolean;
  canAddGuardian: boolean;
  canAddEmergencyContact: boolean;
  canManageConsent: boolean;
}

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

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

const FMT_TIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  timeStyle: "short",
});

const FMT_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATETIME.format(new Date(iso)); } catch { return "—"; }
}

function fCents(cents: number): string {
  return FMT_CURRENCY.format(cents / 100);
}

/** Fecha de una cita en formato corto ("12 jun 2026"). */
function formatAppointmentDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
}

/** Hora de una cita ("10:00 a.m."). */
function formatAppointmentTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT_TIME.format(new Date(iso)); } catch { return "—"; }
}

/** True si dos fechas ISO caen en el mismo día calendario en America/Mexico_City. */
function isSameLocalDay(isoA: string | null | undefined, isoB: string | null | undefined): boolean {
  if (!isoA || !isoB) return false;
  try { return FMT_DAY_KEY.format(new Date(isoA)) === FMT_DAY_KEY.format(new Date(isoB)); } catch { return false; }
}

/** Línea "profesional · sillón" para una cita, omitiendo lo que no esté disponible (sin permiso o sin asignar). */
function formatResourceLine(professionalName?: string | null, chairName?: string | null): string | null {
  const parts = [professionalName, chairName].filter((v): v is string => !!v);
  return parts.length > 0 ? parts.join(" · ") : null;
}

interface SectionCardProps {
  title: string;
  /** Aviso corto ("Resumen") junto al título — aclara que el detalle completo vive en otra parte. */
  badge?: string;
  /** Texto bajo el título, p.ej. apuntando a dónde está el detalle completo. */
  hint?: string;
  children: React.ReactNode;
}

function SectionCard({ title, badge, hint, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card text-sm ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-base">{title}</h2>
          {badge && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-foreground/5 text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

/** Encabezado de grupo: agrupa varias tarjetas bajo un mismo propósito ("qué es esto"). */
export function GroupHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2 first:pt-0">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h2>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function initials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

interface RowProps { label: string; value: React.ReactNode }
function Row({ label, value }: RowProps) {
  return (
    <div className="flex gap-2">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

const PATIENT_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const PATIENT_STATUS_BADGE_CLASS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  INACTIVE: "bg-muted text-muted-foreground",
};

const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
  NO_SHOW: "No presentó",
};

const ENCOUNTER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  FINALIZED: "Finalizada",
  CANCELED: "Cancelada",
};

const TOOTH_STATUS_LABELS: Record<string, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  EXTRACTED: "Extraído",
  IMPACTED: "Impactado",
  UNERUPTED: "Sin erupcionar",
  ROOT_ONLY: "Solo raíz",
};

const TIMELINE_LABELS: Record<string, string> = {
  "appointment.scheduled": "Cita agendada",
  "appointment.completed": "Cita completada",
  "appointment.canceled": "Cita cancelada",
  "encounter.finalized": "Consulta finalizada",
  "treatment.plan_proposed": "Plan de tratamiento propuesto",
  "treatment.plan_accepted": "Plan de tratamiento aceptado",
  "quote.proposed": "Presupuesto propuesto",
  "quote.accepted": "Presupuesto aceptado",
  "payment.recorded": "Pago registrado",
  "payment.reversed": "Pago revertido",
  "task.completed": "Tarea completada",
};

interface Props {
  record: PatientLiveRecord;
  encounters?: EncounterListItem[];
  patientId?: string;
  fvoPermissions?: FVOPermissions;
  odontogramSection?: React.ReactNode;
  canCreateEncounter?: boolean;
  documentsCount?: number;
  /** Detalle bajo demanda de "Tratamiento y pagos": planes, presupuestos/cobros y documentos. */
  operationDetail?: React.ReactNode;
  /** Historial cruzado (PatientTimeline), renderizado dentro de la ficha. */
  historyTimeline?: React.ReactNode;
}

export function PatientLiveRecordView({ record, encounters, patientId, fvoPermissions, odontogramSection, canCreateEncounter, documentsCount, operationDetail, historyTimeline }: Props) {
  const { identity, operative, clinical, odontogramSummary, treatment, financial, tasks, timeline, recommendedActions } = record;

  const itemsVivos = treatment
    ? (treatment.itemsByStatus.PROPOSED ?? 0) + (treatment.itemsByStatus.ACCEPTED ?? 0) + (treatment.itemsByStatus.IN_PROGRESS ?? 0)
    : 0;
  const itemsAceptados = treatment?.itemsByStatus.ACCEPTED ?? 0;

  // Consulta activa: la más reciente con DRAFT o IN_PROGRESS (encounters viene
  // ordenado DESC por createdAt desde listEncountersSafeForPatient).
  const activeEncounter =
    encounters?.find((e) => e.status === "IN_PROGRESS" || e.status === "DRAFT") ?? null;

  const nextAppt = operative.nextAppointment;
  const hasPlan = !!treatment?.activePlanId;
  const balance = financial?.balanceCents ?? null;
  const nextApptIsToday = nextAppt ? isSameLocalDay(nextAppt.startAt, new Date().toISOString()) : false;
  const nextApptResourceLine = nextAppt ? formatResourceLine(nextAppt.professionalName, nextAppt.chairName) : null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      {/* Volver */}
      <div className="flex items-center gap-4">
        <Link
          href="/pacientes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Pacientes
        </Link>
      </div>

      {/* ── Bloque superior único: identidad del paciente + resumen operativo
          (mini-métricas) + Atención de hoy, todo dentro de la misma tarjeta. ── */}
      <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="p-3 md:p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start gap-3">
            {/* Identidad */}
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex items-center justify-center size-10 shrink-0 rounded-full bg-primary/10 text-primary font-semibold text-base ring-2 ring-background">
                {initials(identity.fullName)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h1 className="text-xl font-bold truncate min-w-0">
                    {identity.fullName ?? <span className="text-muted-foreground italic">Sin nombre</span>}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                      PATIENT_STATUS_BADGE_CLASS[identity.patientStatus] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {PATIENT_STATUS_LABELS[identity.patientStatus] ?? identity.patientStatus}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {identity.phone ?? "Sin teléfono"}{identity.email ? ` · ${identity.email}` : ""}
                </p>
              </div>
            </div>

            {/* Resumen operativo: mini-métricas en retícula, no una línea que se rompe */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 min-w-0">
              <StatCard
                label="Próxima cita"
                tone="accent"
                value={
                  nextAppt ? (
                    <>
                      <span className="block truncate">
                        {nextApptIsToday ? "Hoy" : formatAppointmentDate(nextAppt.startAt)}
                      </span>
                      <span className="block truncate">{formatAppointmentTime(nextAppt.startAt)}</span>
                    </>
                  ) : (
                    "Sin cita"
                  )
                }
                multiline={!!nextAppt}
                valueClassName={nextAppt ? "" : "text-muted-foreground"}
                action={
                  <div className="space-y-0.5">
                    {nextAppt && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {APPT_STATUS_LABELS[nextAppt.status] ?? nextAppt.status}
                        {nextApptResourceLine ? ` · ${nextApptResourceLine}` : ""}
                      </p>
                    )}
                    <Link
                      href={nextAppt ? `/agenda?appointmentId=${nextAppt.id}` : `/agenda?patientId=${patientId}`}
                      className="text-[11px] font-medium text-primary/70 hover:text-primary transition-colors"
                    >
                      {nextAppt ? "Ver cita →" : "Agendar →"}
                    </Link>
                  </div>
                }
              />
              <StatCard
                label="Consulta activa"
                tone={activeEncounter ? "accent" : "muted"}
                value={activeEncounter ? (activeEncounter.status === "IN_PROGRESS" ? "En consulta" : "Borrador") : "Ninguna"}
                action={
                  activeEncounter && (
                    <Link
                      href={`/pacientes/${patientId}/consultas/${activeEncounter.encounterId}`}
                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Continuar →
                    </Link>
                  )
                }
              />
              <StatCard label="Plan" tone={hasPlan ? "accent" : "muted"} value={hasPlan ? "Sí" : "No"} />
              <StatCard
                label="Saldo"
                tone={balance !== null && balance > 0 ? "warning" : "success"}
                value={balance === null ? "—" : fCents(balance)}
                valueClassName={
                  balance === null
                    ? ""
                    : balance > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-green-700 dark:text-green-400"
                }
              />
              <StatCard label="Hallazgos" tone="muted" value={odontogramSummary?.totalFindings ?? 0} />
            </div>
          </div>

          {/* Atención de hoy — integrada al bloque superior, no es tarjeta aparte */}
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5">Atención de hoy</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {nextAppt && nextApptIsToday && (
                <span>
                  <span className="text-muted-foreground">Cita de hoy: </span>
                  <span className="font-medium">
                    {formatAppointmentTime(nextAppt.startAt)} — {APPT_STATUS_LABELS[nextAppt.status] ?? nextAppt.status}
                    {nextApptResourceLine ? ` · ${nextApptResourceLine}` : ""}
                  </span>
                </span>
              )}
              <span>
                <span className="text-muted-foreground">Última cita: </span>
                <span className="font-medium">
                  {operative.lastAppointment
                    ? `${fDate(operative.lastAppointment.startAt)} — ${APPT_STATUS_LABELS[operative.lastAppointment.status] ?? operative.lastAppointment.status}`
                    : "Sin historial"}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Conversaciones abiertas: </span>
                <span className="font-medium">{operative.openConversationsCount}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Tareas abiertas: </span>
                <span className="font-medium">{operative.openTasksCount}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Última actividad: </span>
                <span className="font-medium">{fDate(operative.lastActivityAt)}</span>
              </span>
              <Link href="/agenda" className="text-xs font-medium text-primary/70 hover:text-primary transition-colors">
                Ir a agenda →
              </Link>
            </div>

            {/* Tareas abiertas — lista corta, dentro de la misma franja */}
            {tasks && tasks.length > 0 && (
              <ul className="mt-2 space-y-1.5 border-t pt-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>
                      <span className="font-medium">{t.title}</span>
                      {t.dueAt && <span className="text-xs text-muted-foreground"> — Vence: {fDate(t.dueAt)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Próximos pasos — acciones recomendadas como lista limpia */}
      {recommendedActions.filter(a => a.code !== "schedule_appointment").length > 0 && (
        <SectionCard title="Próximos pasos">
          <ul className="space-y-2">
            {recommendedActions
              .filter(a => a.code !== "schedule_appointment")
              .map((a) => (
                <li key={a.code} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary/50 shrink-0" />
                  <span className="text-foreground/80">{a.reason}</span>
                </li>
              ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Clínica: perfil médico resumido, odontograma + hallazgos y consultas
          clínicas. 3 bloques full-width apilados — el odontograma divide
          internamente diagrama (más ancho) y hallazgos activos. ────── */}

      <GroupHeading
        title="Clínica"
        subtitle="Perfil médico, odontograma, hallazgos activos y consultas clínicas. El detalle de tratamiento y pagos vive en “Tratamiento y pagos”, más abajo."
      />

      <div className="space-y-4">
        {/* A) Riesgos clínicos / perfil clínico resumido — full width */}
        <PatientClinicalProfileSection record={record} />

        {/* B) Odontograma vigente: diagrama + hallazgos activos (grid interno) */}
        {odontogramSection}

        {/* C) Consultas clínicas — resumen compacto + detalle bajo demanda */}
        {clinical && (
          <SectionCard title="Consultas clínicas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <Row label="Total consultas" value={clinical.encountersCount} />
              <Row label="Última consulta" value={fDate(clinical.lastEncounterAt)} />
              <Row label="Estado última consulta" value={clinical.lastEncounterStatus ? (ENCOUNTER_STATUS_LABELS[clinical.lastEncounterStatus] ?? clinical.lastEncounterStatus) : "—"} />
              <Row label="Notas clínicas" value={clinical.notesCount} />
              <Row label="Última nota" value={fDate(clinical.lastNoteAt)} />
            </div>
            {encounters !== undefined && patientId && (
              <details className="pt-3 mt-1 border-t">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Ver todas las consultas
                </summary>
                <div className="pt-2">
                  <EncounterList items={encounters} patientId={patientId} canCreate={canCreateEncounter} />
                </div>
              </details>
            )}
          </SectionCard>
        )}
      </div>

      {/* ── Tratamiento y pagos + Datos del paciente: misma retícula de 2
          columnas, mismo estilo y ancho. 1 columna en mobile. ── */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
        {/* Tratamiento y pagos: plan de tratamiento, presupuestos/cobros y
            documentos. Resumen siempre visible; detalle completo bajo demanda. */}
        {(treatment || financial || documentsCount !== undefined) && (
          <PatientDisclosureSection
            title="Tratamiento y pagos"
            subtitle="Plan de tratamiento, presupuesto, pagos y documentos — resumen y detalle."
            summary={
              <>
                {treatment && <Row label="Plan activo" value={treatment.activePlanId ? "Sí" : "No"} />}
                {treatment && <Row label="Ítems vivos / aceptados" value={`${itemsVivos} / ${itemsAceptados}`} />}
                {financial && <Row label="Presupuesto aceptado" value={fCents(financial.totalAcceptedCents)} />}
                {financial && <Row label="Pagado" value={fCents(financial.paidCents)} />}
                {financial && (
                  <Row
                    label="Saldo"
                    value={
                      <span className={financial.balanceCents > 0 ? "text-destructive font-semibold" : ""}>
                        {fCents(financial.balanceCents)}
                      </span>
                    }
                  />
                )}
                {documentsCount !== undefined && <Row label="Documentos" value={documentsCount} />}
              </>
            }
          >
            {operationDetail}
          </PatientDisclosureSection>
        )}

        {/* Datos del paciente: identidad, contacto y datos administrativos.
            Tarjeta madre única, colapsada por default — resumen compacto siempre
            visible; subsecciones internas compactas (no tarjetas sueltas) al expandir. */}
        <PatientDisclosureSection
          title="Datos del paciente"
          subtitle="Identidad, contacto, domicilio, tutores, datos fiscales y consentimiento."
          summary={
            <>
              <Row label="Teléfono" value={identity.phone} />
              {record.address && (
                <Row
                  label="Domicilio"
                  value={record.address.street || record.address.municipality || record.address.postalCode ? "Registrado" : "No registrado"}
                />
              )}
              {record.demographics !== undefined && (
                <Row
                  label="Aseguradora"
                  value={
                    !record.insurance
                      ? "Sin registrar"
                      : !record.insurance.hasInsurance
                        ? "Sin seguro"
                        : record.insurance.providerName || "Registrada"
                  }
                />
              )}
              {record.tax && (
                <Row
                  label="Fiscal"
                  value={record.tax.rfc && record.tax.legalName ? "Completo" : "Incompleto"}
                />
              )}
              {record.emergencyContact && (
                <Row
                  label="Contacto de emergencia"
                  value={record.emergencyContact.name ? "Registrado" : "No registrado"}
                />
              )}
              {record.consent && (
                <Row
                  label="Consentimiento"
                  value={record.consent.status === "GRANTED" ? "Otorgado" : "Pendiente"}
                />
              )}
            </>
          }
        >
          {/* Identidad — bloque compacto, agrupado bajo "General" junto con datos personales (FVO).
              El encabezado de grupo "General" lo aporta PatientFVOSectionsClient (Datos personales),
              justo debajo de este bloque, para no duplicar el rótulo. */}
          <div className="py-3 border-b">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Identidad y contacto
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="ID paciente" value={<span className="font-mono text-xs">{identity.patientId}</span>} />
              <Row label="Teléfono" value={identity.phone} />
              <Row label="Correo" value={identity.email} />
              <Row label="Fuente" value={identity.source} />
              <Row label="Alta" value={fDate(identity.createdAt)} />
              {identity.archivedAt && <Row label="Archivado" value={fDate(identity.archivedAt)} />}
            </div>
          </div>

          {/* Secciones extendidas FVO — datos personales, domicilio, tutor, contacto, fiscal, consentimiento, origen — en modo compacto */}
          <PatientFVOSectionsClient
            record={record}
            patientId={patientId ?? ""}
            canEditDemographics={fvoPermissions?.canEditDemographics ?? false}
            canAddGuardian={fvoPermissions?.canAddGuardian ?? false}
            canAddEmergencyContact={fvoPermissions?.canAddEmergencyContact ?? false}
            canManageConsent={fvoPermissions?.canManageConsent ?? false}
            variant="compact"
          />
        </PatientDisclosureSection>
      </div>

      {/* ── Historial: últimos eventos, con acceso al historial completo ── */}
      {historyTimeline}

      {/* ── Auditoría: bitácora técnica del sistema, fuera del flujo clínico ── */}

      {/* Bitácora de eventos del sistema (versionados) — resumen corto y reciente.
          Distinta de "Historial" (PatientTimeline, más arriba), que es el
          cruce de actividad clínica: consultas, hallazgos, tratamientos y documentos. */}
      {timeline.length > 0 && (
        <PatientDisclosureSection
          title="Auditoría"
          subtitle="Los 20 eventos más recientes del sistema — bitácora técnica, no forma parte del historial clínico."
          tone="muted"
        >
          <ul className="space-y-2">
            {timeline.slice(0, 20).map((ev, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground shrink-0 w-36">
                  {fDate(ev.occurredAt)}
                </span>
                <span>{TIMELINE_LABELS[ev.eventType] ?? ev.label}</span>
              </li>
            ))}
          </ul>
          {timeline.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando los 20 eventos más recientes.
            </p>
          )}
        </PatientDisclosureSection>
      )}
    </div>
  );
}
