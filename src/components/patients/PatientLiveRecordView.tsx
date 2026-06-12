import Link from "next/link";
import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";
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
      <div className="px-4 py-4 space-y-2">{children}</div>
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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <Link
          href="/pacientes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Pacientes
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <span className="flex items-center justify-center size-14 shrink-0 rounded-full bg-primary/10 text-primary font-semibold text-xl ring-2 ring-background">
            {initials(identity.fullName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">
                {identity.fullName ?? <span className="text-muted-foreground italic">Sin nombre</span>}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  PATIENT_STATUS_BADGE_CLASS[identity.patientStatus] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {PATIENT_STATUS_LABELS[identity.patientStatus] ?? identity.patientStatus}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {identity.phone ?? "Sin teléfono"}{identity.email ? ` · ${identity.email}` : ""}
            </p>

            {/* Resumen compacto: lo esencial de un vistazo, sin tarjetas grandes */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              <span>
                <span className="text-muted-foreground">Próxima cita: </span>
                {nextAppt ? (
                  <span className="font-medium">{fDatetime(nextAppt.startAt)}</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">Sin cita próxima</span>{" "}
                    <Link href="/agenda" className="text-xs font-medium text-primary/70 hover:text-primary transition-colors">
                      Ir a agenda →
                    </Link>
                  </>
                )}
              </span>

              <span>
                <span className="text-muted-foreground">Consulta activa: </span>
                {activeEncounter ? (
                  <>
                    <span className="font-medium">
                      {activeEncounter.status === "IN_PROGRESS" ? "En consulta" : "Borrador"}
                    </span>{" "}
                    <Link
                      href={`/pacientes/${patientId}/consultas/${activeEncounter.encounterId}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Continuar →
                    </Link>
                  </>
                ) : (
                  <span className="text-muted-foreground">Ninguna</span>
                )}
              </span>

              <span>
                <span className="text-muted-foreground">Plan: </span>
                <span className="font-medium">{hasPlan ? "Sí" : "No"}</span>
              </span>

              <span>
                <span className="text-muted-foreground">Saldo: </span>
                {balance === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : balance > 0 ? (
                  <span className="font-semibold text-amber-700 dark:text-amber-400">{fCents(balance)}</span>
                ) : (
                  <span className="font-medium text-green-700 dark:text-green-400">{fCents(balance)}</span>
                )}
              </span>

              {odontogramSummary && odontogramSummary.totalFindings > 0 && (
                <span>
                  <span className="text-muted-foreground">Hallazgos: </span>
                  <span className="font-medium">{odontogramSummary.totalFindings}</span>
                </span>
              )}
            </div>
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

      {/* ── Atención de hoy: lo que el usuario necesita para actuar hoy con
          este paciente. Franja compacta, no tarjeta gigante. ────── */}

      <GroupHeading title="Atención de hoy" />

      <div className="rounded-xl border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
          <ul className="mt-3 space-y-1.5 border-t pt-3">
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

      {/* ── Clínica: perfil médico, odontograma, hallazgos y consultas clínicas.
          2 columnas en desktop, 1 en mobile. ────── */}

      <GroupHeading
        title="Clínica"
        subtitle="Perfil médico, odontograma, hallazgos activos y consultas clínicas. El detalle de tratamiento y pagos vive en “Tratamiento y pagos”, más abajo."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna izquierda */}
        <div className="space-y-4">
          {/* Perfil clínico — alertas médicas, alergias, medicamentos, antecedentes */}
          <PatientClinicalProfileSection record={record} />

          {/* Consultas clínicas — resumen + consultas con enlaces */}
          {clinical && (
            <SectionCard title="Consultas clínicas">
              <Row label="Total consultas" value={clinical.encountersCount} />
              <Row label="Última consulta" value={fDate(clinical.lastEncounterAt)} />
              <Row label="Estado última consulta" value={clinical.lastEncounterStatus ? (ENCOUNTER_STATUS_LABELS[clinical.lastEncounterStatus] ?? clinical.lastEncounterStatus) : "—"} />
              <Row label="Notas clínicas" value={clinical.notesCount} />
              <Row label="Última nota" value={fDate(clinical.lastNoteAt)} />
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

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Odontograma vigente completo */}
          {odontogramSection}
        </div>
      </div>

      {/* ── Tratamiento y pagos: plan de tratamiento, presupuestos/cobros y
          documentos. Resumen siempre visible; detalle completo bajo demanda. ── */}

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

      {/* ── Datos del paciente: identidad, contacto y datos administrativos ───
          Tarjeta madre única, colapsada por default — resumen compacto siempre
          visible; subsecciones internas compactas (no tarjetas sueltas) al expandir. ── */}

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
