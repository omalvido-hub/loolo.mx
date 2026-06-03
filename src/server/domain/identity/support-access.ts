// LOOLO — Acceso temporal de soporte.
// support_restricted NO es rol de organización. El acceso se concede como un grant
// justificado, expirable, revocable y auditado. Aquí: estado efectivo (puro) + lifecycle
// sobre un executor genérico (funciona con pg en pruebas y Prisma $queryRaw en producción).

export type SupportGrantStatus = "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED";

export interface SupportGrant {
  id: string;
  organizationId: string;
  status: SupportGrantStatus;
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Estado EFECTIVO: revocado y expirado mandan sobre el estado almacenado.
 * Falla cerrado: cualquier ambigüedad → no usable.
 */
export function effectiveStatus(grant: Pick<SupportGrant, "status" | "expiresAt" | "revokedAt">, now: Date): SupportGrantStatus {
  if (grant.revokedAt) return "REVOKED";
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) return "EXPIRED";
  return grant.status === "PENDING" ? "PENDING" : "ACTIVE";
}

/** El acceso es usable solo si está efectivamente ACTIVE. */
export function isUsable(grant: Pick<SupportGrant, "status" | "expiresAt" | "revokedAt">, now: Date): boolean {
  return effectiveStatus(grant, now) === "ACTIVE";
}

// ── Lifecycle ───────────────────────────────────────────────────────
// Executor: ejecuta SQL parametrizado y devuelve filas. Lo provee el caller
// (pg en pruebas, Prisma en producción), SIEMPRE tenant-scoped.
export type Exec = (text: string, params: unknown[]) => Promise<any[]>;

export interface GrantInput {
  organizationId: string;
  grantedBy: string;
  reason: string;
  expiresAt: Date;
  scope?: string;
}

/** Concede acceso (status ACTIVE). Devuelve la fila creada. Caller debe auditar. */
export async function createSupportGrant(exec: Exec, input: GrantInput) {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error("Acceso de soporte requiere justificación (reason).");
  }
  if (new Date(input.expiresAt).getTime() <= Date.now()) {
    throw new Error("La expiración debe ser futura.");
  }
  const rows = await exec(
    `INSERT INTO "support_access_grants"
       ("organizationId","grantedBy","reason","scope","status","expiresAt")
     VALUES ($1,$2,$3,$4,'ACTIVE',$5)
     RETURNING *`,
    [input.organizationId, input.grantedBy, input.reason, input.scope ?? "read_logs_anonymized", input.expiresAt],
  );
  return rows[0];
}

/** Revoca un acceso. Caller debe auditar. */
export async function revokeSupportGrant(exec: Exec, grantId: string, revokedBy: string) {
  const rows = await exec(
    `UPDATE "support_access_grants"
       SET "status"='REVOKED', "revokedAt"=now(), "revokedBy"=$2, "updatedAt"=now()
     WHERE "id"=$1 AND "revokedAt" IS NULL
     RETURNING *`,
    [grantId, revokedBy],
  );
  return rows[0] ?? null;
}

/** Registra un uso (solo si el grant es usable). Caller debe auditar el uso. */
export async function recordSupportUse(exec: Exec, grantId: string, supportUserId: string, now: Date = new Date()) {
  const rows = await exec(`SELECT * FROM "support_access_grants" WHERE "id"=$1`, [grantId]);
  const grant = rows[0];
  if (!grant) throw new Error("Grant no encontrado.");
  if (!isUsable(grant, now)) throw new Error("Grant no usable (revocado/expirado).");
  const updated = await exec(
    `UPDATE "support_access_grants"
       SET "supportUserId"=$2, "usedAt"=COALESCE("usedAt", now()),
           "useCount"="useCount"+1, "updatedAt"=now()
     WHERE "id"=$1 RETURNING *`,
    [grantId, supportUserId],
  );
  return updated[0];
}
