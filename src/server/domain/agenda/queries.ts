// NELZZON — Consultas de solo lectura de Agenda (UI-2).
// Requiere appointments.view / resources.view. Fail-closed. RLS/multi-tenant.
// NO contiene funciones de escritura. NO importa appointments.ts ni resources.ts.

import { can } from "../identity/permissions.js";
import { recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";

const MAX_RANGE_DAYS = 31;

export interface AppointmentListItem {
  id: string;
  contactId: string | null;
  patientId: string | null;
  displayName: string | null;
  startAt: string;
  endAt: string;
  status: string;
  professionalResourceId: string | null;
  chairResourceId: string | null;
  professionalName: string | null;
  reason: string | null;
}

export interface AppointmentListResult {
  items: AppointmentListItem[];
  total: number;
  from: string;
  to: string;
}

export interface ResourceListItem {
  id: string;
  name: string;
  kind: string;
  active: boolean;
}

export interface ResourceListResult {
  items: ResourceListItem[];
  total: number;
}

/** Devuelve el timestamp UTC que corresponde a 00:00:00 en America/Mexico_City del día dado. */
function mxMidnightUTC(dateStr: string): Date {
  // MX usa CDT (UTC-5) en verano y CST (UTC-6) en invierno.
  // Prueba candidatos entre UTC 4am–8am hasta dar con la medianoche MX exacta.
  for (let h = 4; h <= 8; h++) {
    const pad = h < 10 ? `0${h}` : String(h);
    const candidate = new Date(`${dateStr}T${pad}:00:00Z`);
    const mxStr = candidate.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
    if (mxStr === `${dateStr} 00:00:00`) return candidate;
  }
  return new Date(`${dateStr}T06:00:00Z`); // fallback CST
}

function todayRangeMX(): { from: Date; to: Date } {
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const from = mxMidnightUTC(dateStr);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

function toISO(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

export async function listAppointmentsByRange(
  run: TenantRunner,
  ctx: ActorContext,
  opts: { from?: Date; to?: Date; resourceId?: string } = {},
): Promise<Result<AppointmentListResult>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId (fail-closed).");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId (fail-closed).");

  if (!can(ctx.permissions, "appointments.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "appointments.view",
        entityType: "appointment_list",
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: appointments.view");
  }

  const defaults = todayRangeMX();
  const from = opts.from ?? defaults.from;
  let to = opts.to ?? defaults.to;

  if (from >= to) return fail("INVALID", "from debe ser anterior a to.");

  // Acota a MAX_RANGE_DAYS para no traer todo el histórico.
  const maxTo = new Date(from.getTime() + MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
  if (to > maxTo) to = maxTo;

  return run(async (exec): Promise<Result<AppointmentListResult>> => {
    const params: unknown[] = [from.toISOString(), to.toISOString()];
    const resourceFilter = opts.resourceId
      ? ` AND (a."professionalResourceId" = $3 OR a."chairResourceId" = $3)`
      : "";
    if (opts.resourceId) params.push(opts.resourceId);

    const rows: any[] = await exec(
      `SELECT a."id", a."contactId", a."patientId", a."startAt", a."endAt", a."status",
              a."professionalResourceId", a."chairResourceId", a."reason",
              COALESCE(pc."fullName", c."fullName") AS "displayName",
              r."name" AS "professionalName"
       FROM "appointments" a
       LEFT JOIN "contacts" c ON c."id" = a."contactId"
       LEFT JOIN "patients" pt ON pt."id" = a."patientId"
       LEFT JOIN "contacts" pc ON pc."id" = pt."contactId"
       LEFT JOIN "resources" r ON r."id" = a."professionalResourceId"
       WHERE a."startAt" >= $1 AND a."startAt" < $2${resourceFilter}
       ORDER BY a."startAt" ASC`,
      params,
    );

    const items: AppointmentListItem[] = rows.map((r) => ({
      id: r.id,
      contactId: r.contactId ?? null,
      patientId: r.patientId ?? null,
      displayName: r.displayName ?? null,
      startAt: toISO(r.startAt),
      endAt: toISO(r.endAt),
      status: r.status,
      professionalResourceId: r.professionalResourceId ?? null,
      chairResourceId: r.chairResourceId ?? null,
      professionalName: r.professionalName ?? null,
      reason: r.reason ?? null,
    }));

    return ok({ items, total: items.length, from: from.toISOString(), to: to.toISOString() });
  });
}

export async function listResources(
  run: TenantRunner,
  ctx: ActorContext,
): Promise<Result<ResourceListResult>> {
  if (!ctx.organizationId) return fail("FORBIDDEN", "Falta organizationId (fail-closed).");
  if (!ctx.userId) return fail("FORBIDDEN", "Falta userId (fail-closed).");

  if (!can(ctx.permissions, "resources.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "resources.view",
        entityType: "resource_list",
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: resources.view");
  }

  return run(async (exec): Promise<Result<ResourceListResult>> => {
    const rows: any[] = await exec(
      `SELECT "id", "name", "kind", "active" FROM "resources" ORDER BY "name" ASC`,
      [],
    );

    const items: ResourceListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      active: Boolean(r.active),
    }));

    return ok({ items, total: items.length });
  });
}
