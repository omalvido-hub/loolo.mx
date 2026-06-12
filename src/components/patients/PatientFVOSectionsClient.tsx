"use client";

// NELZZON — Secciones extendidas FVO con formularios administrativos (UI-7A).
// Muestra las 9 secciones FVO en modo lectura para todos los roles.
// Secciones editables en UI-7A: datos personales, domicilio, origen comercial,
// tutor (solo agregar), contacto de emergencia (solo agregar), consentimiento.
// Perfil clínico y datos fiscales quedan solo lectura hasta UI-7B.
// Patrón: useTransition + server actions fvo.ts + errores inline.
// Sin validación Zod duplicada: el backend manda el error al cliente.

import { useState, useTransition } from "react";
import type { PatientLiveRecord } from "@/server/domain/patient-record/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertDemographicsAction,
  upsertAddressAction,
  upsertCommercialOriginAction,
  addGuardianAction,
  addEmergencyContactAction,
  grantConsentAction,
  revokeConsentAction,
} from "@/server/actions/fvo";

// ── Utilidades de formato ──────────────────────────────────────────────────────

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
  } catch { return "—"; }
}

// ── Catálogos de etiquetas ─────────────────────────────────────────────────────

const SEX_LABELS: Record<string, string> = {
  M: "Masculino", F: "Femenino", NB: "No binario", O: "Otro",
};
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: "Soltero/a", MARRIED: "Casado/a", DIVORCED: "Divorciado/a",
  WIDOWED: "Viudo/a", OTHER: "Otro",
};
const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica",
};
const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};
const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: "Padre/Madre", SIBLING: "Hermano/a", SPOUSE: "Cónyuge", OTHER: "Otro",
};
const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", REFERRAL: "Referido",
  WALK_IN: "Llegada directa", WEB: "Web", OTHER: "Otro",
};
const CONSENT_STATUS_LABELS: Record<string, string> = {
  GRANTED: "Otorgado", REVOKED: "Revocado",
};
const METHOD_LABELS: Record<string, string> = {
  SIGNATURE: "Firma física", VERBAL: "Verbal", DIGITAL: "Digital", IMPLICIT: "Implícito",
};
const ALERT_TYPE_LABELS: Record<string, string> = {
  ALLERGY: "Alergia", MEDICATION: "Medicamento", CONDITION: "Condición", OTHER: "Otro",
};

// ── Componentes auxiliares ─────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  accent?: "red" | "default";
  headerAction?: React.ReactNode;
  /** "compact" — bloque ligero con divisor inferior, sin tarjeta propia. Para "Datos del paciente". */
  variant?: "default" | "compact";
}

function SectionCard({ title, children, accent = "default", headerAction, variant = "default" }: SectionCardProps) {
  if (variant === "compact") {
    return (
      <div className="py-3 border-b last:border-b-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
          {headerAction}
        </div>
        <div className="space-y-2 text-sm">{children}</div>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border text-sm overflow-hidden ${
      accent === "red"
        ? "border-red-200 ring-1 ring-red-200 dark:border-red-900/40"
        : "bg-card ring-1 ring-foreground/10"
    }`}>
      <div className={`px-4 py-3 border-b ${
        accent === "red" ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/30"
      }`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-base">{title}</h2>
          {headerAction}
        </div>
      </div>
      <div className="px-4 py-4 space-y-2">{children}</div>
    </div>
  );
}

/** Etiqueta de subgrupo — solo en variant="compact", para organizar "Datos del paciente". */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 pt-2 first:pt-0">
      {children}
    </p>
  );
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

function InlineError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[11rem_1fr] items-start gap-x-2 gap-y-1">
      <Label className="pt-2 text-muted-foreground text-sm font-normal">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function SelectNative({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}

function FormActions({
  onSave,
  onCancel,
  pending,
  saveLabel = "Guardar",
}: {
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" onClick={onSave} disabled={pending}>
        {pending ? "Guardando…" : saveLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
    </div>
  );
}

// ── Perfil clínico (exportado para composición en PatientLiveRecordView) ──────

/** Alertas médicas visibles por default en el perfil clínico compacto; el resto queda bajo "Ver perfil completo". */
const MAX_VISIBLE_ALERTS = 3;

const ALERT_SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0,
};

function AlertRow({ alert }: { alert: { id: string; active: boolean; severity: string; alertType: string; description: string } }) {
  return (
    <div className={`rounded-lg px-3 py-2 flex items-start gap-2 ${alert.active ? "" : "opacity-50"}`}>
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          SEVERITY_COLORS[alert.severity] ?? "bg-muted text-foreground"
        }`}
      >
        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
      </span>
      <div>
        <p className="text-sm font-medium">{ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}</p>
        <p className="text-xs text-muted-foreground">{alert.description}</p>
        {!alert.active && (
          <p className="text-xs text-muted-foreground italic">Inactiva</p>
        )}
      </div>
    </div>
  );
}

export function PatientClinicalProfileSection({ record }: { record: PatientLiveRecord }) {
  const { clinicalProfile, medicalAlertFlag } = record;

  if (!medicalAlertFlag && !clinicalProfile) return null;

  // Activas y de mayor severidad primero, para que las 3 visibles por default
  // siempre incluyan lo más crítico.
  const sortedAlerts = clinicalProfile
    ? [...clinicalProfile.medicalAlerts].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return (ALERT_SEVERITY_RANK[b.severity] ?? 0) - (ALERT_SEVERITY_RANK[a.severity] ?? 0);
      })
    : [];
  const visibleAlerts = sortedAlerts.slice(0, MAX_VISIBLE_ALERTS);
  const restAlerts = sortedAlerts.slice(MAX_VISIBLE_ALERTS);
  const hasMoreDetail = restAlerts.length > 0 || !!clinicalProfile?.relevantHistory;

  return (
    <>
      {medicalAlertFlag && !clinicalProfile && medicalAlertFlag.hasActiveAlerts && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Alerta médica activa</p>
          {medicalAlertFlag.highSeverityCount > 0 && (
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              {medicalAlertFlag.highSeverityCount} alerta(s) de severidad alta o crítica. Consulta con el clínico antes de la atención.
            </p>
          )}
        </div>
      )}

      {clinicalProfile && (
        <SectionCard
          title="Perfil clínico"
          accent={
            clinicalProfile.medicalAlerts.some(
              (a) => a.active && (a.severity === "HIGH" || a.severity === "CRITICAL"),
            )
              ? "red"
              : "default"
          }
        >
          {visibleAlerts.length > 0 && (
            <div className="pb-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Alertas médicas
              </p>
              {visibleAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
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
          {clinicalProfile.safetyNotes && (
            <div className="flex gap-2">
              <span className="w-44 shrink-0 text-muted-foreground">Notas de seguridad</span>
              <p className="font-medium text-sm leading-relaxed text-orange-700 dark:text-orange-400 line-clamp-2">
                {clinicalProfile.safetyNotes}
              </p>
            </div>
          )}

          {hasMoreDetail && (
            <details className="pt-2 mt-1 border-t">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ver perfil completo
                {restAlerts.length > 0 ? ` (${restAlerts.length} alerta${restAlerts.length !== 1 ? "s" : ""} más)` : ""}
              </summary>
              <div className="pt-2 space-y-2">
                {restAlerts.length > 0 && (
                  <div className="space-y-2">
                    {restAlerts.map((alert) => (
                      <AlertRow key={alert.id} alert={alert} />
                    ))}
                  </div>
                )}
                {clinicalProfile.relevantHistory && (
                  <div className="flex gap-2">
                    <span className="w-44 shrink-0 text-muted-foreground">Antecedentes</span>
                    <p className="font-medium text-sm leading-relaxed">{clinicalProfile.relevantHistory}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </SectionCard>
      )}
    </>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  record: PatientLiveRecord;
  patientId?: string;
  canEditDemographics?: boolean;
  canAddGuardian?: boolean;
  canAddEmergencyContact?: boolean;
  canManageConsent?: boolean;
  /** "compact" — renderiza cada subsección como bloque ligero con divisor, agrupado por temas. Para "Datos del paciente". */
  variant?: "default" | "compact";
}

// ── Componente principal ───────────────────────────────────────────────────────

export function PatientFVOSectionsClient({
  record,
  patientId = "",
  canEditDemographics = false,
  canAddGuardian = false,
  canAddEmergencyContact = false,
  canManageConsent = false,
  variant = "default",
}: Props) {
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

  // ── Estado: Datos personales ─────────────────────────────────────────────────
  const [editDemographics, setEditDemographics] = useState(false);
  const [demoForm, setDemoForm] = useState({
    dateOfBirth: "", sex: "", bloodType: "", occupation: "", maritalStatus: "", curp: "",
  });
  const [demoPending, startDemoTx] = useTransition();
  const [demoError, setDemoError] = useState<string | null>(null);

  // ── Estado: Domicilio ────────────────────────────────────────────────────────
  const [editAddress, setEditAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    street: "", extNumber: "", intNumber: "", neighborhood: "",
    municipality: "", state: "", postalCode: "", country: "MX",
  });
  const [addrPending, startAddrTx] = useTransition();
  const [addrError, setAddrError] = useState<string | null>(null);

  // ── Estado: Origen comercial ─────────────────────────────────────────────────
  const [editCommercial, setEditCommercial] = useState(false);
  const [commercialForm, setCommercialForm] = useState({
    channel: "", campaign: "", referredBy: "", initialReason: "",
  });
  const [commercialPending, startCommercialTx] = useTransition();
  const [commercialError, setCommercialError] = useState<string | null>(null);

  // ── Estado: Tutor ────────────────────────────────────────────────────────────
  const [addingGuardian, setAddingGuardian] = useState(false);
  const [guardianForm, setGuardianForm] = useState({ name: "", relationship: "", phone: "", email: "" });
  const [guardianPending, startGuardianTx] = useTransition();
  const [guardianError, setGuardianError] = useState<string | null>(null);

  // ── Estado: Contacto de emergencia ───────────────────────────────────────────
  const [addingEmergency, setAddingEmergency] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ name: "", relationship: "", phone: "" });
  const [emergencyPending, startEmergencyTx] = useTransition();
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  // ── Estado: Consentimiento ───────────────────────────────────────────────────
  const [grantingConsent, setGrantingConsent] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [consentMethod, setConsentMethod] = useState("SIGNATURE");
  const [consentVersion, setConsentVersion] = useState("");
  const [consentPending, startConsentTx] = useTransition();
  const [consentError, setConsentError] = useState<string | null>(null);

  // ── Guardia: sin secciones FVO para este actor ────────────────────────────────
  const hasFVO =
    demographics !== undefined ||
    tax !== undefined ||
    canEditDemographics ||
    canAddGuardian ||
    canAddEmergencyContact ||
    canManageConsent;

  if (!hasFVO) return null;

  // ── Handlers: Datos personales ────────────────────────────────────────────────

  function handleEditDemographics() {
    setDemoForm({
      dateOfBirth: demographics?.dateOfBirth ?? "",
      sex: demographics?.sex ?? "",
      bloodType: demographics?.bloodType ?? "",
      occupation: demographics?.occupation ?? "",
      maritalStatus: demographics?.maritalStatus ?? "",
      curp: "",
    });
    setDemoError(null);
    setEditDemographics(true);
  }

  function handleSaveDemographics() {
    setDemoError(null);
    startDemoTx(async () => {
      const result = await upsertDemographicsAction(patientId, {
        dateOfBirth: demoForm.dateOfBirth || null,
        sex: demoForm.sex || null,
        bloodType: demoForm.bloodType || null,
        occupation: demoForm.occupation || null,
        maritalStatus: demoForm.maritalStatus || null,
        curp: demoForm.curp.trim().toUpperCase() || null,
      });
      if (!result.ok) setDemoError(result.error);
      else setEditDemographics(false);
    });
  }

  // ── Handlers: Domicilio ───────────────────────────────────────────────────────

  function handleEditAddress() {
    setAddrForm({
      street: address?.street ?? "",
      extNumber: address?.extNumber ?? "",
      intNumber: address?.intNumber ?? "",
      neighborhood: address?.neighborhood ?? "",
      municipality: address?.municipality ?? "",
      state: address?.state ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? "MX",
    });
    setAddrError(null);
    setEditAddress(true);
  }

  function handleSaveAddress() {
    setAddrError(null);
    startAddrTx(async () => {
      const result = await upsertAddressAction(patientId, {
        street: addrForm.street || null,
        extNumber: addrForm.extNumber || null,
        intNumber: addrForm.intNumber || null,
        neighborhood: addrForm.neighborhood || null,
        municipality: addrForm.municipality || null,
        state: addrForm.state || null,
        postalCode: addrForm.postalCode || null,
        country: addrForm.country || "MX",
      });
      if (!result.ok) setAddrError(result.error);
      else setEditAddress(false);
    });
  }

  // ── Handlers: Origen comercial ────────────────────────────────────────────────

  function handleEditCommercial() {
    setCommercialForm({
      channel: commercialOrigin?.channel ?? "",
      campaign: commercialOrigin?.campaign ?? "",
      referredBy: commercialOrigin?.referredBy ?? "",
      initialReason: commercialOrigin?.initialReason ?? "",
    });
    setCommercialError(null);
    setEditCommercial(true);
  }

  function handleSaveCommercial() {
    setCommercialError(null);
    startCommercialTx(async () => {
      const result = await upsertCommercialOriginAction(patientId, {
        channel: commercialForm.channel || null,
        campaign: commercialForm.campaign || null,
        referredBy: commercialForm.referredBy || null,
        initialReason: commercialForm.initialReason || null,
      });
      if (!result.ok) setCommercialError(result.error);
      else setEditCommercial(false);
    });
  }

  // ── Handlers: Tutor ───────────────────────────────────────────────────────────

  function handleOpenAddGuardian() {
    setGuardianForm({ name: "", relationship: "", phone: "", email: "" });
    setGuardianError(null);
    setAddingGuardian(true);
  }

  function handleSaveGuardian() {
    setGuardianError(null);
    startGuardianTx(async () => {
      const result = await addGuardianAction(patientId, {
        name: guardianForm.name || null,
        relationship: guardianForm.relationship || null,
        phone: guardianForm.phone || null,
        email: guardianForm.email || null,
      });
      if (!result.ok) setGuardianError(result.error);
      else {
        setAddingGuardian(false);
        setGuardianForm({ name: "", relationship: "", phone: "", email: "" });
      }
    });
  }

  // ── Handlers: Contacto de emergencia ─────────────────────────────────────────

  function handleOpenAddEmergency() {
    setEmergencyForm({ name: "", relationship: "", phone: "" });
    setEmergencyError(null);
    setAddingEmergency(true);
  }

  function handleSaveEmergency() {
    setEmergencyError(null);
    startEmergencyTx(async () => {
      const result = await addEmergencyContactAction(patientId, {
        name: emergencyForm.name || null,
        relationship: emergencyForm.relationship || null,
        phone: emergencyForm.phone || null,
      });
      if (!result.ok) setEmergencyError(result.error);
      else {
        setAddingEmergency(false);
        setEmergencyForm({ name: "", relationship: "", phone: "" });
      }
    });
  }

  // ── Handlers: Consentimiento ──────────────────────────────────────────────────

  function handleOpenGrantConsent() {
    setConsentMethod("SIGNATURE");
    setConsentVersion("");
    setConsentError(null);
    setGrantingConsent(true);
  }

  function handleSaveConsent() {
    setConsentError(null);
    startConsentTx(async () => {
      const result = await grantConsentAction(patientId, {
        consentType: "DATA_TREATMENT",
        method: consentMethod,
        version: consentVersion || null,
      });
      if (!result.ok) setConsentError(result.error);
      else {
        setGrantingConsent(false);
        setConsentMethod("SIGNATURE");
        setConsentVersion("");
      }
    });
  }

  function handleOpenRevokeConsent() {
    setConsentError(null);
    setShowRevokeConfirm(true);
  }

  function handleConfirmRevoke() {
    setConsentError(null);
    startConsentTx(async () => {
      const result = await revokeConsentAction(patientId, { consentType: "DATA_TREATMENT" });
      if (!result.ok) setConsentError(result.error);
      else setShowRevokeConfirm(false);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Datos personales */}
      {demographics !== undefined && (
        <>
          {variant === "compact" && <GroupLabel>General</GroupLabel>}
          <SectionCard
            title="Datos personales"
            variant={variant}
            headerAction={
              canEditDemographics && !editDemographics ? (
                <Button size="sm" variant="outline" onClick={handleEditDemographics}>
                  Editar
                </Button>
              ) : undefined
            }
          >
          {editDemographics ? (
            <div className="space-y-3">
              <FormRow label="Fecha de nacimiento">
                <Input
                  type="date"
                  value={demoForm.dateOfBirth}
                  onChange={(e) => setDemoForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  disabled={demoPending}
                />
              </FormRow>
              <FormRow label="Sexo">
                <SelectNative
                  value={demoForm.sex}
                  onChange={(v) => setDemoForm((f) => ({ ...f, sex: v }))}
                  disabled={demoPending}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="NB">No binario</option>
                  <option value="O">Otro</option>
                </SelectNative>
              </FormRow>
              <FormRow label="Tipo de sangre">
                <SelectNative
                  value={demoForm.bloodType}
                  onChange={(v) => setDemoForm((f) => ({ ...f, bloodType: v }))}
                  disabled={demoPending}
                >
                  <option value="">— Sin especificar —</option>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "U"].map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </SelectNative>
              </FormRow>
              <FormRow label="Ocupación">
                <>
                  <Input
                    list="occupation-options"
                    value={demoForm.occupation}
                    onChange={(e) => setDemoForm((f) => ({ ...f, occupation: e.target.value }))}
                    disabled={demoPending}
                    placeholder="Selecciona o escribe"
                  />
                  <datalist id="occupation-options">
                    <option value="Contadora" />
                    <option value="Contadora pública" />
                    <option value="Abogada" />
                    <option value="Médico" />
                    <option value="Dentista" />
                    <option value="Comerciante" />
                    <option value="Empresaria" />
                    <option value="Empleada" />
                    <option value="Estudiante" />
                    <option value="Ama de casa" />
                    <option value="Jubilada" />
                    <option value="Otro" />
                  </datalist>
                </>
              </FormRow>
              <FormRow label="Estado civil">
                <SelectNative
                  value={demoForm.maritalStatus}
                  onChange={(v) => setDemoForm((f) => ({ ...f, maritalStatus: v }))}
                  disabled={demoPending}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="SINGLE">Soltero/a</option>
                  <option value="MARRIED">Casado/a</option>
                  <option value="DIVORCED">Divorciado/a</option>
                  <option value="WIDOWED">Viudo/a</option>
                  <option value="OTHER">Otro</option>
                </SelectNative>
              </FormRow>
              <FormRow label="CURP">
                <Input
                  value={demoForm.curp}
                  onChange={(e) => setDemoForm((f) => ({ ...f, curp: e.target.value.toUpperCase() }))}
                  disabled={demoPending}
                  placeholder="18 caracteres — formato SEP"
                  maxLength={18}
                  className="font-mono uppercase"
                />
              </FormRow>
              <InlineError msg={demoError} />
              <FormActions
                onSave={handleSaveDemographics}
                onCancel={() => { setEditDemographics(false); setDemoError(null); }}
                pending={demoPending}
              />
            </div>
          ) : (
            <>
              <Row label="Fecha de nacimiento" value={demographics.dateOfBirth ? fDate(demographics.dateOfBirth) : "—"} />
              <Row label="Edad" value={demographics.age != null ? `${demographics.age} años` : "—"} />
              <Row label="Sexo" value={demographics.sex ? (SEX_LABELS[demographics.sex] ?? demographics.sex) : "—"} />
              <Row label="Tipo de sangre" value={demographics.bloodType} />
              <Row label="Ocupación" value={demographics.occupation} />
              <Row label="Estado civil" value={demographics.maritalStatus ? (MARITAL_LABELS[demographics.maritalStatus] ?? demographics.maritalStatus) : "—"} />
            </>
          )}
          </SectionCard>
        </>
      )}

      {/* Domicilio */}
      {(address != null || canEditDemographics) && (
        <>
          {variant === "compact" && <GroupLabel>Domicilio</GroupLabel>}
          <SectionCard
            title="Domicilio"
            variant={variant}
            headerAction={
              canEditDemographics && !editAddress ? (
                <Button size="sm" variant="outline" onClick={handleEditAddress}>
                  {address ? "Editar" : "Agregar"}
                </Button>
              ) : undefined
            }
          >
          {editAddress ? (
            <div className="space-y-3">
              <FormRow label="Calle">
                <Input
                  value={addrForm.street}
                  onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))}
                  disabled={addrPending}
                  placeholder="Nombre de la calle"
                />
              </FormRow>
              <FormRow label="Número ext.">
                <Input
                  value={addrForm.extNumber}
                  onChange={(e) => setAddrForm((f) => ({ ...f, extNumber: e.target.value }))}
                  disabled={addrPending}
                  placeholder="Ej. 123"
                />
              </FormRow>
              <FormRow label="Número int.">
                <Input
                  value={addrForm.intNumber}
                  onChange={(e) => setAddrForm((f) => ({ ...f, intNumber: e.target.value }))}
                  disabled={addrPending}
                  placeholder="Ej. B-4 (opcional)"
                />
              </FormRow>
              <FormRow label="Colonia">
                <Input
                  value={addrForm.neighborhood}
                  onChange={(e) => setAddrForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  disabled={addrPending}
                />
              </FormRow>
              <FormRow label="Municipio / Alcaldía">
                <Input
                  value={addrForm.municipality}
                  onChange={(e) => setAddrForm((f) => ({ ...f, municipality: e.target.value }))}
                  disabled={addrPending}
                />
              </FormRow>
              <FormRow label="Estado">
                <Input
                  value={addrForm.state}
                  onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))}
                  disabled={addrPending}
                  placeholder="Ej. Ciudad de México"
                />
              </FormRow>
              <FormRow label="Código postal">
                <Input
                  value={addrForm.postalCode}
                  onChange={(e) => setAddrForm((f) => ({ ...f, postalCode: e.target.value }))}
                  disabled={addrPending}
                  placeholder="Ej. 06600"
                />
              </FormRow>
              <FormRow label="País">
                <Input
                  value={addrForm.country}
                  onChange={(e) => setAddrForm((f) => ({ ...f, country: e.target.value }))}
                  disabled={addrPending}
                  placeholder="MX"
                  maxLength={5}
                />
              </FormRow>
              <InlineError msg={addrError} />
              <FormActions
                onSave={handleSaveAddress}
                onCancel={() => { setEditAddress(false); setAddrError(null); }}
                pending={addrPending}
              />
            </div>
          ) : address ? (
            <>
              {(address.street || address.extNumber) && (
                <Row
                  label="Calle y número"
                  value={
                    [address.street, address.extNumber, address.intNumber ? `Int. ${address.intNumber}` : null]
                      .filter(Boolean)
                      .join(" ") || "—"
                  }
                />
              )}
              <Row label="Colonia" value={address.neighborhood} />
              <Row label="Municipio / Alcaldía" value={address.municipality} />
              <Row label="Estado" value={address.state} />
              <Row label="Código postal" value={address.postalCode} />
              <Row label="País" value={address.country} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos de domicilio registrados.</p>
          )}
          </SectionCard>
        </>
      )}

      {/* Tutor / Responsable */}
      {(guardian !== undefined || canAddGuardian) && (
        <>
          {variant === "compact" && <GroupLabel>Responsables y emergencia</GroupLabel>}
          <SectionCard
            title="Tutor / Responsable"
            variant={variant}
            headerAction={
              canAddGuardian && !addingGuardian ? (
                <Button size="sm" variant="outline" onClick={handleOpenAddGuardian}>
                  Agregar tutor
                </Button>
              ) : undefined
            }
          >
          {guardian && (
            <div className="space-y-2 mb-2">
              <Row label="Nombre" value={guardian.name} />
              <Row
                label="Relación"
                value={guardian.relationship ? (RELATIONSHIP_LABELS[guardian.relationship] ?? guardian.relationship) : "—"}
              />
              <Row label="Teléfono" value={guardian.phone} />
              <Row label="Correo" value={guardian.email} />
            </div>
          )}

          {addingGuardian && (
            <div className="space-y-3 border-t pt-3">
              {guardian && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  Los datos anteriores se mantienen en el historial. Agrega los datos actualizados.
                </p>
              )}
              <FormRow label="Nombre">
                <Input
                  value={guardianForm.name}
                  onChange={(e) => setGuardianForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={guardianPending}
                />
              </FormRow>
              <FormRow label="Relación">
                <SelectNative
                  value={guardianForm.relationship}
                  onChange={(v) => setGuardianForm((f) => ({ ...f, relationship: v }))}
                  disabled={guardianPending}
                >
                  <option value="">— Seleccionar —</option>
                  <option value="PARENT">Padre/Madre</option>
                  <option value="SIBLING">Hermano/a</option>
                  <option value="SPOUSE">Cónyuge</option>
                  <option value="OTHER">Otro</option>
                </SelectNative>
              </FormRow>
              <FormRow label="Teléfono">
                <Input
                  type="tel"
                  value={guardianForm.phone}
                  onChange={(e) => setGuardianForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={guardianPending}
                />
              </FormRow>
              <FormRow label="Correo electrónico">
                <Input
                  type="email"
                  value={guardianForm.email}
                  onChange={(e) => setGuardianForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={guardianPending}
                />
              </FormRow>
              <InlineError msg={guardianError} />
              <FormActions
                onSave={handleSaveGuardian}
                onCancel={() => { setAddingGuardian(false); setGuardianError(null); }}
                pending={guardianPending}
              />
            </div>
          )}

          {!guardian && !addingGuardian && (
            <p className="text-sm text-muted-foreground">Sin tutor o responsable registrado.</p>
          )}
          </SectionCard>
        </>
      )}

      {/* Contacto de emergencia */}
      {(emergencyContact !== undefined || canAddEmergencyContact) && (
        <SectionCard
          title="Contacto de emergencia"
          variant={variant}
          headerAction={
            canAddEmergencyContact && !addingEmergency ? (
              <Button size="sm" variant="outline" onClick={handleOpenAddEmergency}>
                Agregar contacto
              </Button>
            ) : undefined
          }
        >
          {emergencyContact && (
            <div className="space-y-2 mb-2">
              <Row label="Nombre" value={emergencyContact.name} />
              <Row label="Relación" value={emergencyContact.relationship} />
              <Row label="Teléfono" value={emergencyContact.phone} />
            </div>
          )}

          {addingEmergency && (
            <div className="space-y-3 border-t pt-3">
              {emergencyContact && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  Los datos anteriores se mantienen en el historial. Agrega los datos actualizados.
                </p>
              )}
              <FormRow label="Nombre">
                <Input
                  value={emergencyForm.name}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={emergencyPending}
                />
              </FormRow>
              <FormRow label="Relación">
                <Input
                  value={emergencyForm.relationship}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, relationship: e.target.value }))}
                  disabled={emergencyPending}
                  placeholder="Ej. Esposo/a, Hermano/a"
                />
              </FormRow>
              <FormRow label="Teléfono">
                <Input
                  type="tel"
                  value={emergencyForm.phone}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={emergencyPending}
                />
              </FormRow>
              <InlineError msg={emergencyError} />
              <FormActions
                onSave={handleSaveEmergency}
                onCancel={() => { setAddingEmergency(false); setEmergencyError(null); }}
                pending={emergencyPending}
              />
            </div>
          )}

          {!emergencyContact && !addingEmergency && (
            <p className="text-sm text-muted-foreground">Sin contacto de emergencia registrado.</p>
          )}
        </SectionCard>
      )}

      {/* Datos fiscales — solo lectura hasta UI-7B */}
      {tax && (
        <>
          {variant === "compact" && <GroupLabel>Fiscal</GroupLabel>}
          <SectionCard title="Datos fiscales" variant={variant}>
            <Row label="RFC" value={tax.rfc ? <span className="font-mono">{tax.rfc}</span> : "—"} />
            <Row label="Razón social" value={tax.legalName} />
            <Row label="Régimen fiscal" value={tax.taxRegime} />
            <Row label="Uso CFDI" value={tax.cfdiUse} />
            <Row label="CP fiscal" value={tax.taxPostalCode} />
          </SectionCard>
        </>
      )}

      {/* Consentimiento de datos */}
      {(consent !== undefined || canManageConsent) && (
        <>
          {variant === "compact" && <GroupLabel>Consentimiento</GroupLabel>}
          <SectionCard title="Consentimiento de datos" variant={variant}>
          {consent && (
            <div className="space-y-2">
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
                  ) : "—"
                }
              />
              <Row label="Fecha" value={fDate(consent.grantedAt)} />
              <Row label="Versión" value={consent.version} />
              <Row
                label="Método"
                value={consent.method ? (METHOD_LABELS[consent.method] ?? consent.method) : "—"}
              />
            </div>
          )}

          {!consent && !grantingConsent && (
            <p className="text-sm text-muted-foreground">Sin consentimiento registrado.</p>
          )}

          {/* Controles de consentimiento */}
          {canManageConsent && (
            <div className="mt-3 space-y-3">
              {/* Botón otorgar: visible cuando no hay consentimiento GRANTED */}
              {!grantingConsent && consent?.status !== "GRANTED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenGrantConsent}
                  disabled={consentPending}
                >
                  Otorgar consentimiento
                </Button>
              )}

              {/* Botón revocar: visible solo cuando el consentimiento está GRANTED */}
              {!showRevokeConfirm && consent?.status === "GRANTED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenRevokeConsent}
                  disabled={consentPending}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  Revocar consentimiento
                </Button>
              )}

              {/* Paso 2: confirmación de revocación (dos pasos para evitar clics accidentales) */}
              {showRevokeConfirm && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    ¿Confirmar revocación del consentimiento?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Revocar el consentimiento de tratamiento de datos es una acción legal registrada y no se puede deshacer automáticamente.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleConfirmRevoke}
                      disabled={consentPending}
                    >
                      {consentPending ? "Revocando…" : "Sí, revocar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowRevokeConfirm(false); setConsentError(null); }}
                      disabled={consentPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulario para otorgar consentimiento */}
              {grantingConsent && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Registrar consentimiento
                  </p>
                  <FormRow label="Método">
                    <SelectNative
                      value={consentMethod}
                      onChange={setConsentMethod}
                      disabled={consentPending}
                    >
                      <option value="SIGNATURE">Firma física</option>
                      <option value="VERBAL">Verbal</option>
                      <option value="DIGITAL">Digital</option>
                      <option value="IMPLICIT">Implícito</option>
                    </SelectNative>
                  </FormRow>
                  <FormRow label="Versión (opcional)">
                    <Input
                      value={consentVersion}
                      onChange={(e) => setConsentVersion(e.target.value)}
                      disabled={consentPending}
                      placeholder="Ej. v1.0"
                    />
                  </FormRow>
                  <FormActions
                    onSave={handleSaveConsent}
                    onCancel={() => { setGrantingConsent(false); setConsentError(null); }}
                    pending={consentPending}
                    saveLabel="Otorgar"
                  />
                </div>
              )}

              <InlineError msg={consentError} />
            </div>
          )}
          </SectionCard>
        </>
      )}

      {/* Origen comercial */}
      {(commercialOrigin != null || canEditDemographics) && (
        <>
          {variant === "compact" && <GroupLabel>Origen</GroupLabel>}
          <SectionCard
            title="Origen comercial"
            variant={variant}
            headerAction={
              canEditDemographics && !editCommercial ? (
                <Button size="sm" variant="outline" onClick={handleEditCommercial}>
                  {commercialOrigin ? "Editar" : "Agregar"}
                </Button>
              ) : undefined
            }
          >
          {editCommercial ? (
            <div className="space-y-3">
              <FormRow label="Canal">
                <SelectNative
                  value={commercialForm.channel}
                  onChange={(v) => setCommercialForm((f) => ({ ...f, channel: v }))}
                  disabled={commercialPending}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="REFERRAL">Referido</option>
                  <option value="WALK_IN">Llegada directa</option>
                  <option value="WEB">Web</option>
                  <option value="OTHER">Otro</option>
                </SelectNative>
              </FormRow>
              <FormRow label="Campaña">
                <Input
                  value={commercialForm.campaign}
                  onChange={(e) => setCommercialForm((f) => ({ ...f, campaign: e.target.value }))}
                  disabled={commercialPending}
                />
              </FormRow>
              <FormRow label="Referido por">
                <Input
                  value={commercialForm.referredBy}
                  onChange={(e) => setCommercialForm((f) => ({ ...f, referredBy: e.target.value }))}
                  disabled={commercialPending}
                />
              </FormRow>
              <FormRow label="Motivo inicial">
                <Input
                  value={commercialForm.initialReason}
                  onChange={(e) => setCommercialForm((f) => ({ ...f, initialReason: e.target.value }))}
                  disabled={commercialPending}
                  placeholder="¿Por qué eligió la clínica?"
                />
              </FormRow>
              <InlineError msg={commercialError} />
              <FormActions
                onSave={handleSaveCommercial}
                onCancel={() => { setEditCommercial(false); setCommercialError(null); }}
                pending={commercialPending}
              />
            </div>
          ) : commercialOrigin ? (
            <>
              <Row
                label="Canal"
                value={commercialOrigin.channel ? (CHANNEL_LABELS[commercialOrigin.channel] ?? commercialOrigin.channel) : "—"}
              />
              <Row label="Campaña" value={commercialOrigin.campaign} />
              <Row label="Referido por" value={commercialOrigin.referredBy} />
              <Row label="Motivo inicial" value={commercialOrigin.initialReason} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin origen comercial registrado.</p>
          )}
          </SectionCard>
        </>
      )}
    </>
  );
}
