// NELZZON — Proyección de solo lectura de configuración financiera por periodo.
// Exige config.view. Fail-closed ante falta de tenant, actor o permiso.
// Si el periodo (año/mes) no tiene fila configurada, devuelve ok(null) —
// nunca inventa una meta o costos fijos.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

export interface FinancePeriodView {
  periodYear: number;
  periodMonth: number;
  monthlyGoalCents: number;
  fixedCostRentCents: number;
  fixedCostPayrollCents: number;
  fixedCostUtilitiesCents: number;
  fixedCostSuppliesCents: number;
  fixedCostTotalCents: number;
}

/** Configuración financiera (meta mensual + costos fijos) del periodo dado. */
export async function getFinancePeriodSafeView(
  run: TenantRunner,
  ctx: ActorContext,
  period: { year: number; month: number },
): Promise<Result<FinancePeriodView | null>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "config.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "config.view",
        entityType: "organization",
        entityId: ctx.organizationId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: config.view");
  }

  return run(async (exec) => {
    const rows = await exec(
      `SELECT "periodYear","periodMonth","monthlyGoalCents","fixedCostRentCents",
              "fixedCostPayrollCents","fixedCostUtilitiesCents","fixedCostSuppliesCents"
       FROM "organization_finance_periods"
       WHERE "periodYear" = $1 AND "periodMonth" = $2
       LIMIT 1`,
      [period.year, period.month],
    );

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "finance_period.viewed",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: { accessType: "getFinancePeriodSafeView", found: rows.length > 0 },
    });

    if (rows.length === 0) return ok(null);

    const r: any = rows[0];
    const rent = Number(r.fixedCostRentCents);
    const payroll = Number(r.fixedCostPayrollCents);
    const utilities = Number(r.fixedCostUtilitiesCents);
    const supplies = Number(r.fixedCostSuppliesCents);

    return ok<FinancePeriodView>({
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      monthlyGoalCents: Number(r.monthlyGoalCents),
      fixedCostRentCents: rent,
      fixedCostPayrollCents: payroll,
      fixedCostUtilitiesCents: utilities,
      fixedCostSuppliesCents: supplies,
      fixedCostTotalCents: rent + payroll + utilities + supplies,
    });
  });
}
