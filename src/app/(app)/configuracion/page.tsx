import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { can } from "@/server/domain/identity/permissions";
import { ChangePasswordForm } from "@/components/configuracion/ChangePasswordForm";

export default async function ConfiguracionPage() {
  let organizationId: string;
  let userId: string;

  try {
    const org = await requireOrganization();
    organizationId = org.organizationId;
    userId = org.user.id;
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      redirect("/login");
    }
    throw e;
  }

  const ctx = await getActorContext(userId, organizationId);

  if (!can(ctx.permissions, "settings.view")) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Configuración</h1>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin acceso</p>
          <p className="text-sm mt-2">No tienes permiso para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <ChangePasswordForm />
    </div>
  );
}
