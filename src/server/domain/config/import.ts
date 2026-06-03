// LOOLO — Importación inicial (Fase 7A). Dry-run + Commit + Idempotencia.
// Pacientes: respeta F3A (Contacto → Paciente, dedup E.164). Sin eventos de dominio en 7A.
// Servicios: idempotencia por code (skip si ya existe). Error_report sin datos sensibles.

import { authorize } from "../identity/authorize.js";
import type { Exec, ActorContext } from "../identity/authorize.js";
import { recordAudit } from "../audit/record.js";
import { parseOrThrow, RunImportInputZ, type PatientImportRow, type ServiceImportRow } from "./schemas.js";
import { normalizePhone } from "../contacts/normalize.js";

interface ImportError { row: number; errorType: string; message: string; code?: string; }

// ── Validación / procesamiento de filas ─────────────────────────────

async function processPatientRow(
  exec: Exec, organizationId: string, row: PatientImportRow, rowIdx: number, isDryRun: boolean,
): Promise<{ ok: boolean; error?: ImportError }> {
  const norm = normalizePhone(row.phone, "MX");
  if (!norm) {
    return { ok: false, error: { row: rowIdx, errorType: "INVALID_PHONE", message: "Teléfono inválido o no reconocible como número MX" } };
  }
  if (isDryRun) return { ok: true };

  // Idempotencia: buscar contacto existente por E.164
  const existing = (await exec(
    `SELECT "contactId" FROM "contact_identifiers" WHERE "organizationId"=$1 AND "kind"='PHONE' AND "valueNormalized"=$2`,
    [organizationId, norm],
  ))[0];

  let contactId: string;
  if (existing) {
    contactId = existing.contactId;
  } else {
    // Crear contacto nuevo (identidad primero, patrón F3A)
    const contact = (await exec(
      `INSERT INTO "contacts"("organizationId","fullName","state","primaryChannel","phoneNormalized")
       VALUES ($1,$2,'OK','PHONE',$3) RETURNING "id"`,
      [organizationId, row.fullName ?? null, norm],
    ))[0];
    contactId = contact.id;
    await exec(
      `INSERT INTO "contact_identifiers"("organizationId","contactId","kind","valueNormalized") VALUES ($1,$2,'PHONE',$3)`,
      [organizationId, contactId, norm],
    );
  }

  // Idempotencia: paciente activo existente → skip
  const pat = (await exec(
    `SELECT "id" FROM "patients" WHERE "organizationId"=$1 AND "contactId"=$2 AND "status"='ACTIVE' LIMIT 1`,
    [organizationId, contactId],
  ))[0];
  if (!pat) {
    await exec(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK')`,
      [organizationId, contactId],
    );
  }
  return { ok: true };
}

async function processServiceRow(
  exec: Exec, organizationId: string, row: ServiceImportRow, rowIdx: number, isDryRun: boolean,
): Promise<{ ok: boolean; error?: ImportError }> {
  if (isDryRun) {
    // Solo verificar que no haya conflicto de código en la misma carga
    return { ok: true };
  }
  // Idempotencia: skip si code ya existe para esta org
  const existing = (await exec(
    `SELECT "id" FROM "service_catalog" WHERE "organizationId"=$1 AND "code"=$2`,
    [organizationId, row.code],
  ))[0];
  if (existing) return { ok: true };
  await exec(
    `INSERT INTO "service_catalog"("organizationId","code","name","basePriceCents","defaultDurationMin","suggestedDepositCents","specialty","active")
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
    [organizationId, row.code, row.name, row.basePriceCents, row.defaultDurationMin, row.suggestedDepositCents ?? 0, row.specialty ?? null],
  );
  return { ok: true };
}

// ── Función principal ─────────────────────────────────────────────────

export async function runImport(exec: Exec, ctx: ActorContext, raw: unknown, isDryRun: boolean) {
  authorize(ctx, "import.run");
  const input = parseOrThrow(RunImportInputZ, raw);
  const { organizationId, userId } = ctx;

  const errors: ImportError[] = [];
  let okCount = 0;

  if (input.kind === "PATIENTS") {
    // Validación previa: detectar duplicados internos de teléfono en la misma carga
    const seenPhones = new Set<string>();
    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i] as PatientImportRow;
      const { ok, error } = await processPatientRow(exec, organizationId, r, i + 1, isDryRun);
      if (!ok && error) {
        errors.push(error);
      } else {
        const norm = normalizePhone(r.phone, "MX");
        if (norm && seenPhones.has(norm)) {
          errors.push({ row: i + 1, errorType: "DUPLICATE_IN_BATCH", message: "Teléfono duplicado en la misma carga" });
        } else {
          if (norm) seenPhones.add(norm);
          okCount++;
        }
      }
    }
  } else {
    // SERVICES
    const seenCodes = new Set<string>();
    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i] as ServiceImportRow;
      if (seenCodes.has(r.code)) {
        errors.push({ row: i + 1, errorType: "DUPLICATE_IN_BATCH", message: "Código duplicado en la misma carga", code: r.code });
        continue;
      }
      seenCodes.add(r.code);
      const { ok, error } = await processServiceRow(exec, organizationId, r, i + 1, isDryRun);
      if (!ok && error) errors.push(error);
      else okCount++;
    }
  }

  const total = input.rows.length;
  const errorCount = errors.length;
  const status = isDryRun ? "DRY_RUN_COMPLETE" : "COMMITTED";

  const job = (await exec(
    `INSERT INTO "import_job"("organizationId","kind","status","isDryRun","total","okCount","errorCount","errorReport","createdBy","committedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING "id"`,
    [organizationId, input.kind, status, isDryRun, total, okCount, errorCount,
     JSON.stringify(errors), userId, isDryRun ? null : new Date()],
  ))[0];

  await recordAudit(exec, { organizationId, actorUserId: userId, actorType: "USER",
    action: isDryRun ? "import.dry_run" : "import.committed",
    entityType: "import_job", entityId: job.id,
    metadata: { kind: input.kind, total, okCount, errorCount, isDryRun } });

  return { jobId: job.id, isDryRun, kind: input.kind, total, okCount, errorCount, errors };
}

export async function getImportJob(exec: Exec, ctx: ActorContext, jobId: string) {
  authorize(ctx, "import.run");
  const row = (await exec(
    `SELECT "id","kind","status","isDryRun","total","okCount","errorCount","errorReport","committedAt","createdAt"
     FROM "import_job" WHERE "id"=$1 AND "organizationId"=$2`,
    [jobId, ctx.organizationId],
  ))[0];
  if (!row) return null;
  return {
    id: row.id, kind: row.kind, status: row.status, isDryRun: row.isDryRun,
    total: row.total, okCount: row.okCount, errorCount: row.errorCount,
    errors: row.errorReport as ImportError[], committedAt: row.committedAt, createdAt: row.createdAt,
  };
}
