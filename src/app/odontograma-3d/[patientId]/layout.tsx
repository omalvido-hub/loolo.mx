import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { selectOrganization } from "@/server/auth/organization";
import { TenantAccessDenied } from "@/components/shell/TenantAccessDenied";
import { TENANT_HEADER } from "@/lib/tenant";

// El odontograma 3D vive fuera del AppShell compartido (chrome propio, fondo
// oscuro), igual que /dashboard. Este layout replica SOLO la guardia de
// sesión/tenant de (app)/layout.tsx; page.tsx resuelve permisos y datos.
export default async function Odontograma3DLayout({ children }: { children: React.ReactNode }) {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;

  const tenantSlug = (await headers()).get(TENANT_HEADER);
  const tenantMembership = tenantSlug ? memberships.find((m) => m.organization.slug === tenantSlug) : null;
  if (tenantSlug && !tenantMembership) {
    return <TenantAccessDenied tenantSlug={tenantSlug} />;
  }

  const membership = tenantMembership ?? memberships[0];
  if (!membership) redirect("/login");

  const activeOrgId = (session.session as { activeOrganizationId?: string | null })?.activeOrganizationId ?? null;
  if (tenantMembership && activeOrgId !== tenantMembership.organizationId) {
    await selectOrganization(session.user.id, tenantMembership.organizationId);
  } else if (!tenantMembership && !activeOrgId && memberships.length === 1) {
    await selectOrganization(session.user.id, membership.organizationId);
  }

  return <>{children}</>;
}
