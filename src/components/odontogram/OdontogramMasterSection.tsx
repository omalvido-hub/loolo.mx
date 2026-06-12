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
      <div className="px-3 py-2.5 border-b bg-muted/30">
        <h2 className="font-medium text-base">{title}</h2>
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

/** Hallazgos visibles por default en "Hallazgos activos"; el resto queda bajo "Ver todos los hallazgos". */
const VISIBLE_FINDINGS = 5;

interface Props {
  view: OdontogramMasterView;
  patientId: string;
  activeEncounterId?: string | null;
  canVoid?: boolean;
  canActOnFindings?: boolean;
}

export function OdontogramMasterSection({ view, patientId, activeEncounterId, canVoid, canActOnFindings }: Props) {
  const { teeth, findingsPanel, summary } = view;

  const visibleFindings = findingsPanel.slice(0, VISIBLE_FINDINGS);
  const restFindings = findingsPanel.slice(VISIBLE_FINDINGS);

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

      {/* Diagrama dental a ancho completo (todas las piezas visibles sin scroll
          en desktop), con leyenda colapsada dentro de la misma tarjeta */}
      <SectionCard title="Diagrama dental">
        <div className="overflow-x-auto pb-2">
          <div className="w-max lg:mx-auto">
            <OdontogramChartInteractive
              teeth={teeth}
              patientId={patientId}
              activeEncounterId={activeEncounterId}
              canVoid={canVoid}
              canActOnFindings={canActOnFindings}
            />
          </div>
        </div>

        <details className="mt-3 pt-3 border-t">
          <summary className="cursor-pointer text-sm text-muted-foreground">Ver leyenda</summary>
          <div className="pt-2">
            <OdontogramLegend />
          </div>
        </details>
      </SectionCard>

      {/* Hallazgos activos — debajo del diagrama, ancho completo, máximo VISIBLE_FINDINGS por default */}
      <SectionCard title="Hallazgos activos">
        {findingsPanel.length === 0 ? (
          <OdontogramEmpty />
        ) : (
          <>
            <FindingsPanel findings={visibleFindings} patientId={patientId} title="" />
            {restFindings.length > 0 && (
              <details className="mt-2 pt-2 border-t">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ver todos los hallazgos ({findingsPanel.length})
                </summary>
                <div className="pt-2">
                  <FindingsPanel findings={restFindings} patientId={patientId} title="" />
                </div>
              </details>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
