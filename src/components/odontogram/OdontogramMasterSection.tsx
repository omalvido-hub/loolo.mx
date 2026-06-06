// Presentacional puro. Sección completa del odontograma vigente del paciente.
// Incluye diagrama dental, leyenda y panel de hallazgos activos.
// Solo lectura. No muta, no registra, no supervisa.

import type { OdontogramMasterView } from "@/server/domain/clinical/odontogram-views";
import { OdontogramChartInteractive } from "./OdontogramChartInteractive";
import { OdontogramLegend } from "./OdontogramLegend";
import { FindingsPanel } from "./FindingsPanel";
import { OdontogramEmpty } from "./OdontogramEmpty";

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
  view: OdontogramMasterView;
  patientId: string;
  activeEncounterId?: string | null;
  canVoid?: boolean;
  canActOnFindings?: boolean;
}

export function OdontogramMasterSection({ view, patientId, activeEncounterId, canVoid, canActOnFindings }: Props) {
  const { teeth, findingsPanel, summary } = view;

  return (
    <div className="space-y-4">
      {/* Cabecera de sección */}
      <div>
        <h2 className="text-lg font-semibold">Odontograma vigente</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Estado actual del paciente
          {summary.findingsCount === 0
            ? " · Sin hallazgos registrados"
            : ` · ${summary.findingsCount} hallazgo${summary.findingsCount !== 1 ? "s" : ""} en ${summary.affectedTeethCount} pieza${summary.affectedTeethCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Diagrama dental interactivo */}
      <SectionCard title="Diagrama dental">
        <div className="overflow-x-auto pb-2">
          <div className="w-max mx-auto">
            <OdontogramChartInteractive
              teeth={teeth}
              patientId={patientId}
              activeEncounterId={activeEncounterId}
              canVoid={canVoid}
              canActOnFindings={canActOnFindings}
            />
          </div>
        </div>
      </SectionCard>

      {/* Leyenda */}
      <SectionCard title="Leyenda">
        <OdontogramLegend />
      </SectionCard>

      {/* Panel de hallazgos activos */}
      <SectionCard title="Hallazgos activos">
        {findingsPanel.length === 0 ? (
          <OdontogramEmpty />
        ) : (
          <FindingsPanel findings={findingsPanel} patientId={patientId} />
        )}
      </SectionCard>
    </div>
  );
}
