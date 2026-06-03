import { redirect } from "next/navigation";
import { getSessionWithMemberships } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
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
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
