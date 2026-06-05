"use client";

// Chart dental interactivo. Clic en pieza → selección + panel de detalle lateral.
// Solo lectura: no guarda, no escribe, no server action.
// Mantiene selectedFdi en estado local. Compatible con los datos de OdontogramChart.

import { useState } from "react";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";
import { ToothGlyph } from "./ToothGlyph";
import { ToothDetailPanel } from "./ToothDetailPanel";
import { getToothName } from "./tooth-names";

// Orden de visualización estándar (igual que OdontogramChart):
//   Arco superior: Q1 de 18→11 | Q2 de 21→28
//   Arco inferior: Q4 de 48→41 | Q3 de 31→38
const UPPER: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Capacidad visual del glifo (5 zonas de superficie). Overflow si hay más hallazgos.
const MAX_VISIBLE_FINDINGS = 5;

interface Props {
  teeth: ToothView[];
  patientId: string;
  /** Cuando se provee junto con onToothClick, el componente opera en modo controlado (sin ToothDetailPanel). */
  selectedFdi?: number | null;
  /** Callback de selección. Cuando se provee, suprime el panel de detalle interno. */
  onToothClick?: (fdi: number | null) => void;
}

function Arch({
  fdis,
  byFdi,
  selectedFdi,
  onToothClick,
}: {
  fdis: number[];
  byFdi: Record<number, ToothView>;
  selectedFdi: number | null;
  onToothClick: (fdi: number) => void;
}) {
  return (
    <div className="flex items-end gap-0.5">
      {fdis.map((fdi, idx) => {
        const tooth = byFdi[fdi];
        const isGap = idx === 8;
        const findings = tooth?.findings ?? [];
        const overflowCount = Math.max(0, findings.length - MAX_VISIBLE_FINDINGS);
        return (
          <div key={fdi} className={isGap ? "ml-2" : undefined}>
            <ToothGlyph
              fdi={fdi}
              status={tooth?.status ?? "PRESENT"}
              findings={findings}
              onClick={() => onToothClick(fdi)}
              isSelected={selectedFdi === fdi}
              overflowCount={overflowCount}
            />
          </div>
        );
      })}
    </div>
  );
}

export function OdontogramChartInteractive({
  teeth,
  patientId,
  selectedFdi: externalFdi,
  onToothClick,
}: Props) {
  const isControlled = onToothClick !== undefined;
  const [internalFdi, setInternalFdi] = useState<number | null>(null);
  const selectedFdi = isControlled ? (externalFdi ?? null) : internalFdi;

  const byFdi: Record<number, ToothView> = Object.fromEntries(
    teeth.map((t) => [t.fdi, t]),
  );

  const handleToothClick = (fdi: number) => {
    if (isControlled) {
      onToothClick(selectedFdi === fdi ? null : fdi);
    } else {
      setInternalFdi((prev) => (prev === fdi ? null : fdi));
    }
  };

  const selectedTooth = selectedFdi !== null ? byFdi[selectedFdi] : null;

  return (
    <div className="space-y-4">
      {/* Diagrama dental — siempre completo, nunca comprimido */}
      <div>
        <div className="space-y-0">
          {/* Arco superior */}
          <div className="flex justify-center">
            <Arch
              fdis={UPPER}
              byFdi={byFdi}
              selectedFdi={selectedFdi}
              onToothClick={handleToothClick}
            />
          </div>

          {/* Línea media horizontal */}
          <div className="my-1.5 mx-4 border-t border-dashed border-muted-foreground/25" />

          {/* Arco inferior */}
          <div className="flex justify-center">
            <Arch
              fdis={LOWER}
              byFdi={byFdi}
              selectedFdi={selectedFdi}
              onToothClick={handleToothClick}
            />
          </div>
        </div>

        {selectedFdi === null ? (
          <p className="text-[11px] text-muted-foreground/60 text-center mt-2.5">
            {isControlled ? "Toca una pieza para seleccionarla" : "Toca una pieza para ver sus hallazgos"}
          </p>
        ) : isControlled ? (
          <p className="text-[11px] text-blue-600 text-center mt-2.5 font-medium">
            Pieza {selectedFdi} — {getToothName(selectedFdi!).short} {getToothName(selectedFdi!).quadrant.toLowerCase()}
          </p>
        ) : null}
      </div>

      {/* Panel de detalle — solo en modo autónomo (no controlado) */}
      {!isControlled && selectedFdi !== null && (
        <ToothDetailPanel
          fdi={selectedFdi}
          status={selectedTooth?.status ?? "PRESENT"}
          findings={selectedTooth?.findings ?? []}
          patientId={patientId}
          onClose={() => setInternalFdi(null)}
        />
      )}
    </div>
  );
}
