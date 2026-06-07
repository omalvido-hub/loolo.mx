// NELZZON — Selección segura de organización (servidor).
// La org activa se persiste en la SESIÓN (Better Auth), no en cookie falsificable.
// Antes de fijarla, se valida la membresía con el cliente de identidad (fail-closed).

import { headers } from "next/headers";
import { adminDb } from "../db/admin.js";
import { auth } from "./config.js";
import { assertCanSelectOrganization, decideDefaultOrganization } from "../domain/identity/organizations.js";
import { forTenant } from "../db/tenant.js";
import { recordAudit } from "../domain/audit/record.js";
import { ForbiddenError } from "./session.js";

/** Organizaciones donde el usuario es miembro (vía cliente de identidad). */
export async function listMemberships(userId: string) {
  return adminDb.member.findMany({
    where: { userId },
    include: { organization: true },
  });
}

/** Decide la organización por defecto al iniciar sesión (auto / elegir / ninguna). */
export async function resolveDefaultOrganization(userId: string) {
  const memberships = await listMemberships(userId);
  return decideDefaultOrganization(memberships.map((m: { organizationId: string }) => ({ organizationId: m.organizationId })));
}

/**
 * Selecciona una organización como activa. Valida membresía ANTES de persistir.
 * Bloquea el vector "seleccionar organización ajena por parámetro".
 */
export async function selectOrganization(userId: string, targetOrgId: string): Promise<void> {
  const memberships = await listMemberships(userId);
  const guard = assertCanSelectOrganization(
    memberships.map((m: { organizationId: string }) => ({ organizationId: m.organizationId })),
    targetOrgId,
  );
  if (!guard.ok) throw new ForbiddenError(guard.detail ?? "Organización no permitida");

  // Persistir en la sesión (Better Auth organization plugin).
  await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId: targetOrgId },
  });

  // Auditar la selección (hecho de seguridad).
  await forTenant(targetOrgId, async (tx) => {
    const exec = (text: string, params: unknown[]) => tx.$queryRawUnsafe(text, ...params) as Promise<any[]>;
    await recordAudit(exec, {
      organizationId: targetOrgId, actorUserId: userId, actorType: "USER",
      action: "organization.selected", entityType: "organization", entityId: targetOrgId,
    });
  });
}
