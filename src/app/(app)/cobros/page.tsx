import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { getPaymentsOverviewSafeView } from "@/server/domain/billing/billing-views";
import { BillingNoPermission } from "@/components/billing/BillingNoPermission";
import { PaymentsOverviewList } from "@/components/billing/PaymentsOverviewList";

export default async function CobrosPage() {
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
  const run = makeTenantRunner(organizationId);
  const result = await getPaymentsOverviewSafeView(run, ctx);

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cobros</h1>
        <p className="text-sm text-muted-foreground">
          Vista global de los cobros del consultorio, solo lectura.
        </p>
      </div>
      {result.ok ? (
        <PaymentsOverviewList payments={result.value.payments} />
      ) : (
        <BillingNoPermission />
      )}
    </div>
  );
}
