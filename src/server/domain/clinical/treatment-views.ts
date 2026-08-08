// NELZZON — Proyección segura de planes de tratamiento (UI-5, solo lectura).
// NUNCA devuelve: notes (plan), note (ítem), createdBy, organizationId.
// Exige treatment.view. Fail-closed ante falta de tenant, actor o permiso.
// Audita el acceso SIN contenido clínico.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── DTOs públicos ─────────────────────────────────────────────────────────

export interface TreatmentItemView {
  id: string;
  toothFdi: number | null;
  surface: string | null;
  procedureType: string;
  status: string;
  priority: string;
  sequence: number;
  createdAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  hasQuoteLine: boolean;
  linkedFindingId: string | null;
}

export interface TreatmentPlanView {
  id: string;
  status: string;
  title: string | null;
  createdAt: string;
  proposedAt: string | null;
  acceptedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  canceledAt: string | null;
  items: TreatmentItemView[];
  itemsCount: number;
  liveItemsCount: number;
}

export interface TreatmentPlansPatientView {
  patientId: string;
  plans: TreatmentPlanView[];
  activePlan: TreatmentPlanView | null;
  totalPlans: number;
}

export interface TreatmentPlanOverviewItem {
  id: string;
  status: string;
  title: string | null;
  patientId: string;
  patientName: string;
  itemsCount: number;
  createdAt: string;
}

export interface TreatmentPlansOverviewView {
  plans: TreatmentPlanOverviewItem[];
  totalPlans: number;
}

// ─── getTreatmentPlansSafeView ────────────────────────────────────────────

/**
 * Planes de tratamiento del paciente con sus ítems.
 * Exige treatment.view. Fail-closed si falta tenant, actor o permiso.
 * NUNCA devuelve notes, note, createdBy ni organizationId.
 * Audita el acceso sin contenido clínico.
 */
export async function getTreatmentPlansSafeView(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<TreatmentPlansPatientView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "treatment.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "treatment.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: treatment.view");
  }

  return run(async (exec) => {
    // SELECT explícito — sin notes, sin createdBy, sin organizationId, sin updatedAt.
    const planRows = await exec(
      `SELECT "id","status","title","createdAt","proposedAt","acceptedAt","activatedAt","completedAt","rejectedAt","canceledAt"
       FROM "treatment_plans"
       WHERE "patientId" = $1
       ORDER BY
         CASE "status"
           WHEN 'ACTIVE'    THEN 0
           WHEN 'PROPOSED'  THEN 1
           WHEN 'ACCEPTED'  THEN 2
           WHEN 'DRAFT'     THEN 3
           ELSE 4
         END ASC,
         "createdAt" DESC`,
      [patientId],
    );

    const planIds: string[] = planRows.map((p: any) => p.id);
    let allItems: any[] = [];

    if (planIds.length > 0) {
      // SELECT explícito — sin note, sin createdBy, sin organizationId.
      // linkedFindingId sí se expone (1G-A): es un ID de hallazgo clínico, no
      // contenido sensible, y la UI lo necesita para vincular/evitar duplicados.
      allItems = await exec(
        `SELECT "id","planId","toothFdi","surface","procedureType","status","priority","sequence","createdAt","completedAt","canceledAt","linkedFindingId"
         FROM "treatment_plan_items"
         WHERE "planId" = ANY($1)
         ORDER BY "planId" ASC, "sequence" ASC, "createdAt" ASC`,
        [planIds],
      );
    }

    const itemsByPlan: Record<string, any[]> = {};
    for (const item of allItems) {
      if (!itemsByPlan[item.planId]) itemsByPlan[item.planId] = [];
      itemsByPlan[item.planId].push(item);
    }

    // Ítems ya referenciados por al menos una línea de presupuesto (cualquier
    // estado del presupuesto). Solo se usa para bloquear edición — no expone
    // IDs ni datos del presupuesto.
    const itemIds: string[] = allItems.map((it: any) => it.id);
    const quotedItemIds = new Set<string>();
    if (itemIds.length > 0) {
      const quotedRows = await exec(
        `SELECT DISTINCT "treatmentPlanItemId" FROM "quote_lines" WHERE "treatmentPlanItemId" = ANY($1)`,
        [itemIds],
      );
      for (const row of quotedRows) {
        quotedItemIds.add(row.treatmentPlanItemId);
      }
    }

    const LIVE = new Set(["PROPOSED", "ACCEPTED", "IN_PROGRESS"]);

    const plans: TreatmentPlanView[] = planRows.map((p: any) => {
      const items: TreatmentItemView[] = (itemsByPlan[p.id] ?? []).map((it: any) => ({
        id: it.id,
        toothFdi: it.toothFdi ?? null,
        surface: it.surface ?? null,
        procedureType: it.procedureType,
        status: it.status,
        priority: it.priority,
        sequence: Number(it.sequence),
        createdAt: toIso(it.createdAt) ?? new Date().toISOString(),
        completedAt: toIso(it.completedAt),
        canceledAt: toIso(it.canceledAt),
        hasQuoteLine: quotedItemIds.has(it.id),
        linkedFindingId: it.linkedFindingId ?? null,
      }));

      return {
        id: p.id,
        status: p.status,
        title: p.title ?? null,
        createdAt: toIso(p.createdAt) ?? new Date().toISOString(),
        proposedAt: toIso(p.proposedAt),
        acceptedAt: toIso(p.acceptedAt),
        activatedAt: toIso(p.activatedAt),
        completedAt: toIso(p.completedAt),
        rejectedAt: toIso(p.rejectedAt),
        canceledAt: toIso(p.canceledAt),
        items,
        itemsCount: items.length,
        liveItemsCount: items.filter((it) => LIVE.has(it.status)).length,
      };
    });

    const activePlan = plans.find((p) => p.status === "ACTIVE") ?? null;

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "treatment.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { accessType: "getTreatmentPlansSafeView", count: plans.length },
    });

    return ok<TreatmentPlansPatientView>({
      patientId,
      plans,
      activePlan,
      totalPlans: plans.length,
    });
  });
}

// ─── getTreatmentPlansOverviewSafeView ─────────────────────────────────────

/**
 * Listado global (todo el tenant) de planes de tratamiento, con conteo de ítems.
 * Exige treatment.view. Fail-closed si falta tenant, actor o permiso.
 * NUNCA devuelve notes, note, createdBy ni organizationId.
 * Audita el acceso sin contenido clínico.
 */
export async function getTreatmentPlansOverviewSafeView(
  run: TenantRunner,
  ctx: ActorContext,
  options?: { statuses?: string[]; limit?: number },
): Promise<Result<TreatmentPlansOverviewView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "treatment.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "treatment.view",
        entityType: "organization",
        entityId: ctx.organizationId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: treatment.view");
  }

  const limit = options?.limit ?? 100;

  return run(async (exec) => {
    const statusFilter = options?.statuses?.length ? ` AND tp."status" = ANY($2)` : "";
    const params: unknown[] = [limit];
    if (options?.statuses?.length) params.push(options.statuses);

    // SELECT explícito — sin notes, sin createdBy, sin organizationId.
    const planRows = await exec(
      `SELECT tp."id",tp."status",tp."title",tp."patientId",tp."createdAt",c."fullName" AS "patientName",
              (SELECT COUNT(*) FROM "treatment_plan_items" tpi WHERE tpi."planId" = tp."id") AS "itemsCount"
       FROM "treatment_plans" tp
       JOIN "patients" p ON p."id" = tp."patientId"
       JOIN "contacts" c ON c."id" = p."contactId"
       WHERE TRUE${statusFilter}
       ORDER BY tp."createdAt" DESC
       LIMIT $1`,
      params,
    );

    const plans: TreatmentPlanOverviewItem[] = planRows.map((p: any) => ({
      id: p.id,
      status: p.status,
      title: p.title ?? null,
      patientId: p.patientId,
      patientName: p.patientName ?? "—",
      itemsCount: Number(p.itemsCount),
      createdAt: toIso(p.createdAt) ?? new Date().toISOString(),
    }));

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "treatment.viewed",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: { accessType: "getTreatmentPlansOverviewSafeView", count: plans.length },
    });

    return ok<TreatmentPlansOverviewView>({
      plans,
      totalPlans: plans.length,
    });
  });
}
