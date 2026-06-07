// LOOLO — Consultas de módulos por organización (Fase 2B-1, lectura). SOLO LECTURA.
// Requiere modules.view. Fail-closed. RLS de organization_modules garantiza aislamiento.

import { can } from "../identity/permissions.js";
import { recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

export interface OrganizationModuleItem {
  moduleKey: string;
  name: string;
  moduleGroup: string;
  moduleType: string;
  enabled: boolean;
  visible: boolean;
  showInMenu: boolean;
  showInDock: boolean;
  dashboardAvailable: boolean;
  labelOverride: string | null;
}

export async function getOrganizationModules(
  run: TenantRunner,
  ctx: ActorContext,
): Promise<Result<OrganizationModuleItem[]>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId.");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId.");

  if (!can(ctx.permissions, "modules.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "modules.view",
        entityType: "organization_module",
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: modules.view");
  }

  return run(async (exec): Promise<Result<OrganizationModuleItem[]>> => {
    const rows: any[] = await exec(
      `SELECT mc."key", COALESCE(om."labelOverride", mc."name") AS "name",
              mc."moduleGroup", mc."moduleType",
              om."enabled", om."visible", om."showInMenu", om."showInDock",
              om."dashboardAvailable", om."labelOverride"
         FROM "organization_modules" om
         JOIN "module_catalog" mc ON mc."id" = om."moduleId"
        ORDER BY om."menuSortOrder" ASC NULLS LAST, mc."name" ASC`,
      [],
    );

    return ok(rows.map((r) => ({
      moduleKey: r.key,
      name: r.name,
      moduleGroup: r.moduleGroup,
      moduleType: r.moduleType,
      enabled: r.enabled,
      visible: r.visible,
      showInMenu: r.showInMenu,
      showInDock: r.showInDock,
      dashboardAvailable: r.dashboardAvailable,
      labelOverride: r.labelOverride ?? null,
    })));
  });
}
