import Link from "next/link";
import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";
import { EncounterList } from "@/components/clinical/EncounterList";
import { PatientFVOSectionsClient, PatientClinicalProfileSection } from "@/components/patients/PatientFVOSectionsClient";
import { PatientStatusBar } from "@/components/patients/PatientStatusBar";
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
  children: React.ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card text-sm ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-2">{children}</div>
    </div>
  );
}

/** Encabezado de grupo: agrupa varias tarjetas bajo un mismo propósito ("qué es esto"). */
function GroupHeading({ title, subtitle }: { title: string; subtitle?: string }) {
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

const TREATMENT_ITEM_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "propuestos",
  ACCEPTED: "aceptados",
  IN_PROGRESS: "en progreso",
  COMPLETED: "completados",
  REJECTED: "rechazados",
  CANCELED: "cancelados",
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
}

export function PatientLiveRecordView({ record, encounters, patientId, fvoPermissions, odontogramSection }: Props) {
  const { identity, operative, clinical, odontogramSummary, treatment, financial, tasks, timeline, recommendedActions, _meta } = record;

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
          <span className="flex items-center justify-center size-12 shrink-0 rounded-full bg-primary/10 text-primary font-semibold text-lg">
            {initials(identity.fullName)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {identity.fullName ?? <span className="text-muted-foreground italic">Sin nombre</span>}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {identity.phone ?? "Sin teléfono"}{identity.email ? ` · ${identity.email}` : ""}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${
            PATIENT_STATUS_BADGE_CLASS[identity.patientStatus] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {PATIENT_STATUS_LABELS[identity.patientStatus] ?? identity.patientStatus}
        </span>
      </div>

      {/* Estado actual del paciente — qué sigue, de un vistazo */}
      <PatientStatusBar
        record={record}
        encounters={encounters}
        patientId={patientId ?? ""}
      />

      {/* Acciones recomendadas — se omite "schedule_appointment" porque la barra ya lo muestra */}
      {recommendedActions.filter(a => a.code !== "schedule_appointment").length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wide">
            Sugerencias
          </p>
          {recommendedActions
            .filter(a => a.code !== "schedule_appointment")
            .map((a) => (
              <p key={a.code} className="text-sm text-amber-700 dark:text-amber-400">
                {a.reason}
              </p>
            ))}
        </div>
      )}

      {/* ── Bloque clínico: qué se ha encontrado y qué se propone tratar ────── */}

      <GroupHeading
        title="Expediente clínico"
        subtitle="Perfil médico, odontograma, consultas y plan de tratamiento."
      />

      {/* Perfil clínico — alertas médicas, alergias, medicamentos, antecedentes */}
      <PatientClinicalProfileSection record={record} />

      {/* Odontograma vigente completo */}
      {odontogramSection}

      {/* Historial clínico — resumen + consultas con enlaces */}
      {clinical && (
        <SectionCard title="Historial clínico">
          <Row label="Total consultas" value={clinical.encountersCount} />
          <Row label="Última consulta" value={fDate(clinical.lastEncounterAt)} />
          <Row label="Estado última consulta" value={clinical.lastEncounterStatus ? (ENCOUNTER_STATUS_LABELS[clinical.lastEncounterStatus] ?? clinical.lastEncounterStatus) : "—"} />
          <Row label="Notas clínicas" value={clinical.notesCount} />
          <Row label="Última nota" value={fDate(clinical.lastNoteAt)} />
          {encounters !== undefined && patientId && (
            <div className="pt-3 mt-1 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Consultas registradas
              </p>
              <EncounterList items={encounters} patientId={patientId} />
            </div>
          )}
        </SectionCard>
      )}

      {/* Plan de tratamiento */}
      {treatment && (
        <SectionCard title="Plan de tratamiento">
          <Row label="Planes registrados" value={treatment.plansCount} />
          <Row label="Plan activo" value={treatment.activePlanId ? "Sí" : "No"} />
          {Object.entries(treatment.itemsByStatus).map(([status, count]) => (
            <Row key={status} label={`Ítems ${TREATMENT_ITEM_STATUS_LABELS[status] ?? status.toLowerCase()}`} value={count} />
          ))}
        </SectionCard>
      )}

      {/* Financiero — presupuestos, cobros y saldo derivados del plan */}
      {financial && (
        <SectionCard title="Presupuestos y cobros">
          <Row label="Presupuestos" value={financial.quotesCount} />
          <Row label="Total propuesto" value={fCents(financial.totalProposedCents)} />
          <Row label="Total aceptado" value={fCents(financial.totalAcceptedCents)} />
          <Row label="Pagado" value={fCents(financial.paidCents)} />
          <Row
            label="Saldo pendiente"
            value={
              <span className={financial.balanceCents > 0 ? "text-destructive font-semibold" : ""}>
                {fCents(financial.balanceCents)}
              </span>
            }
          />
          {financial.hasReversals && (
            <p className="text-xs text-muted-foreground">Incluye reversiones de pago.</p>
          )}
        </SectionCard>
      )}

      {/* ── Bloque operativo: agenda y seguimiento del día a día ────────────── */}

      <GroupHeading
        title="Agenda y seguimiento"
        subtitle="Citas, conversaciones abiertas y tareas pendientes con este paciente."
      />

      {/* Agenda */}
      <SectionCard title="Agenda">
        <Row
          label="Próxima cita"
          value={
            operative.nextAppointment
              ? `${fDatetime(operative.nextAppointment.startAt)} — ${APPT_STATUS_LABELS[operative.nextAppointment.status] ?? operative.nextAppointment.status}`
              : "Sin cita próxima"
          }
        />
        <Row
          label="Última cita"
          value={
            operative.lastAppointment
              ? `${fDate(operative.lastAppointment.startAt)} — ${APPT_STATUS_LABELS[operative.lastAppointment.status] ?? operative.lastAppointment.status}`
              : "Sin historial"
          }
        />
        <Row label="Conversaciones abiertas" value={operative.openConversationsCount} />
        <Row label="Tareas abiertas" value={operative.openTasksCount} />
        <Row label="Última actividad" value={fDate(operative.lastActivityAt)} />
      </SectionCard>

      {/* Tareas abiertas */}
      {tasks && tasks.length > 0 && (
        <SectionCard title="Tareas abiertas">
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <span className="mt-0.5 size-2 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.dueAt && (
                    <p className="text-xs text-muted-foreground">Vence: {fDate(t.dueAt)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Bloque administrativo: datos del paciente y su expediente ───────── */}

      <GroupHeading
        title="Datos del paciente"
        subtitle="Identidad, contacto, domicilio, tutores, datos fiscales y consentimiento."
      />

      {/* Identidad */}
      <SectionCard title="Identidad y contacto">
        <Row label="ID paciente" value={<span className="font-mono text-xs">{identity.patientId}</span>} />
        <Row label="Teléfono" value={identity.phone} />
        <Row label="Correo" value={identity.email} />
        <Row label="Fuente" value={identity.source} />
        <Row label="Alta" value={fDate(identity.createdAt)} />
        {identity.archivedAt && <Row label="Archivado" value={fDate(identity.archivedAt)} />}
      </SectionCard>

      {/* Secciones extendidas FVO — datos personales, domicilio, tutor, contacto, fiscal, comercial, consentimiento */}
      <PatientFVOSectionsClient
        record={record}
        patientId={patientId ?? ""}
        canEditDemographics={fvoPermissions?.canEditDemographics ?? false}
        canAddGuardian={fvoPermissions?.canAddGuardian ?? false}
        canAddEmergencyContact={fvoPermissions?.canAddEmergencyContact ?? false}
        canManageConsent={fvoPermissions?.canManageConsent ?? false}
      />

      {/* ── Actividad: bitácora cronológica de todo lo anterior ─────────────── */}

      <GroupHeading
        title="Actividad reciente"
        subtitle="Lo más reciente primero — útil para retomar el contexto rápido."
      />

      {/* Bitácora de eventos del sistema (versionados) — distinta del historial detallado
          de abajo (PatientTimeline), que cruza encuentros + hallazgos + planes + cobros. */}
      {timeline.length > 0 && (
        <SectionCard title="Bitácora de eventos">
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
        </SectionCard>
      )}

      {/* Metadatos de resolución */}
      <p className="text-xs text-muted-foreground text-right">
        Secciones visibles: {_meta.visibleSections.join(", ")} · Resuelto {fDatetime(_meta.resolvedAt)}
      </p>
    </div>
  );
}
