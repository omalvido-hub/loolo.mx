import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { selectOrganization } from "@/server/auth/organization";
import { TenantAccessDenied } from "@/components/shell/TenantAccessDenied";
import { TENANT_HEADER } from "@/lib/tenant";

// Sinapsis (Panel principal) vive fuera del AppShell compartido — es la
// única pantalla con chrome propio (fondo oscuro, nav de 6 ítems, núcleo).
// Este layout replica SOLO la guardia de sesión/tenant de (app)/layout.tsx
// (necesaria para el aislamiento multi-tenant por subdominio); el resto de
// resolución de datos (organización activa, permisos) lo hace page.tsx,
// igual que ya hacía el dashboard anterior.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
