import { ROLES } from "@/server/domain/identity/rbac";

export function hasPermission(roleKey: string, permission: string): boolean {
  const role = ROLES.find((r) => r.key === roleKey);
  return role?.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(
  roleKey: string,
  permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(roleKey, p));
}
