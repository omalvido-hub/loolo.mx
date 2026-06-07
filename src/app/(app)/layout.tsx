import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { selectOrganization } from "@/server/auth/organization";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { hasPermission } from "@/lib/permissions";
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
    <div className="flex min-h-screen">
      <div className="flex flex-col w-64 shrink-0">
        <AppSidebar
          roleKey={roleKey}
          orgName={membership.organization.name}
        />
        <div className="border-r border-t px-3 py-3 bg-sidebar">
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            roleName={roleName}
          />
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        {hasPermission(roleKey, "patients.view") && (
          <header className="flex items-center border-b px-6 py-3 bg-background">
            <GlobalSearch placeholder="Buscar en LOOLO…" className="w-full max-w-md" />
          </header>
        )}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
