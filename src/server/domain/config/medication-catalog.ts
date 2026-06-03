// LOOLO — Catálogo de Medicamentos (Fase 7A). Tenant-scoped (RLS). Soft-delete.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, CreateMedicationInputZ, UpdateMedicationInputZ } from "./schemas.js";

export class MedicationNotFoundError extends Error {
  constructor(id: string) { super(`Medicamento no encontrado: ${id}`); this.name = "MedicationNotFoundError"; }
}

export async function createMedication(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(CreateMedicationInputZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "medication_catalog"("organizationId","name","presentation","defaultDose","active")
     VALUES ($1,$2,$3,$4,true) RETURNING "id"`,
    [organizationId, input.name, input.presentation ?? null, input.defaultDose ?? null],
  ))[0];
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "medication_catalog.created", entityType: "medication_catalog", entityId: row.id, metadata: { name: input.name } });
  return { medicationId: row.id };
}

export async function updateMedication(exec: Exec, ctx: ActorContext, medicationId: string, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(UpdateMedicationInputZ, raw);
  const { organizationId, userId } = ctx;
  const existing = (await exec(
    `SELECT "id" FROM "medication_catalog" WHERE "id"=$1 AND "organizationId"=$2`,
    [medicationId, organizationId],
  ))[0];
  if (!existing) throw new MedicationNotFoundError(medicationId);
  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { updates.push(`"name"=$${i++}`); params.push(input.name); }
  if (input.presentation !== undefined) { updates.push(`"presentation"=$${i++}`); params.push(input.presentation); }
  if (input.defaultDose !== undefined) { updates.push(`"defaultDose"=$${i++}`); params.push(input.defaultDose); }
  if (updates.length === 0) return { medicationId };
  updates.push(`"updatedAt"=now()`);
  params.push(medicationId, organizationId);
  await exec(
    `UPDATE "medication_catalog" SET ${updates.join(",")} WHERE "id"=$${i++} AND "organizationId"=$${i}`,
    params,
  );
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "medication_catalog.updated", entityType: "medication_catalog", entityId: medicationId, metadata: {} });
  return { medicationId };
}

export async function deactivateMedication(exec: Exec, ctx: ActorContext, medicationId: string) {
  authorize(ctx, "catalog.manage");
  const { organizationId, userId } = ctx;
  const existing = (await exec(`SELECT "id" FROM "medication_catalog" WHERE "id"=$1 AND "organizationId"=$2`, [medicationId, organizationId]))[0];
  if (!existing) throw new MedicationNotFoundError(medicationId);
  await exec(`UPDATE "medication_catalog" SET "active"=false,"updatedAt"=now() WHERE "id"=$1 AND "organizationId"=$2`, [medicationId, organizationId]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "medication_catalog.deactivated", entityType: "medication_catalog", entityId: medicationId, metadata: {} });
  return { medicationId };
}

export async function listMedications(exec: Exec, ctx: ActorContext, includeInactive = false) {
  authorize(ctx, "config.view");
  const rows = await exec(
    includeInactive
      ? `SELECT "id","name","presentation","defaultDose","active" FROM "medication_catalog" WHERE "organizationId"=$1 ORDER BY "name"`
      : `SELECT "id","name","presentation","defaultDose","active" FROM "medication_catalog" WHERE "organizationId"=$1 AND "active"=true ORDER BY "name"`,
    [ctx.organizationId],
  );
  return rows.map((r: any) => ({ id: r.id, name: r.name, presentation: r.presentation, defaultDose: r.defaultDose, active: r.active }));
}
