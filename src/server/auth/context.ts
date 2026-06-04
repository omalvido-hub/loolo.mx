// LOOLO — Resolución de ActorContext desde identidad autenticada (7C-A).
// Puente: userId + organizationId (de sesión) → ActorContext para el dominio.
// Usa adminDb (BYPASSRLS) via resolvePermissionKeys para leer la capa RBAC fina.
// Fail-closed: sin membresía → permisos vacíos → el resolver rechaza la operación.

import { resolvePermissionKeys } from "./permissions.js";
import type { ActorContext } from "../domain/identity/authorize.js";

/**
 * Devuelve el ActorContext del usuario autenticado en la organización activa.
 * Sin membresía o sin permisos el set queda vacío; el dominio rechaza fail-closed.
 */
export async function getActorContext(userId: string, organizationId: string): Promise<ActorContext> {
  const permissions = await resolvePermissionKeys(userId, organizationId);
  return { organizationId, userId, permissions };
}
