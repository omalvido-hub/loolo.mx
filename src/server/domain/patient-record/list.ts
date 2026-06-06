// LOOLO — Listado de pacientes del tenant (UI-1). SOLO LECTURA.
// Requiere patients.view. Exige tenant y actor. Fail-closed.
// RLS (app_user + set_config tenant) garantiza aislamiento multi-tenant.
// No incluye datos clínicos ni financieros — solo campos de identificación mínimos.
// Excluye pacientes ARCHIVED, con archivedAt o con deletedAt.

import { can } from "../identity/permissions.js";
import { recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

export interface PatientListItem {
  id: string;
  contactId: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  state: string;
  createdAt: string;
}

export interface PatientListResult {
  items: PatientListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PatientSearchItem {
  id: string;
  contactId: string;
  fullName: string | null;
  phone: string | null;
}

export async function searchPatients(
  run: TenantRunner,
  ctx: ActorContext,
  query: string,
  limit = 8,
): Promise<Result<PatientSearchItem[]>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId.");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId.");

  if (!can(ctx.permissions, "patients.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patients.view",
        entityType: "patient_search",
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patients.view");
  }

  const q = query.trim();
  if (q.length < 2) return ok([]);

  // Escapar caracteres especiales de LIKE para que sean literales.
  const escaped = q.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const cap = Math.min(limit, 8);

  return run(async (exec): Promise<Result<PatientSearchItem[]>> => {
    const rows: any[] = await exec(
      `SELECT p."id", p."contactId", c."fullName", c."phone"
       FROM "patients" p
       JOIN "contacts" c ON c."id" = p."contactId"
       WHERE p."state" != 'ARCHIVED'
         AND p."archivedAt" IS NULL
         AND p."deletedAt" IS NULL
         AND (
           c."fullName"        ILIKE $1
           OR c."phone"        ILIKE $1
           OR c."phoneNormalized" ILIKE $1
           OR c."email"        ILIKE $1
           OR c."emailNormalized" ILIKE $1
         )
       ORDER BY c."fullName" ASC NULLS LAST
       LIMIT $2`,
      [pattern, cap],
    );

    return ok(rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      fullName: r.fullName ?? null,
      phone: r.phone ?? null,
    })));
  });
}

export async function listPatientsForOrg(
  run: TenantRunner,
  ctx: ActorContext,
  opts: { limit?: number; offset?: number } = {},
): Promise<Result<PatientListResult>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId (fail-closed).");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId (fail-closed).");

  if (!can(ctx.permissions, "patients.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "patients.view",
        entityType: "patient_list",
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: patients.view");
  }

  const limit = Math.min(opts.limit ?? 25, 50);
  const offset = Math.max(opts.offset ?? 0, 0);

  return run(async (exec): Promise<Result<PatientListResult>> => {
    const countRow = (
      await exec(
        `SELECT COUNT(*) as c
         FROM "patients" p
         WHERE p."state" != 'ARCHIVED'
           AND p."archivedAt" IS NULL
           AND p."deletedAt" IS NULL`,
        [],
      )
    )[0];
    const total = Number(countRow?.c ?? 0);

    const rows: any[] = await exec(
      `SELECT p."id", p."contactId", p."status", p."state", p."createdAt",
              c."fullName", c."phone"
       FROM "patients" p
       JOIN "contacts" c ON c."id" = p."contactId"
       WHERE p."state" != 'ARCHIVED'
         AND p."archivedAt" IS NULL
         AND p."deletedAt" IS NULL
       ORDER BY c."fullName" ASC NULLS LAST, p."createdAt" DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const items: PatientListItem[] = rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      fullName: r.fullName ?? null,
      phone: r.phone ?? null,
      status: r.status,
      state: r.state,
      createdAt: r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : new Date(r.createdAt).toISOString(),
    }));

    return ok({ items, total, limit, offset });
  });
}
