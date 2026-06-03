// LOOLO — Verificación de permisos (lógica pura, testeable sin DB).
// El enforcement REAL ocurre en servidor/dominio (no en UI ni solo middleware).
// La resolución membership→roles→permisos vive en src/server/auth/permissions.ts
// (cliente de identidad). Aquí solo la decisión pura sobre un set ya resuelto.

import type { Result } from "../shared/status.js";
import { ok, fail } from "../shared/status.js";

export type PermissionSet = ReadonlySet<string> | readonly string[];

function has(perms: PermissionSet, key: string): boolean {
  return Array.isArray(perms) ? perms.includes(key) : (perms as ReadonlySet<string>).has(key);
}

/** ¿El set tiene el permiso requerido? */
export function can(perms: PermissionSet, required: string): boolean {
  return has(perms, required);
}

/** Falla cerrado: si no tiene el permiso, devuelve FORBIDDEN (no lanza, el caller decide). */
export function assertCan(perms: PermissionSet, required: string): Result<true> {
  if (!required) return fail("INVALID", "permiso requerido vacío");
  return can(perms, required) ? ok(true) : fail("FORBIDDEN", `Falta el permiso: ${required}`);
}

/** Requiere TODOS los permisos de la lista. */
export function canAll(perms: PermissionSet, required: readonly string[]): boolean {
  return required.every((r) => can(perms, r));
}
