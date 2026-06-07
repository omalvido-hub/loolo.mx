// NELZZON — Resolución y enforcement de permisos (servidor).
// REGLA: la resolución membership→roles→permisos usa el CLIENTE DE IDENTIDAD (adminDb),
// porque app_user no puede leer organization_memberships (probado en Fase 1).
// Los DATOS de dominio siguen yendo por el cliente tenant-scoped (RLS). No se mezcla.

import { adminDb } from "../db/admin.js";
import { forTenant } from "../db/tenant.js";
import { can } from "../domain/identity/permissions.js";
import { recordPermissionDenied } from "../domain/audit/record.js";
import { ForbiddenError } from "./session.js";

/**
 * Resuelve el set de claves de permiso de un usuario en una organización.
 * Cruza: membership (de esa org) → membership_roles → roles → role_permissions → permissions.
 */
export async function resolvePermissionKeys(userId: string, organizationId: string): Promise<Set<string>> {
  const member = await adminDb.member.findFirst({
    where: { userId, organizationId },
    include: {
      membershipRoles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  const keys = new Set<string>();
  if (!member) return keys; // sin membresía → sin permisos (fail-closed)
  for (const mr of member.membershipRoles) {
    for (const rp of mr.role.permissions) keys.add(rp.permission.key);
  }
  return keys;
}

/**
 * Exige un permiso en el servidor. Si falta:
 *  - registra permission.denied en audit_logs (hecho de seguridad, no evento)
 *  - lanza ForbiddenError
 */
export async function requirePermission(
  userId: string,
  organizationId: string,
  permissionKey: string,
): Promise<void> {
  const keys = await resolvePermissionKeys(userId, organizationId);
  if (can(keys, permissionKey)) return;

  // Auditar el intento denegado, tenant-scoped (RLS).
  await forTenant(organizationId, async (tx) => {
    const exec = (text: string, params: unknown[]) => tx.$queryRawUnsafe(text, ...params) as Promise<any[]>;
    await recordPermissionDenied(exec, { organizationId, actorUserId: userId, permission: permissionKey });
  });

  throw new ForbiddenError(`Permiso denegado: ${permissionKey}`);
}
