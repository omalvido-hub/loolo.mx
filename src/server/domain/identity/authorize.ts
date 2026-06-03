// LOOLO — Gate de autorizacion de dominio.
// authorize() es PURO: si falta el permiso, lanza ANTES de cualquier escritura
// (garantiza "no se modifica nada sin permiso"). NO escribe auditoria aqui:
// si lo hiciera dentro de la transaccion de la operacion, el ROLLBACK por el throw
// revertiria tambien el audit. El audit DURABLE del denegado vive en el LIMITE
// transaccional (guardConfigOperation / requirePermission), en su propia tx que commitea.

import { can } from "./permissions.js";
import type { PermissionSet } from "./permissions.js";
import { recordPermissionDenied } from "../audit/record.js";

export interface ActorContext {
  organizationId: string;
  userId: string;
  permissions: PermissionSet;
}

export class PermissionDeniedError extends Error {
  constructor(public readonly permission: string) {
    super(`Permiso denegado: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

/** Asserta el permiso. Lanza PermissionDeniedError ANTES de escribir si falta. PURO. */
export function authorize(ctx: ActorContext, requiredPermission: string): void {
  if (!can(ctx.permissions, requiredPermission)) {
    throw new PermissionDeniedError(requiredPermission);
  }
}

export type Exec = (text: string, params: unknown[]) => Promise<any[]>;

// Ejecuta `work` dentro de UNA transaccion tenant-scoped y la commitea.
// En produccion: (work) => forTenant(orgId, tx => work(execDeTx)).
export type TenantRunner = <T>(work: (exec: Exec) => Promise<T>) => Promise<T>;

/**
 * Enforcement en el LIMITE transaccional:
 *  - si tiene permiso → ejecuta la operacion en su tx.
 *  - si NO → registra permission.denied en su PROPIA tx (que SI commitea) y lanza.
 * Asi el audit del denegado sobrevive aunque la operacion nunca corra.
 */
export async function guardConfigOperation<T>(
  run: TenantRunner,
  ctx: ActorContext,
  requiredPermission: string,
  work: (exec: Exec) => Promise<T>,
): Promise<T> {
  if (can(ctx.permissions, requiredPermission)) {
    return run(work);
  }
  await run(async (exec) => {
    await recordPermissionDenied(exec, {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      permission: requiredPermission,
    });
  });
  throw new PermissionDeniedError(requiredPermission);
}
