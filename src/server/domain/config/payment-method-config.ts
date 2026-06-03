// LOOLO — Configuración de Formas de Pago (Fase 7A).
// Solo habilita/deshabilita métodos del enum PaymentMethod existente. No inventa métodos.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, UpsertPaymentMethodConfigZ } from "./schemas.js";

export class InvalidPaymentMethodError extends Error {
  constructor(m: string) { super(m); this.name = "InvalidPaymentMethodError"; }
}

export async function upsertPaymentMethodConfig(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "config.manage");
  const input = parseOrThrow(UpsertPaymentMethodConfigZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "payment_method_config"("organizationId","method","enabled","displayOrder")
     VALUES ($1,$2,$3,$4)
     ON CONFLICT ("organizationId","method") DO UPDATE
       SET "enabled"=EXCLUDED."enabled", "displayOrder"=EXCLUDED."displayOrder", "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, input.method, input.enabled, input.displayOrder],
  ))[0];
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "payment_method_config.upserted", entityType: "payment_method_config", entityId: row.id,
    metadata: { method: input.method, enabled: input.enabled } });
  return { configId: row.id };
}

export async function listPaymentMethodConfigs(exec: Exec, ctx: ActorContext) {
  authorize(ctx, "config.view");
  const rows = await exec(
    `SELECT "id","method","enabled","displayOrder" FROM "payment_method_config"
     WHERE "organizationId"=$1 ORDER BY "displayOrder","method"`,
    [ctx.organizationId],
  );
  return rows.map((r: any) => ({ id: r.id, method: r.method as string, enabled: r.enabled, displayOrder: r.displayOrder }));
}
