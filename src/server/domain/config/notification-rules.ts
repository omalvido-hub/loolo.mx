// LOOLO — Reglas de Notificaciones (Fase 7A). Define reglas; NO envía mensajes.
// Upsert por (org, eventKey, channel). maxPerDay y quietHours son parámetros anti-spam.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, UpsertNotificationRuleZ } from "./schemas.js";

export async function upsertNotificationRule(exec: Exec, ctx: ActorContext, raw: unknown) {
  authorize(ctx, "config.manage");
  const input = parseOrThrow(UpsertNotificationRuleZ, raw);
  const { organizationId, userId } = ctx;
  const row = (await exec(
    `INSERT INTO "notification_rule"("organizationId","eventKey","channel","enabled","maxPerDay","quietStart","quietEnd","requiresOptin")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT ("organizationId","eventKey","channel") DO UPDATE
       SET "enabled"=EXCLUDED."enabled", "maxPerDay"=EXCLUDED."maxPerDay",
           "quietStart"=EXCLUDED."quietStart", "quietEnd"=EXCLUDED."quietEnd",
           "requiresOptin"=EXCLUDED."requiresOptin", "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, input.eventKey, input.channel, input.enabled, input.maxPerDay,
     input.quietStart ?? null, input.quietEnd ?? null, input.requiresOptin],
  ))[0];
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "notification_rule.upserted", entityType: "notification_rule", entityId: row.id,
    metadata: { eventKey: input.eventKey, channel: input.channel, enabled: input.enabled } });
  return { ruleId: row.id };
}

export async function listNotificationRules(exec: Exec, ctx: ActorContext) {
  authorize(ctx, "config.view");
  const rows = await exec(
    `SELECT "id","eventKey","channel","enabled","maxPerDay","quietStart","quietEnd","requiresOptin"
     FROM "notification_rule" WHERE "organizationId"=$1 ORDER BY "eventKey","channel"`,
    [ctx.organizationId],
  );
  return rows.map((r: any) => ({
    id: r.id, eventKey: r.eventKey, channel: r.channel as string,
    enabled: r.enabled, maxPerDay: r.maxPerDay,
    quietStart: r.quietStart ?? null, quietEnd: r.quietEnd ?? null,
    requiresOptin: r.requiresOptin,
  }));
}
