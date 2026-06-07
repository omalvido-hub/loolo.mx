// NELZZON — Reglas de Presupuesto por clínica (Fase 7A). Una fila por org.
// defaultDepositBps en basis points (10 000 = 100%). validityDays entero positivo.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, UpsertQuoteSettingZ } from "./schemas.js";

export async function upsertQuoteSetting(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "config.manage");
  const input = parseOrThrow(UpsertQuoteSettingZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "quote_setting"("organizationId","validityDays","defaultDepositBps")
     VALUES ($1,$2,$3)
     ON CONFLICT ("organizationId") DO UPDATE
       SET "validityDays"=EXCLUDED."validityDays", "defaultDepositBps"=EXCLUDED."defaultDepositBps", "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, input.validityDays, input.defaultDepositBps],
  ))[0];
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "quote_setting.upserted", entityType: "quote_setting", entityId: row.id, metadata: {} });
  return { settingId: row.id };
}

export async function getQuoteSetting(exec: Exec, ctx: ActorContext) {
  authorize(ctx, "config.view");
  const row = (await exec(
    `SELECT "id","validityDays","defaultDepositBps" FROM "quote_setting" WHERE "organizationId"=$1`,
    [ctx.organizationId],
  ))[0];
  if (!row) return null;
  return { id: row.id, validityDays: row.validityDays, defaultDepositBps: row.defaultDepositBps };
}
