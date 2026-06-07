// NELZZON — Auditoría (trazabilidad de seguridad). APPEND-ONLY.
// Aquí va la metadata RICA y los hechos de seguridad (incl. permission.denied).
// NO va a events (que se mantiene lean y operativo). Regla: no mezclar.

import { z } from "zod";

export const ActorType = z.enum(["USER", "SYSTEM", "AI", "SUPPORT"]);
export type ActorType = z.infer<typeof ActorType>;

// Envelope de auditoría validado. metadata es libre pero la forma base es estricta.
export const AuditEntrySchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  actorUserId: z.string().uuid().nullable().optional(),
  actorType: ActorType.default("USER"),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** Valida y normaliza una entrada de auditoría. Falla cerrado si no valida. */
export function buildAuditEntry(input: unknown): AuditEntry {
  const parsed = AuditEntrySchema.safeParse(input);
  if (!parsed.success) throw new Error("Entrada de auditoría inválida: " + parsed.error.message);
  return parsed.data;
}

export type Exec = (text: string, params: unknown[]) => Promise<any[]>;

/** Inserta una entrada de auditoría (append-only). El executor debe ser tenant-scoped. */
export async function recordAudit(exec: Exec, input: unknown) {
  const e = buildAuditEntry(input);
  const rows = await exec(
    `INSERT INTO "audit_logs"
       ("organizationId","actorUserId","actorType","action","entityType","entityId","metadata","ipAddress")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "id"`,
    [
      e.organizationId ?? null, e.actorUserId ?? null, e.actorType,
      e.action, e.entityType, e.entityId ?? null,
      e.metadata ? JSON.stringify(e.metadata) : null, e.ipAddress ?? null,
    ],
  );
  return rows[0];
}

/** Atajo: registrar un intento denegado por permisos (hecho de SEGURIDAD, no evento). */
export async function recordPermissionDenied(
  exec: Exec,
  args: { organizationId: string; actorUserId?: string | null; permission: string; entityType?: string; entityId?: string | null },
) {
  return recordAudit(exec, {
    organizationId: args.organizationId,
    actorUserId: args.actorUserId ?? null,
    actorType: "USER",
    action: "permission.denied",
    entityType: args.entityType ?? "permission",
    entityId: args.entityId ?? null,
    metadata: { permission: args.permission },
  });
}
