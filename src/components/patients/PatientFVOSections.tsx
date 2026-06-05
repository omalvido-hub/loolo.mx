// FVO-1 — Secciones extendidas de la Ficha Viva Odontológica. SOLO LECTURA.
// Renderiza datos demográficos, domicilio, perfil clínico, alertas, tutor,
// contacto de emergencia, origen comercial, consentimiento y datos fiscales.
// Los datos que no existen muestran guión, no error.

import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

function fDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    // Date-only strings (YYYY-MM-DD) are parsed by `new Date()` as UTC midnight,
    // which shifts the day back by 6h with America/Mexico_City (UTC-6).
    // Pinning to noon UTC keeps the correct civil date for any MX timezone offset.
    const s = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00Z" : iso;
    return FMT_DATE.format(new Date(s));
  } catch {
    return "—";
  }
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  accent?: "red" | "default";
}

function SectionCard({ title, children, accent = "default" }: SectionCardProps) {
  return (
    <div
      className={`rounded-xl border text-sm overflow-hidden ${
        accent === "red"
          ? "border-red-200 ring-1 ring-red-200 dark:border-red-900/40"
          : "bg-card ring-1 ring-foreground/10"
      }`}
    >
      <div
        className={`px-4 py-3 border-b ${
          accent === "red" ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/30"
        }`}
      >
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-2">{children}</div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex gap-2">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

const SEX_LABELS: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  NB: "No binario",
  O: "Otro",
};

const MARITAL_LABELS: Record<string, string> = {
  SINGLE: "Soltero/a",
  MARRIED: "Casado/a",
  DIVORCED: "Divorciado/a",
  WIDOWED: "Viudo/a",
  OTHER: "Otro",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: "Padre/Madre",
  SIBLING: "Hermano/a",
  SPOUSE: "Cónyuge",
  OTHER: "Otro",
};

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referido",
  WALK_IN: "Llegada directa",
  WEB: "Web",
  OTHER: "Otro",
};

const CONSENT_STATUS_LABELS: Record<string, string> = {
  GRANTED: "Otorgado",
  REVOKED: "Revocado",
};

const METHOD_LABELS: Record<string, string> = {
  SIGNATURE: "Firma física",
  VERBAL: "Verbal",
  DIGITAL: "Digital",
  IMPLICIT: "Implícito",
};

interface Props {
  record: PatientLiveRecord;
}

export function PatientFVOSections({ record }: Props) {
  const {
    demographics,
    address,
    guardian,
    emergencyContact,
    commercialOrigin,
    consent,
    medicalAlertFlag,
    clinicalProfile,
    tax,
  } = record;

  const hasFVO =
    demographics !== undefined ||
    clinicalProfile !== undefined ||
    tax !== undefined;

  if (!hasFVO) return null;

  return (
    <>
      {/* Datos personales */}
      {demographics && (
        <SectionCard title="Datos personales">
          <Row label="Fecha de nacimiento" value={demographics.dateOfBirth ? fDate(demographics.dateOfBirth) : "—"} />
          <Row label="Edad" value={demographics.age != null ? `${demographics.age} años` : "—"} />
          <Row label="Sexo" value={demographics.sex ? (SEX_LABELS[demographics.sex] ?? demographics.sex) : "—"} />
          <Row label="Tipo de sangre" value={demographics.bloodType} />
          <Row label="Ocupación" value={demographics.occupation} />
          <Row label="Estado civil" value={demographics.maritalStatus ? (MARITAL_LABELS[demographics.maritalStatus] ?? demographics.maritalStatus) : "—"} />
        </SectionCard>
      )}

      {/* Domicilio */}
      {address && (
        <SectionCard title="Domicilio">
          {(address.street || address.extNumber) && (
            <Row
              label="Calle y número"
              value={[address.street, address.extNumber, address.intNumber ? `Int. ${address.intNumber}` : null]
                .filter(Boolean)
                .join(" ") || "—"}
            />
          )}
          <Row label="Colonia" value={address.neighborhood} />
          <Row label="Municipio / Alcaldía" value={address.municipality} />
          <Row label="Estado" value={address.state} />
          <Row label="Código postal" value={address.postalCode} />
          <Row label="País" value={address.country} />
        </SectionCard>
      )}

      {/* Bandera de alerta médica — visible para front_desk (no tiene clinicalProfile) */}
      {medicalAlertFlag && !clinicalProfile && medicalAlertFlag.hasActiveAlerts && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Alerta médica activa
          </p>
          {medicalAlertFlag.highSeverityCount > 0 && (
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              {medicalAlertFlag.highSeverityCount} alerta(s) de severidad alta o crítica. Consulta con el clínico antes de la atención.
            </p>
          )}
        </div>
      )}

      {/* Perfil clínico completo — solo con patient.clinical_profile.view */}
      {clinicalProfile && (
        <SectionCard
          title="Perfil clínico"
          accent={clinicalProfile.medicalAlerts.some((a) => a.active && (a.severity === "HIGH" || a.severity === "CRITICAL")) ? "red" : "default"}
        >
          {/* Alertas médicas */}
          {clinicalProfile.medicalAlerts.length > 0 && (
            <div className="pb-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Alertas médicas
              </p>
              {clinicalProfile.medicalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg px-3 py-2 flex items-start gap-2 ${
                    alert.active ? "" : "opacity-50"
                  }`}
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      SEVERITY_COLORS[alert.severity] ?? "bg-muted text-foreground"
                    }`}
                  >
                    {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{alert.alertType}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    {!alert.active && (
                      <p className="text-xs text-muted-foreground italic">Inactiva</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alergias */}
          <Row
            label="Alergias conocidas"
            value={
              clinicalProfile.knownAllergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {clinicalProfile.knownAllergies.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 text-xs font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                "Ninguna registrada"
              )
            }
          />

          {/* Medicamentos */}
          <Row
            label="Medicamentos actuales"
            value={
              clinicalProfile.currentMedications.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {clinicalProfile.currentMedications.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 text-xs font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                "Ninguno registrado"
              )
            }
          />

          {clinicalProfile.relevantHistory && (
            <div className="flex gap-2">
              <span className="w-44 shrink-0 text-muted-foreground">Antecedentes</span>
              <p className="font-medium text-sm leading-relaxed">{clinicalProfile.relevantHistory}</p>
            </div>
          )}

          {clinicalProfile.safetyNotes && (
            <div className="flex gap-2">
              <span className="w-44 shrink-0 text-muted-foreground">Notas de seguridad</span>
              <p className="font-medium text-sm leading-relaxed text-orange-700 dark:text-orange-400">
                {clinicalProfile.safetyNotes}
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* Tutor / Responsable */}
      {guardian && (
        <SectionCard title="Tutor / Responsable">
          <Row label="Nombre" value={guardian.name} />
          <Row label="Relación" value={guardian.relationship ? (RELATIONSHIP_LABELS[guardian.relationship] ?? guardian.relationship) : "—"} />
          <Row label="Teléfono" value={guardian.phone} />
          <Row label="Correo" value={guardian.email} />
        </SectionCard>
      )}

      {/* Contacto de emergencia */}
      {emergencyContact && (
        <SectionCard title="Contacto de emergencia">
          <Row label="Nombre" value={emergencyContact.name} />
          <Row label="Relación" value={emergencyContact.relationship} />
          <Row label="Teléfono" value={emergencyContact.phone} />
        </SectionCard>
      )}

      {/* Datos fiscales del paciente */}
      {tax && (
        <SectionCard title="Datos fiscales">
          <Row label="RFC" value={tax.rfc ? <span className="font-mono">{tax.rfc}</span> : "—"} />
          <Row label="Razón social" value={tax.legalName} />
          <Row label="Régimen fiscal" value={tax.taxRegime} />
          <Row label="Uso CFDI" value={tax.cfdiUse} />
          <Row label="CP fiscal" value={tax.taxPostalCode} />
        </SectionCard>
      )}

      {/* Origen comercial */}
      {commercialOrigin && (
        <SectionCard title="Origen comercial">
          <Row label="Canal" value={commercialOrigin.channel ? (CHANNEL_LABELS[commercialOrigin.channel] ?? commercialOrigin.channel) : "—"} />
          <Row label="Campaña" value={commercialOrigin.campaign} />
          <Row label="Referido por" value={commercialOrigin.referredBy} />
          <Row label="Motivo inicial" value={commercialOrigin.initialReason} />
        </SectionCard>
      )}

      {/* Consentimiento de datos */}
      {consent && (
        <SectionCard title="Consentimiento de datos">
          <Row
            label="Estado"
            value={
              consent.status ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    consent.status === "GRANTED"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}
                >
                  {CONSENT_STATUS_LABELS[consent.status] ?? consent.status}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row label="Fecha" value={fDate(consent.grantedAt)} />
          <Row label="Versión" value={consent.version} />
          <Row label="Método" value={consent.method ? (METHOD_LABELS[consent.method] ?? consent.method) : "—"} />
        </SectionCard>
      )}
    </>
  );
}
