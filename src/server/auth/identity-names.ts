// NELZZON — Resolución segura de nombres para mostrar en vistas autorizadas.
// REGLA: usa el CLIENTE DE IDENTIDAD (adminDb, BYPASSRLS) porque app_user no puede
// leer la tabla "users" de Better Auth (ver 0002_rls_policies.sql). Mismo patrón que
// resolvePermissionKeys: la resolución de identidad vive en la capa auth, scoped
// explícitamente por organizationId vía organization_memberships — nunca cruza tenants.
// Resuelve en lote (un solo query), nunca N+1.

import { adminDb } from "../db/admin.js";

/**
 * Resuelve nombre para mostrar de un conjunto de userIds, restringido a quienes
 * son miembros de la organización indicada. Usuarios fuera de esa organización
 * no aparecen en el resultado (anti fuga cross-tenant).
 */
export async function resolveMemberDisplayNames(
  userIds: string[],
  organizationId: string,
): Promise<Map<string, string>> {
  const distinctIds = [...new Set(userIds)];
  const result = new Map<string, string>();
  if (distinctIds.length === 0) return result;

  const members = await adminDb.member.findMany({
    where: { organizationId, userId: { in: distinctIds } },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });

  for (const m of members) {
    const display = m.user.name?.trim() || m.user.email;
    result.set(m.userId, display);
  }
  return result;
}
