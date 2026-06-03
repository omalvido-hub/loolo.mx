// LOOLO — Selección de organización (lógica pura del guard).
// Regla central de seguridad: un usuario solo puede operar en organizaciones donde es
// miembro activo. NUNCA debe poder fijar un organization_id arbitrario por URL/cookie/body.
// La persistencia real (session.activeOrganizationId) la hace src/server/auth/organization.ts.

import type { Result } from "../shared/status.js";
import { ok, fail } from "../shared/status.js";

export interface MembershipRef {
  organizationId: string;
}

/** Resultado de decidir la organización por defecto al iniciar sesión. */
export type DefaultOrgDecision =
  | { kind: "none" } // no pertenece a ninguna → estado controlado
  | { kind: "auto"; organizationId: string } // exactamente una → auto-seleccionar
  | { kind: "choose"; organizationIds: string[] }; // varias → requiere elección explícita

export function decideDefaultOrganization(memberships: MembershipRef[]): DefaultOrgDecision {
  if (memberships.length === 0) return { kind: "none" };
  if (memberships.length === 1) return { kind: "auto", organizationId: memberships[0].organizationId };
  return { kind: "choose", organizationIds: memberships.map((m) => m.organizationId) };
}

/**
 * Guard: ¿puede este usuario seleccionar `targetOrgId`?
 * Solo si existe una membresía a esa organización. Si no, FORBIDDEN.
 * Esto cierra el vector de "seleccionar organización ajena por parámetro".
 */
export function assertCanSelectOrganization(
  memberships: MembershipRef[],
  targetOrgId: string,
): Result<{ organizationId: string }> {
  if (!targetOrgId) return fail("INVALID", "organizationId requerido");
  const member = memberships.some((m) => m.organizationId === targetOrgId);
  return member
    ? ok({ organizationId: targetOrgId })
    : fail("FORBIDDEN", "El usuario no es miembro de esa organización");
}
