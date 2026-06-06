// LOOLO — Proyección segura de odontograma (UI-4, solo lectura).
// NUNCA devuelve note ni recordedByUserId ni organizationId ni IDs internos innecesarios.
// Exige odontogram.view. Fail-closed ante falta de tenant, actor o permiso.
// Audita el acceso SIN contenido sensible.

import { can } from "../identity/permissions.js";
import { recordAudit, recordPermissionDenied } from "../audit/record.js";
import type { ActorContext, TenantRunner } from "../identity/authorize.js";
import { ok, fail } from "../shared/status.js";
import type { Result } from "../shared/status.js";
import { resolveOdontogram, groupByTooth } from "./odontogram-resolver.js";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ─── FDI permanentes 11-48 (orden estándar del diagrama dental) ─────────────
const ALL_FDI: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

// Prioridad de toothStatus para determinar el estado dominante por pieza.
const STATUS_PRIORITY: Record<string, number> = {
  EXTRACTED: 6,
  MISSING: 5,
  ABSENT: 4,
  ROOT_ONLY: 3,
  IMPACTED: 2,
  UNERUPTED: 1,
  PRESENT: 0,
};

// ─── DTOs públicos ─────────────────────────────────────────────────────────

export interface FindingPanelItem {
  toothFdi: number;
  surface: string | null;
  findingType: string;
  toothStatus: string;
  lifecycleStatus: string;  // 'ACTIVE' | 'OBSERVATION' | 'TREATED' | 'RESOLVED' | 'CONTROLLED' | 'VOIDED'
  createdAt: string;
  encounterId?: string;
}

export interface ToothView {
  fdi: number;
  quadrant: 1 | 2 | 3 | 4;
  position: number;
  status: string;
  findings: FindingPanelItem[];
}

export interface OdontogramViewSummary {
  findingsCount: number;
  affectedTeethCount: number;
  lastFindingAt: string | null;
}

export interface OdontogramMasterView {
  patientId: string;
  mode: "patient_current";
  teeth: ToothView[];
  findingsPanel: FindingPanelItem[];
  summary: OdontogramViewSummary;
}

export interface OdontogramEncounterView {
  encounterId: string;
  mode: "encounter_snapshot";
  teeth: ToothView[];
  findingsPanel: FindingPanelItem[];
  summary: OdontogramViewSummary;
}

// ─── Helpers internos ─────────────────────────────────────────────────────

type RawFinding = {
  id: string;
  toothFdi: number;
  surface: string | null;
  findingType: string;
  toothStatus: string;
  lifecycleStatus?: string;
  supersedesFindingId: string | null;
  createdAt: Date | string | null;
  encounterId?: string;
};

function buildTeethGrid(activeFindings: RawFinding[]): ToothView[] {
  const byTooth = groupByTooth(activeFindings as any);

  return ALL_FDI.map((fdi) => {
    const q = Math.floor(fdi / 10) as 1 | 2 | 3 | 4;
    const pos = fdi % 10;
    const raw: RawFinding[] = (byTooth[fdi] ?? []) as any;

    const findings: FindingPanelItem[] = raw.map((f) => ({
      toothFdi: f.toothFdi,
      surface: f.surface ?? null,
      findingType: f.findingType,
      toothStatus: f.toothStatus,
      lifecycleStatus: f.lifecycleStatus ?? "ACTIVE",
      createdAt: toIso(f.createdAt) ?? new Date().toISOString(),
      ...(f.encounterId ? { encounterId: f.encounterId } : {}),
    }));

    // Estado dominante = toothStatus de mayor prioridad entre los hallazgos vigentes.
    let status = "PRESENT";
    let maxPriority = -1;
    for (const f of findings) {
      const p = STATUS_PRIORITY[f.toothStatus] ?? 0;
      if (p > maxPriority) { maxPriority = p; status = f.toothStatus; }
    }

    return { fdi, quadrant: q, position: pos, status, findings };
  });
}

function buildSummary(teeth: ToothView[]): OdontogramViewSummary {
  const allFindings = teeth.flatMap((t) => t.findings);
  const affectedFdi = new Set(allFindings.map((f) => f.toothFdi));
  let lastAt: string | null = null;
  for (const f of allFindings) {
    if (!lastAt || f.createdAt > lastAt) lastAt = f.createdAt;
  }
  return {
    findingsCount: allFindings.length,
    affectedTeethCount: affectedFdi.size,
    lastFindingAt: lastAt,
  };
}

// ─── getOdontogramMasterView ──────────────────────────────────────────────

/**
 * Odontograma vigente del paciente (estado global actual).
 * Exige odontogram.view. Fail-closed si falta tenant, actor o permiso.
 * NUNCA devuelve note, recordedByUserId ni organizationId.
 * Incluye encounterId en cada hallazgo para enlazar con la consulta de origen.
 */
export async function getOdontogramMasterView(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
): Promise<Result<OdontogramMasterView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "odontogram.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "odontogram.view",
        entityType: "patient",
        entityId: patientId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: odontogram.view");
  }

  return run(async (exec) => {
    // SELECT explícito — sin note, sin recordedByUserId, sin organizationId, sin lifecycleReason.
    // encounterId incluido (seguro y útil: permite enlazar hallazgo → consulta en la UI).
    const rows = await exec(
      `SELECT "id","toothFdi","surface","findingType","toothStatus","lifecycleStatus","supersedesFindingId","createdAt","encounterId"
       FROM "odontogram_findings"
       WHERE "patientId" = $1
       ORDER BY "createdAt" ASC`,
      [patientId],
    );

    // resolveOdontogram colapsa cadenas de supersesión → solo el extremo vigente.
    // Luego se filtran los VOIDED: un hallazgo anulado no debe aparecer como activo.
    const resolved = resolveOdontogram(rows as any);
    const active = resolved.filter((f: any) => (f.lifecycleStatus ?? "ACTIVE") !== "VOIDED");
    const teeth = buildTeethGrid(active as any);

    const findingsPanel: FindingPanelItem[] = active
      .map((f: any) => ({
        toothFdi: f.toothFdi,
        surface: f.surface ?? null,
        findingType: f.findingType,
        toothStatus: f.toothStatus,
        lifecycleStatus: f.lifecycleStatus ?? "ACTIVE",
        createdAt: toIso(f.createdAt) ?? new Date().toISOString(),
        ...(f.encounterId ? { encounterId: f.encounterId } : {}),
      }))
      .sort((a: FindingPanelItem, b: FindingPanelItem) => a.toothFdi - b.toothFdi);

    const summary = buildSummary(teeth);

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "odontogram.viewed",
      entityType: "patient",
      entityId: patientId,
      metadata: { accessType: "getOdontogramMasterView", count: active.length },
    });

    return ok<OdontogramMasterView>({
      patientId,
      mode: "patient_current",
      teeth,
      findingsPanel,
      summary,
    });
  });
}

// ─── getOdontogramEncounterView ──────────────────────────────────────────

/**
 * Hallazgos registrados en una consulta específica (snapshot de la consulta).
 * Exige odontogram.view. Fail-closed. Anti-IDOR: valida encounterId contra patientId.
 * Aplica resolveOdontogram para filtrar supersesiones intra-consulta.
 * NO mezcla con el estado vigente global del paciente.
 * NUNCA devuelve note, recordedByUserId ni organizationId.
 */
export async function getOdontogramEncounterView(
  run: TenantRunner,
  ctx: ActorContext,
  patientId: string,
  encounterId: string,
): Promise<Result<OdontogramEncounterView>> {
  if (!ctx.organizationId || !ctx.userId) {
    return fail("FORBIDDEN", "Actor o tenant no válido (fail-closed).");
  }

  if (!can(ctx.permissions, "odontogram.view")) {
    await run(async (exec) => {
      await recordPermissionDenied(exec, {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        permission: "odontogram.view",
        entityType: "clinical_encounter",
        entityId: encounterId,
      });
    });
    return fail("FORBIDDEN", "Falta el permiso: odontogram.view");
  }

  return run(async (exec) => {
    // Anti-IDOR: validar que la consulta pertenece al paciente solicitado.
    const encRows = await exec(
      `SELECT "patientId" FROM "clinical_encounters" WHERE "id" = $1`,
      [encounterId],
    );
    if (encRows.length === 0) return fail("NOT_FOUND", "Consulta no encontrada.");
    if (encRows[0].patientId !== patientId) {
      return fail("NOT_FOUND", "La consulta no pertenece al paciente indicado.");
    }

    // SELECT explícito — sin note, sin recordedByUserId, sin organizationId, sin lifecycleReason.
    const rows = await exec(
      `SELECT "id","toothFdi","surface","findingType","toothStatus","lifecycleStatus","supersedesFindingId","createdAt"
       FROM "odontogram_findings"
       WHERE "encounterId" = $1
       ORDER BY "createdAt" ASC`,
      [encounterId],
    );

    // Resolver supersesiones intra-consulta: muestra solo el hallazgo vigente por pieza/superficie.
    // Nota: el encounter view es un snapshot histórico — no filtra VOIDED para preservar la integridad.
    const active = resolveOdontogram(rows as any);
    const teeth = buildTeethGrid(active as any);

    const findingsPanel: FindingPanelItem[] = active
      .map((f: any) => ({
        toothFdi: f.toothFdi,
        surface: f.surface ?? null,
        findingType: f.findingType,
        toothStatus: f.toothStatus,
        lifecycleStatus: f.lifecycleStatus ?? "ACTIVE",
        createdAt: toIso(f.createdAt) ?? new Date().toISOString(),
      }))
      .sort((a: FindingPanelItem, b: FindingPanelItem) => a.toothFdi - b.toothFdi);

    const summary = buildSummary(teeth);

    await recordAudit(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "USER",
      action: "odontogram.viewed",
      entityType: "clinical_encounter",
      entityId: encounterId,
      metadata: { accessType: "getOdontogramEncounterView", patientId, count: active.length },
    });

    return ok<OdontogramEncounterView>({
      encounterId,
      mode: "encounter_snapshot",
      teeth,
      findingsPanel,
      summary,
    });
  });
}
