// NELZZON — Perfil Fiscal de la Clínica (Fase 7A). SENSIBLE.
// Auditar TODA lectura y escritura. Permiso separado tax_profile.view / tax_profile.manage.
// Una fila por organización. Sin DELETE (el UPDATE reemplaza).

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, UpsertTaxProfileZ } from "./schemas.js";

export async function upsertTaxProfile(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "tax_profile.manage");
  const input = parseOrThrow(UpsertTaxProfileZ, raw);
  const { organizationId, userId } = ctx;
  const rfc = input.rfc.trim().toUpperCase();
  const row = (await exec(
    `INSERT INTO "clinic_tax_profile"("organizationId","rfc","legalName","regimeCode","fiscalZip","fiscalAddress")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT ("organizationId") DO UPDATE
       SET "rfc"=EXCLUDED."rfc", "legalName"=EXCLUDED."legalName",
           "regimeCode"=EXCLUDED."regimeCode", "fiscalZip"=EXCLUDED."fiscalZip",
           "fiscalAddress"=EXCLUDED."fiscalAddress", "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, rfc, input.legalName, input.regimeCode, input.fiscalZip, input.fiscalAddress ?? null],
  ))[0];
  // Auditar escritura de datos fiscales (sin exponer RFC ni datos completos en metadata)
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "tax_profile.written", entityType: "clinic_tax_profile", entityId: row.id,
    metadata: { regimeCode: input.regimeCode } });
  return { profileId: row.id };
}

export async function getTaxProfile(exec: Exec, ctx: ActorContext) {
  authorize(ctx, "tax_profile.view");
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `SELECT "id","rfc","legalName","regimeCode","fiscalZip","fiscalAddress" FROM "clinic_tax_profile" WHERE "organizationId"=$1`,
    [organizationId],
  ))[0];
  // Auditar lectura de datos fiscales
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "tax_profile.read", entityType: "clinic_tax_profile", entityId: row?.id ?? null, metadata: {} });
  if (!row) return null;
  return {
    id: row.id, rfc: row.rfc, legalName: row.legalName,
    regimeCode: row.regimeCode, fiscalZip: row.fiscalZip, fiscalAddress: row.fiscalAddress ?? null,
  };
}
