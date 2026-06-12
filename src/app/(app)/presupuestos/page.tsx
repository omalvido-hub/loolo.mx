import { redirect } from "next/navigation";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { getQuotesOverviewSafeView } from "@/server/domain/billing/billing-views";
import { BillingNoPermission } from "@/components/billing/BillingNoPermission";
import { QuotesOverviewList } from "@/components/billing/QuotesOverviewList";

export default async function PresupuestosPage() {
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
  const result = await getQuotesOverviewSafeView(run, ctx);

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Presupuestos</h1>
        <p className="text-sm text-muted-foreground">
          Vista global de los presupuestos del consultorio, solo lectura.
        </p>
      </div>
      {result.ok ? (
        <QuotesOverviewList quotes={result.value.quotes} />
      ) : (
        <BillingNoPermission />
      )}
    </div>
  );
}
