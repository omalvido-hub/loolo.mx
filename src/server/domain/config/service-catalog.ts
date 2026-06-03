// LOOLO — Catálogo de Servicios Dentales (Fase 7A). Tenant-scoped (RLS).
// Soft-delete (active=false). Precios en centavos. Auditoría en escritura.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, CreateServiceInputZ, UpdateServiceInputZ } from "./schemas.js";

export class ServiceNotFoundError extends Error {
  constructor(id: string) { super(`Servicio no encontrado: ${id}`); this.name = "ServiceNotFoundError"; }
}
export class DuplicateServiceCodeError extends Error {
  constructor(code: string) { super(`Ya existe un servicio con código '${code}'`); this.name = "DuplicateServiceCodeError"; }
}

export async function createService(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(CreateServiceInputZ, raw);
  const { organizationId, userId } = ctx;
  let row: { id: string };
  try {
    row = (await exec(
      `INSERT INTO "service_catalog"("organizationId","code","name","basePriceCents","defaultDurationMin","suggestedDepositCents","specialty","active")
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING "id"`,
      [organizationId, input.code, input.name, input.basePriceCents, input.defaultDurationMin, input.suggestedDepositCents, input.specialty ?? null],
    ))[0];
  } catch (e: any) {
    if (e?.code === "23505") throw new DuplicateServiceCodeError(input.code);
    throw e;
  }
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "service_catalog.created", entityType: "service_catalog", entityId: row.id,
    metadata: { code: input.code, basePriceCents: input.basePriceCents } });
  return { serviceId: row.id };
}

export async function updateService(exec: Exec, ctx: ActorContext, serviceId: string, raw: unknown) {
  authorize(ctx, "catalog.manage");
  const input = parseOrThrow(UpdateServiceInputZ, raw);
  const { organizationId, userId } = ctx;
  const existing = (await exec(
    `SELECT "id" FROM "service_catalog" WHERE "id"=$1 AND "organizationId"=$2`,
    [serviceId, organizationId],
  ))[0];
  if (!existing) throw new ServiceNotFoundError(serviceId);
  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { updates.push(`"name"=$${i++}`); params.push(input.name); }
  if (input.basePriceCents !== undefined) { updates.push(`"basePriceCents"=$${i++}`); params.push(input.basePriceCents); }
  if (input.defaultDurationMin !== undefined) { updates.push(`"defaultDurationMin"=$${i++}`); params.push(input.defaultDurationMin); }
  if (input.suggestedDepositCents !== undefined) { updates.push(`"suggestedDepositCents"=$${i++}`); params.push(input.suggestedDepositCents); }
  if (input.specialty !== undefined) { updates.push(`"specialty"=$${i++}`); params.push(input.specialty); }
  if (updates.length === 0) return { serviceId };
  updates.push(`"updatedAt"=now()`);
  params.push(serviceId, organizationId);
  await exec(
    `UPDATE "service_catalog" SET ${updates.join(",")} WHERE "id"=$${i++} AND "organizationId"=$${i}`,
    params,
  );
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "service_catalog.updated", entityType: "service_catalog", entityId: serviceId,
    metadata: { fields: Object.keys(input).filter((k) => (input as any)[k] !== undefined) } });
  return { serviceId };
}

export async function deactivateService(exec: Exec, ctx: ActorContext, serviceId: string) {
  authorize(ctx, "catalog.manage");
  const { organizationId, userId } = ctx;
  const res = await exec(
    `UPDATE "service_catalog" SET "active"=false, "updatedAt"=now() WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true`,
    [serviceId, organizationId],
  );
  if (!res.length && !(res as any).rowCount) {
    const exists = (await exec(`SELECT "id" FROM "service_catalog" WHERE "id"=$1 AND "organizationId"=$2`, [serviceId, organizationId]))[0];
    if (!exists) throw new ServiceNotFoundError(serviceId);
  }
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "service_catalog.deactivated", entityType: "service_catalog", entityId: serviceId, metadata: {} });
  return { serviceId };
}

export async function listServices(exec: Exec, ctx: ActorContext, includeInactive = false) {
  authorize(ctx, "config.view");
  const { organizationId } = ctx;
  const rows = await exec(
    includeInactive
      ? `SELECT * FROM "service_catalog" WHERE "organizationId"=$1 ORDER BY "name"`
      : `SELECT * FROM "service_catalog" WHERE "organizationId"=$1 AND "active"=true ORDER BY "name"`,
    [organizationId],
  );
  return rows.map((r: any) => ({
    id: r.id, code: r.code, name: r.name,
    basePriceCents: Number(r.basePriceCents),
    defaultDurationMin: r.defaultDurationMin,
    suggestedDepositCents: Number(r.suggestedDepositCents),
    specialty: r.specialty, active: r.active,
  }));
}
