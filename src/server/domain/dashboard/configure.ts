// NELZZON — Operaciones de dashboard/preferencias (Fase 2B-2).
// Widgets org: exigen dashboard.configure_org; enable/disable emiten evento + audit;
//   config solo audita (no es evento operativo).
// Preferencia de usuario: exige user_preferences.update; SOLO el mismo userId (RLS lo fuerza);
//   NO emite evento NI audita (personalizacion personal de bajo riesgo).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { validateWidgetConfig, validatePreference } from "./schemas.js";

async function widgetCatalog(exec: Exec, widgetKey: string) {
  const rows = await exec(`SELECT "key","configSchemaKey" FROM "dashboard_widget_catalog" WHERE "key"=$1`, [widgetKey]);
  return rows[0] ?? null;
}

export async function enableOrganizationWidget(exec: Exec, ctx: ActorContext, widgetKey: string) {
  authorize(ctx, "dashboard.configure_org");
  const { organizationId, userId } = ctx;
  if (!(await widgetCatalog(exec, widgetKey))) throw new Error(`Widget no existe en catalogo: ${widgetKey}`);
  const row = (await exec(
    `INSERT INTO "organization_dashboard_widgets"
       ("organizationId","widgetKey","enabled","visible","customized","configuredBy")
     VALUES ($1,$2,true,true,true,$3)
     ON CONFLICT ("organizationId","widgetKey") DO UPDATE SET
       "enabled"=true, "visible"=true, "customized"=true, "configuredBy"=$3, "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, widgetKey, userId],
  ))[0];
  const ev = validateEvent("dashboard.widget_enabled", { widgetKey });
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "dashboard.widget_enabled", entityType: "organization_dashboard_widget", entityId: row.id, metadata: { widgetKey } });
}

export async function disableOrganizationWidget(exec: Exec, ctx: ActorContext, widgetKey: string) {
  authorize(ctx, "dashboard.configure_org");
  const { organizationId, userId } = ctx;
  if (!(await widgetCatalog(exec, widgetKey))) throw new Error(`Widget no existe en catalogo: ${widgetKey}`);
  const row = (await exec(
    `INSERT INTO "organization_dashboard_widgets"
       ("organizationId","widgetKey","enabled","visible","customized","configuredBy")
     VALUES ($1,$2,false,false,true,$3)
     ON CONFLICT ("organizationId","widgetKey") DO UPDATE SET
       "enabled"=false, "customized"=true, "configuredBy"=$3, "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, widgetKey, userId],
  ))[0];
  const ev = validateEvent("dashboard.widget_disabled", { widgetKey });
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "dashboard.widget_disabled", entityType: "organization_dashboard_widget", entityId: row.id, metadata: { widgetKey } });
}

export async function updateOrganizationWidgetConfig(exec: Exec, ctx: ActorContext, widgetKey: string, config: unknown) {
  authorize(ctx, "dashboard.configure_org");
  const { organizationId, userId } = ctx;
  const cat = await widgetCatalog(exec, widgetKey);
  if (!cat) throw new Error(`Widget no existe en catalogo: ${widgetKey}`);

  // Validar configJson por el configSchemaKey del catalogo. Falla cerrado.
  const v = validateWidgetConfig(cat.configSchemaKey, config);
  if (!v.ok) throw new Error(v.error);

  const row = (await exec(
    `INSERT INTO "organization_dashboard_widgets"
       ("organizationId","widgetKey","configJson","customized","configuredBy")
     VALUES ($1,$2,$3,true,$4)
     ON CONFLICT ("organizationId","widgetKey") DO UPDATE SET
       "configJson"=$3, "customized"=true, "configuredBy"=$4, "updatedAt"=now()
     RETURNING "id"`,
    [organizationId, widgetKey, JSON.stringify(v.value), userId],
  ))[0];
  // Cambio de config = solo auditoria, NO evento operativo.
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "dashboard.widget_config_changed", entityType: "organization_dashboard_widget", entityId: row.id, metadata: { widgetKey } });
}

/**
 * Preferencia personal. Exige user_preferences.update. SOLO el mismo userId:
 * la RLS de user_preferences (org + user GUC) lo fuerza; el INSERT usa ctx.userId.
 * NO emite evento NI audita (bajo riesgo). El exec debe venir de forTenant(As)User.
 */
export async function updateUserPreference(exec: Exec, ctx: ActorContext, preferenceKey: string, value: unknown) {
  authorize(ctx, "user_preferences.update");
  const v = validatePreference(preferenceKey, value);
  if (!v.ok) throw new Error(v.error);
  await exec(
    `INSERT INTO "user_preferences"("userId","organizationId","preferenceKey","preferenceValueJson")
     VALUES ($1,$2,$3,$4)
     ON CONFLICT ("userId","organizationId","preferenceKey") DO UPDATE SET
       "preferenceValueJson"=$4, "updatedAt"=now()`,
    [ctx.userId, ctx.organizationId, v.key, JSON.stringify(v.value)],
  );
}
