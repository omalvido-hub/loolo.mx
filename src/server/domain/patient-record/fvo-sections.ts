// LOOLO — Secciones extendidas FVO-1 (Ficha Viva Odontológica). SOLO LECTURA.
// Funciones de lectura pura. Sin escritura, sin auditoría, sin eventos.
// El llamador (resolver.ts) verifica permisos ANTES de invocar estas funciones.
// Reglas: no SELECT *, no datos clínicos en secciones sin permiso clínico.

import type { Exec } from "../identity/authorize.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function toIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

function calcAge(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const dob = new Date(isoDate);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export async function fetchDemographicsSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "dateOfBirth", "sex", "bloodType", "occupation", "maritalStatus"
     FROM "patient_demographics" WHERE "patientId"=$1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  const dob = toIsoDate(row?.dateOfBirth);
  return {
    dateOfBirth: dob,
    age: calcAge(dob),
    sex: row?.sex ?? null,
    bloodType: row?.bloodType ?? null,
    occupation: row?.occupation ?? null,
    maritalStatus: row?.maritalStatus ?? null,
  };
}

export async function fetchAddressSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "street", "extNumber", "intNumber", "neighborhood", "municipality", "state", "postalCode", "country"
     FROM "patient_address" WHERE "patientId"=$1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    street: row.street ?? null,
    extNumber: row.extNumber ?? null,
    intNumber: row.intNumber ?? null,
    neighborhood: row.neighborhood ?? null,
    municipality: row.municipality ?? null,
    state: row.state ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? null,
  };
}

export async function fetchGuardianSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "name", "relationship", "phone", "email"
     FROM "patient_guardian" WHERE "patientId"=$1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    name: row.name ?? null,
    relationship: row.relationship ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
  };
}

export async function fetchEmergencyContactSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "name", "relationship", "phone"
     FROM "patient_emergency_contact" WHERE "patientId"=$1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    name: row.name ?? null,
    relationship: row.relationship ?? null,
    phone: row.phone ?? null,
  };
}

export async function fetchCommercialOriginSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "channel", "campaign", "referredBy", "initialReason"
     FROM "patient_commercial_origin" WHERE "patientId"=$1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    channel: row.channel ?? null,
    campaign: row.campaign ?? null,
    referredBy: row.referredBy ?? null,
    initialReason: row.initialReason ?? null,
  };
}

export async function fetchConsentSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "status", "grantedAt", "version", "method"
     FROM "patient_data_consent" WHERE "patientId"=$1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    status: row.status ?? null,
    grantedAt: toIso(row.grantedAt),
    version: row.version ?? null,
    method: row.method ?? null,
  };
}

// Bandera de alerta médica: solo conteo y severidad máxima.
// Para roles sin patient.clinical_profile.view (ej. front_desk).
// No expone tipo, descripción ni contenido clínico.
export async function fetchMedicalAlertFlag(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "severity" FROM "patient_medical_alert" WHERE "patientId"=$1 AND "active"=true`,
    [patientId],
  );
  const hasActiveAlerts = rows.length > 0;
  const highSeverityCount = rows.filter(
    (r) => r.severity === "HIGH" || r.severity === "CRITICAL",
  ).length;
  return { hasActiveAlerts, highSeverityCount };
}

// Perfil clínico completo: alergias, medicamentos, antecedentes y alertas con detalle.
// Solo para roles con patient.clinical_profile.view.
export async function fetchClinicalProfileSection(exec: Exec, patientId: string) {
  const profileRows = await exec(
    `SELECT "knownAllergies", "currentMedications", "relevantHistory", "safetyNotes"
     FROM "patient_clinical_profile" WHERE "patientId"=$1`,
    [patientId],
  );
  const profile = profileRows[0] ?? null;

  const alertRows = await exec(
    `SELECT "id", "alertType", "severity", "description", "active", "createdAt"
     FROM "patient_medical_alert"
     WHERE "patientId"=$1
     ORDER BY "active" DESC, "severity" DESC, "createdAt" DESC`,
    [patientId],
  );

  return {
    knownAllergies: (profile?.knownAllergies as string[] | null) ?? [],
    currentMedications: (profile?.currentMedications as string[] | null) ?? [],
    relevantHistory: profile?.relevantHistory ?? null,
    safetyNotes: profile?.safetyNotes ?? null,
    medicalAlerts: alertRows.map((r) => ({
      id: r.id as string,
      alertType: r.alertType as string,
      severity: r.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      description: r.description as string,
      active: r.active as boolean,
      createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    })),
  };
}

// Datos fiscales del paciente: RFC, régimen, uso CFDI.
// Solo para roles con patient.tax.view.
export async function fetchTaxSection(exec: Exec, patientId: string) {
  const rows = await exec(
    `SELECT "rfc", "legalName", "taxRegime", "cfdiUse", "taxPostalCode"
     FROM "patient_tax_profile" WHERE "patientId"=$1`,
    [patientId],
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    rfc: row.rfc ?? null,
    legalName: row.legalName ?? null,
    taxRegime: row.taxRegime ?? null,
    cfdiUse: row.cfdiUse ?? null,
    taxPostalCode: row.taxPostalCode ?? null,
  };
}
