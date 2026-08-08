import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { selectOrganization } from "@/server/auth/organization";
import { AppShell } from "@/components/shell/AppShell";
import { TenantAccessDenied } from "@/components/shell/TenantAccessDenied";
import { ROLES } from "@/server/domain/identity/rbac";
import { TENANT_HEADER } from "@/lib/tenant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;

  // El subdominio (clinicaperez.nelzzon.app) es solo una PISTA de qué
  // organización se espera — nunca decide acceso por sí solo. Si el usuario
  // no es miembro de esa clínica, se le niega el paso aquí mismo, sin usar
  // ninguna otra membresía suya como fallback silencioso.
  const tenantSlug = (await headers()).get(TENANT_HEADER);
  const tenantMembership = tenantSlug
    ? memberships.find((m) => m.organization.slug === tenantSlug)
    : null;
  if (tenantSlug && !tenantMembership) {
    return <TenantAccessDenied tenantSlug={tenantSlug} />;
  }

  // Con subdominio válido, usa esa membresía; si no, la primera del usuario.
  const membership = tenantMembership ?? memberships[0];
  if (!membership) redirect("/login");

  // Si la sesión no tiene organización activa y el usuario tiene exactamente una membresía,
  // auto-seleccionarla. Esto actualiza el registro de sesión en BD antes de que los
  // componentes hijo (páginas) llamen a requireOrganization().
  const activeOrgId =
    (session.session as { activeOrganizationId?: string | null })
      ?.activeOrganizationId ?? null;
  if (tenantMembership && activeOrgId !== tenantMembership.organizationId) {
    await selectOrganization(session.user.id, tenantMembership.organizationId);
  } else if (!tenantMembership && !activeOrgId && memberships.length === 1) {
    await selectOrganization(session.user.id, membership.organizationId);
  }

  const roleKey = membership.membershipRoles[0]?.role?.key ?? "front_desk";
  const roleDef = ROLES.find((r) => r.key === roleKey);
  const roleName = roleDef?.name ?? roleKey;

  return (
    <AppShell
      roleKey={roleKey}
      orgName={membership.organization.name}
      orgLogo={membership.organization.logo}
      orgBrandColor={membership.organization.brandColor}
      userName={session.user.name}
      userEmail={session.user.email}
      roleName={roleName}
    >
      {children}
    </AppShell>
  );
}
