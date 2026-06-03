// LOOLO — Configuracion de modulos por organizacion (Fase 2B-1).
// ENFORCEMENT: cada operacion exige modules.configure (authorize() antes de escribir).
// enableModule/disableModule emiten eventos operativos; visibility_changed solo se audita.
// Guard: un modulo REQUERIDO por la plantilla de la org NO se puede deshabilitar.
// Executor tenant-scoped (RLS).

import { validateEvent } from "../events/schemas.js";
import { recordAudit } from "../audit/record.js";
import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";

async function resolveOrgModule(exec: Exec, organizationId: string, moduleKey: string) {
  const rows = await exec(
    `SELECT om."id", om."moduleId", om."templateId"
       FROM "organization_modules" om
       JOIN "module_catalog" mc ON mc."id" = om."moduleId"
      WHERE om."organizationId"=$1 AND mc."key"=$2`,
    [organizationId, moduleKey],
  );
  return rows[0] ?? null;
}

export async function enableModule(exec: Exec, ctx: ActorContext, moduleKey: string) {
  authorize(ctx, "modules.configure");
  const { organizationId, userId } = ctx;
  const om = await resolveOrgModule(exec, organizationId, moduleKey);
  if (!om) throw new Error(`Modulo no esta en la organizacion: ${moduleKey}`);
  await exec(
    `UPDATE "organization_modules"
       SET "enabled"=true, "customized"=true, "configuredBy"=$2, "configuredAt"=now(), "updatedAt"=now()
     WHERE "id"=$1`,
    [om.id, userId],
  );
  const ev = validateEvent("module.enabled", { moduleKey });
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "module.enabled", entityType: "organization_module", entityId: om.id, metadata: { moduleKey } });
}

export async function disableModule(exec: Exec, ctx: ActorContext, moduleKey: string) {
  authorize(ctx, "modules.configure");
  const { organizationId, userId } = ctx;
  const om = await resolveOrgModule(exec, organizationId, moduleKey);
  if (!om) throw new Error(`Modulo no esta en la organizacion: ${moduleKey}`);

  // GUARD: modulo requerido por la plantilla aplicada NO se puede deshabilitar.
  if (om.templateId) {
    const req = (await exec(
      `SELECT "isRequired" FROM "template_modules" WHERE "templateId"=$1 AND "moduleId"=$2`,
      [om.templateId, om.moduleId],
    ))[0];
    if (req?.isRequired) throw new Error(`Modulo requerido no se puede deshabilitar: ${moduleKey}`);
  }

  await exec(
    `UPDATE "organization_modules"
       SET "enabled"=false, "customized"=true, "configuredBy"=$2, "configuredAt"=now(), "updatedAt"=now()
     WHERE "id"=$1`,
    [om.id, userId],
  );
  const ev = validateEvent("module.disabled", { moduleKey });
  if (!ev.ok) throw new Error(ev.error);
  await exec(`INSERT INTO "events"("organizationId","type","version","payload") VALUES ($1,$2,$3,$4)`,
    [organizationId, ev.event.type, ev.event.version, JSON.stringify(ev.event.payload)]);
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "module.disabled", entityType: "organization_module", entityId: om.id, metadata: { moduleKey } });
}

export interface VisibilityPatch {
  visible?: boolean;
  showInMenu?: boolean;
  showInDock?: boolean;
  dashboardAvailable?: boolean;
  menuSortOrder?: number | null;
  dockSortOrder?: number | null;
  dashboardSortOrder?: number | null;
  labelOverride?: string | null;
}

export async function updateOrganizationModuleVisibility(
  exec: Exec, ctx: ActorContext, moduleKey: string, patch: VisibilityPatch,
) {
  authorize(ctx, "modules.configure");
  const { organizationId, userId } = ctx;
  const om = await resolveOrgModule(exec, organizationId, moduleKey);
  if (!om) throw new Error(`Modulo no esta en la organizacion: ${moduleKey}`);

  const cols: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  const set = (col: string, val: unknown) => { cols.push(`"${col}"=$${i++}`); vals.push(val); };
  if (patch.visible !== undefined) set("visible", patch.visible);
  if (patch.showInMenu !== undefined) set("showInMenu", patch.showInMenu);
  if (patch.showInDock !== undefined) set("showInDock", patch.showInDock);
  if (patch.dashboardAvailable !== undefined) set("dashboardAvailable", patch.dashboardAvailable);
  if (patch.menuSortOrder !== undefined) set("menuSortOrder", patch.menuSortOrder);
  if (patch.dockSortOrder !== undefined) set("dockSortOrder", patch.dockSortOrder);
  if (patch.dashboardSortOrder !== undefined) set("dashboardSortOrder", patch.dashboardSortOrder);
  if (patch.labelOverride !== undefined) set("labelOverride", patch.labelOverride);
  if (cols.length === 0) return;

  vals.push(userId); const userIdx = i++;
  vals.push(om.id); const idIdx = i;
  await exec(
    `UPDATE "organization_modules"
       SET ${cols.join(", ")}, "customized"=true, "configuredBy"=$${userIdx}, "configuredAt"=now(), "updatedAt"=now()
     WHERE "id"=$${idIdx}`,
    vals,
  );

  // visibility_changed: hecho de CONFIGURACION -> solo auditoria, NO evento operativo.
  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: "module.visibility_changed", entityType: "organization_module", entityId: om.id, metadata: { moduleKey, patch } });
}
