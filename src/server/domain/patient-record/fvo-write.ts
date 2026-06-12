// NELZZON — Escritura de Ficha Viva Odontológica (FVO-1c). SOLO ESCRITURA.
// Patrón por función: authorize → parseOrThrow → SQL exec → recordAudit → return id.
// Reglas de auditoría (NO NEGOCIABLE):
//   - upsertClinicalProfile: metadata vacía (sin texto clínico libre).
//   - upsertTaxProfile: metadata vacía (sin RFC ni CURP).
//   - createMedicalAlert: metadata con alertType y severity ÚNICAMENTE (sin description).
//   - upsertDemographics: metadata vacía (sin CURP).
// Guardian y emergency_contact son 1:N: solo INSERT, sin update-by-id.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import {
  parseOrThrow,
  UpsertDemographicsZ,
  UpsertAddressZ,
  UpsertPatientInsuranceZ,
  UpsertCommercialOriginZ,
  UpsertClinicalProfileZ,
  CreateMedicalAlertZ,
  UpsertPatientTaxProfileZ,
  AddGuardianZ,
  AddEmergencyContactZ,
  GrantConsentZ,
  RevokeConsentZ,
} from "./fvo-write-schemas.js";

async function audit(
  exec: Exec,
  ctx: ActorContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await recordAudit(exec, {
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    actorType: "USER",
    action,
    entityType,
    entityId,
    metadata,
  });
}

// ── patient_demographics (UPSERT 1:1) ────────────────────────────────────────

export async function upsertDemographics(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ demographicsId: string }> {
  authorize(ctx, "patient.demographics.edit");
  const input = parseOrThrow(UpsertDemographicsZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_demographics"
       ("organizationId","patientId","dateOfBirth","sex","bloodType","occupation","maritalStatus","curp","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT ("patientId") DO UPDATE
       SET "dateOfBirth"   = EXCLUDED."dateOfBirth",
           "sex"           = EXCLUDED."sex",
           "bloodType"     = EXCLUDED."bloodType",
           "occupation"    = EXCLUDED."occupation",
           "maritalStatus" = EXCLUDED."maritalStatus",
           "curp"          = EXCLUDED."curp",
           "updatedAt"     = now()
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.dateOfBirth ?? null, input.sex ?? null, input.bloodType ?? null,
      input.occupation ?? null, input.maritalStatus ?? null, input.curp ?? null,
      userId,
    ],
  ))[0];
  // Metadata vacía: no exponer CURP ni datos personales en audit_logs
  await audit(exec, ctx, "patient.demographics.updated", "patient", patientId, {});
  return { demographicsId: row.id };
}

// ── patient_address (UPSERT 1:1) ─────────────────────────────────────────────

export async function upsertAddress(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ addressId: string }> {
  authorize(ctx, "patient.demographics.edit");
  const input = parseOrThrow(UpsertAddressZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_address"
       ("organizationId","patientId","street","extNumber","intNumber","neighborhood","municipality","state","postalCode","country","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT ("patientId") DO UPDATE
       SET "street"       = EXCLUDED."street",
           "extNumber"    = EXCLUDED."extNumber",
           "intNumber"    = EXCLUDED."intNumber",
           "neighborhood" = EXCLUDED."neighborhood",
           "municipality" = EXCLUDED."municipality",
           "state"        = EXCLUDED."state",
           "postalCode"   = EXCLUDED."postalCode",
           "country"      = EXCLUDED."country",
           "updatedAt"    = now()
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.street ?? null, input.extNumber ?? null, input.intNumber ?? null,
      input.neighborhood ?? null, input.municipality ?? null, input.state ?? null,
      input.postalCode ?? null, input.country ?? null,
      userId,
    ],
  ))[0];
  await audit(exec, ctx, "patient.address.updated", "patient", patientId, {});
  return { addressId: row.id };
}

// ── patient_insurance (UPSERT 1:1) ───────────────────────────────────────────

export async function upsertInsurance(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ insuranceId: string }> {
  authorize(ctx, "patient.demographics.edit");
  const input = parseOrThrow(UpsertPatientInsuranceZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_insurance"
       ("organizationId","patientId","hasInsurance","providerName","policyNumber","policyholderName","planName","validFrom","validUntil","notes","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT ("patientId") DO UPDATE
       SET "hasInsurance"     = EXCLUDED."hasInsurance",
           "providerName"     = EXCLUDED."providerName",
           "policyNumber"     = EXCLUDED."policyNumber",
           "policyholderName" = EXCLUDED."policyholderName",
           "planName"         = EXCLUDED."planName",
           "validFrom"        = EXCLUDED."validFrom",
           "validUntil"       = EXCLUDED."validUntil",
           "notes"            = EXCLUDED."notes",
           "updatedAt"        = now()
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.hasInsurance ?? false,
      input.providerName ?? null, input.policyNumber ?? null,
      input.policyholderName ?? null, input.planName ?? null,
      input.validFrom ?? null, input.validUntil ?? null,
      input.notes ?? null,
      userId,
    ],
  ))[0];
  // Metadata vacía: no exponer número de póliza ni datos de cobertura en audit_logs
  await audit(exec, ctx, "patient.insurance.updated", "patient", patientId, {});
  return { insuranceId: row.id };
}

// ── patient_commercial_origin (UPSERT 1:1) ───────────────────────────────────

export async function upsertCommercialOrigin(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ commercialOriginId: string }> {
  authorize(ctx, "patient.demographics.edit");
  const input = parseOrThrow(UpsertCommercialOriginZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_commercial_origin"
       ("organizationId","patientId","channel","campaign","referredBy","initialReason","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT ("patientId") DO UPDATE
       SET "channel"       = EXCLUDED."channel",
           "campaign"      = EXCLUDED."campaign",
           "referredBy"    = EXCLUDED."referredBy",
           "initialReason" = EXCLUDED."initialReason",
           "updatedAt"     = now()
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.channel ?? null, input.campaign ?? null,
      input.referredBy ?? null, input.initialReason ?? null,
      userId,
    ],
  ))[0];
  await audit(exec, ctx, "patient.commercial_origin.updated", "patient", patientId, {});
  return { commercialOriginId: row.id };
}

// ── patient_clinical_profile (UPSERT 1:1) ────────────────────────────────────

export async function upsertClinicalProfile(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ clinicalProfileId: string }> {
  authorize(ctx, "patient.clinical_profile.edit");
  const input = parseOrThrow(UpsertClinicalProfileZ, raw);
  const { organizationId, userId } = ctx;
  const allergies = input.knownAllergies ?? [];
  const meds      = input.currentMedications ?? [];
  const row = (await exec(
    `INSERT INTO "patient_clinical_profile"
       ("organizationId","patientId","knownAllergies","currentMedications","relevantHistory","safetyNotes","createdBy","updatedBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
     ON CONFLICT ("patientId") DO UPDATE
       SET "knownAllergies"     = EXCLUDED."knownAllergies",
           "currentMedications" = EXCLUDED."currentMedications",
           "relevantHistory"    = EXCLUDED."relevantHistory",
           "safetyNotes"        = EXCLUDED."safetyNotes",
           "updatedBy"          = EXCLUDED."updatedBy",
           "updatedAt"          = now()
     RETURNING "id"`,
    [organizationId, patientId, allergies, meds,
     input.relevantHistory ?? null, input.safetyNotes ?? null, userId],
  ))[0];
  // Metadata vacía: no exponer texto clínico libre en audit_logs (regla NO NEGOCIABLE #5)
  await audit(exec, ctx, "patient.clinical_profile.updated", "patient", patientId, {});
  return { clinicalProfileId: row.id };
}

// ── patient_medical_alert (INSERT 1:N) ───────────────────────────────────────

export async function createMedicalAlert(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ alertId: string }> {
  authorize(ctx, "patient.clinical_profile.edit");
  const input = parseOrThrow(CreateMedicalAlertZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_medical_alert"
       ("organizationId","patientId","alertType","severity","description","active","createdBy")
     VALUES ($1,$2,$3,$4,$5,true,$6)
     RETURNING "id"`,
    [organizationId, patientId, input.alertType, input.severity, input.description, userId],
  ))[0];
  // alertType y severity permitidos en metadata; description NO (texto libre clínico)
  await audit(exec, ctx, "patient.medical_alert.created", "patient_medical_alert", row.id,
    { alertType: input.alertType, severity: input.severity });
  return { alertId: row.id };
}

// ── patient_medical_alert — desactivar (soft-delete via active=false) ─────────

export async function deactivateMedicalAlert(
  exec: Exec,
  ctx: ActorContext,
  alertId: string,
): Promise<void> {
  authorize(ctx, "patient.clinical_profile.edit");
  const { organizationId } = ctx;
  const rows = await exec(
    `UPDATE "patient_medical_alert"
     SET "active"=false, "updatedAt"=now()
     WHERE "id"=$1 AND "organizationId"=$2
     RETURNING "id"`,
    [alertId, organizationId],
  );
  if (rows.length === 0) throw new Error("Alerta médica no encontrada o sin permiso.");
  await audit(exec, ctx, "patient.medical_alert.deactivated", "patient_medical_alert", alertId, {});
}

// ── patient_tax_profile (UPSERT 1:1) ─────────────────────────────────────────

export async function upsertTaxProfile(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ taxProfileId: string }> {
  authorize(ctx, "patient.tax.edit");
  const input = parseOrThrow(UpsertPatientTaxProfileZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_tax_profile"
       ("organizationId","patientId","rfc","legalName","taxRegime","cfdiUse","taxPostalCode","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT ("patientId") DO UPDATE
       SET "rfc"           = EXCLUDED."rfc",
           "legalName"     = EXCLUDED."legalName",
           "taxRegime"     = EXCLUDED."taxRegime",
           "cfdiUse"       = EXCLUDED."cfdiUse",
           "taxPostalCode" = EXCLUDED."taxPostalCode",
           "updatedAt"     = now()
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.rfc ?? null, input.legalName ?? null,
      input.taxRegime ?? null, input.cfdiUse ?? null,
      input.taxPostalCode ?? null, userId,
    ],
  ))[0];
  // Metadata vacía: no exponer RFC ni datos fiscales en audit_logs
  await audit(exec, ctx, "patient.tax_profile.updated", "patient", patientId, {});
  return { taxProfileId: row.id };
}

// ── patient_guardian (INSERT 1:N) ─────────────────────────────────────────────

export async function addGuardian(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ guardianId: string }> {
  authorize(ctx, "patient.guardian.edit");
  const input = parseOrThrow(AddGuardianZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_guardian"
       ("organizationId","patientId","name","relationship","phone","email","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.name ?? null, input.relationship ?? null,
      input.phone ?? null, input.email ?? null,
      userId,
    ],
  ))[0];
  await audit(exec, ctx, "patient.guardian.added", "patient_guardian", row.id, {});
  return { guardianId: row.id };
}

// ── patient_emergency_contact (INSERT 1:N) ────────────────────────────────────

export async function addEmergencyContact(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ contactId: string }> {
  authorize(ctx, "patient.emergency_contact.edit");
  const input = parseOrThrow(AddEmergencyContactZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_emergency_contact"
       ("organizationId","patientId","name","relationship","phone","createdBy")
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING "id"`,
    [
      organizationId, patientId,
      input.name ?? null, input.relationship ?? null,
      input.phone ?? null, userId,
    ],
  ))[0];
  await audit(exec, ctx, "patient.emergency_contact.added", "patient_emergency_contact", row.id, {});
  return { contactId: row.id };
}

// ── patient_data_consent (UPSERT 1:1 por consentType) ────────────────────────

export async function grantConsent(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ consentId: string }> {
  authorize(ctx, "patient.consent.manage");
  const input = parseOrThrow(GrantConsentZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "patient_data_consent"
       ("organizationId","patientId","consentType","status","grantedAt","revokedAt","version","method","grantedByUserId")
     VALUES ($1,$2,$3,'GRANTED',now(),NULL,$4,$5,$6)
     ON CONFLICT ("patientId","consentType") DO UPDATE
       SET "status"         = 'GRANTED',
           "grantedAt"      = now(),
           "revokedAt"      = NULL,
           "version"        = EXCLUDED."version",
           "method"         = EXCLUDED."method",
           "grantedByUserId"= EXCLUDED."grantedByUserId"
     RETURNING "id"`,
    [organizationId, patientId, input.consentType,
     input.version ?? null, input.method, userId],
  ))[0];
  await audit(exec, ctx, "patient.consent.granted", "patient_data_consent", row.id,
    { consentType: input.consentType, method: input.method, version: input.version ?? null });
  return { consentId: row.id };
}

export async function revokeConsent(
  exec: Exec,
  ctx: ActorContext,
  patientId: string,
  raw: unknown,
): Promise<{ consentId: string }> {
  authorize(ctx, "patient.consent.manage");
  const input = parseOrThrow(RevokeConsentZ, raw);
  const { organizationId } = ctx;
  const rows = await exec(
    `UPDATE "patient_data_consent"
     SET "status"='REVOKED', "revokedAt"=now()
     WHERE "patientId"=$1 AND "consentType"=$2 AND "organizationId"=$3
     RETURNING "id"`,
    [patientId, input.consentType, organizationId],
  );
  if (rows.length === 0) throw new Error("Consentimiento no encontrado para revocar.");
  await audit(exec, ctx, "patient.consent.revoked", "patient_data_consent", rows[0].id,
    { consentType: input.consentType });
  return { consentId: rows[0].id };
}
