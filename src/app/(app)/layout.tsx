import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { selectOrganization } from "@/server/auth/organization";
import { AppShell } from "@/components/shell/AppShell";
import { ROLES } from "@/server/domain/identity/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;

  // Usa la primera membresía activa del usuario.
  const membership = memberships[0];
  if (!membership) redirect("/login");

  // Si la sesión no tiene organización activa y el usuario tiene exactamente una membresía,
  // auto-seleccionarla. Esto actualiza el registro de sesión en BD antes de que los
  // componentes hijo (páginas) llamen a requireOrganization().
  const activeOrgId =
    (session.session as { activeOrganizationId?: string | null })
      ?.activeOrganizationId ?? null;
  if (!activeOrgId && memberships.length === 1) {
    await selectOrganization(session.user.id, membership.organizationId);
  }

  const roleKey = membership.membershipRoles[0]?.role?.key ?? "front_desk";
  const roleDef = ROLES.find((r) => r.key === roleKey);
  const roleName = roleDef?.name ?? roleKey;

  return (
    <AppShell
      roleKey={roleKey}
      orgName={membership.organization.name}
      userName={session.user.name}
      userEmail={session.user.email}
      roleName={roleName}
    >
      {children}
    </AppShell>
  );
}
