// Presentacional puro. Sección completa de planes de tratamiento del paciente.
// Muestra el plan activo destacado y el resto de planes debajo.
// Solo lectura. No muta, no registra, no supervisa.

import type { TreatmentPlansPatientView } from "@/server/domain/clinical/treatment-views";
import { TreatmentPlanCard } from "./TreatmentPlanCard";
import { TreatmentEmpty } from "./TreatmentEmpty";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

interface Props {
  view: TreatmentPlansPatientView;
}

export function TreatmentPlansSection({ view }: Props) {
  const { plans, activePlan, totalPlans } = view;
  const otherPlans = plans.filter((p) => p.status !== "ACTIVE");

  const subtitle =
    totalPlans === 0
      ? "Sin planes registrados"
      : activePlan
      ? `Plan activo con ${activePlan.liveItemsCount} ítem${activePlan.liveItemsCount !== 1 ? "s" : ""} vivo${activePlan.liveItemsCount !== 1 ? "s" : ""}`
      : `${totalPlans} plan${totalPlans !== 1 ? "es" : ""} registrado${totalPlans !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-4">
      {/* Cabecera de sección */}
      <div>
        <h2 className="text-lg font-semibold">Planes de tratamiento</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {totalPlans === 0 ? (
        <SectionCard title="Planes de tratamiento">
          <TreatmentEmpty />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {/* Plan activo — destacado */}
          {activePlan && (
            <TreatmentPlanCard plan={activePlan} highlighted />
          )}

          {/* Demás planes */}
          {otherPlans.length > 0 && (
            <div className="space-y-3">
              {otherPlans.length > 0 && !activePlan && null}
              {otherPlans.map((plan) => (
                <TreatmentPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
