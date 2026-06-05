"use client";

// Chart dental interactivo. Clic en pieza → selección + panel de detalle lateral.
// Solo lectura: no guarda, no escribe, no server action.
// Mantiene selectedFdi en estado local. Compatible con los datos de OdontogramChart.

import { useState } from "react";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";
import { ToothGlyph } from "./ToothGlyph";
import { ToothDetailPanel } from "./ToothDetailPanel";

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

export function OdontogramChartInteractive({ teeth, patientId }: Props) {
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);

  const byFdi: Record<number, ToothView> = Object.fromEntries(
    teeth.map((t) => [t.fdi, t]),
  );

  const handleToothClick = (fdi: number) => {
    setSelectedFdi((prev) => (prev === fdi ? null : fdi));
  };

  const selectedTooth = selectedFdi !== null ? byFdi[selectedFdi] : null;

  return (
    <div className="flex gap-4 items-start">
      {/* Diagrama dental */}
      <div className="flex-1 min-w-0">
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

        {selectedFdi === null && (
          <p className="text-[11px] text-muted-foreground/60 text-center mt-2.5">
            Toca una pieza para ver sus hallazgos
          </p>
        )}
      </div>

      {/* Panel de detalle — visible cuando hay selección */}
      {selectedFdi !== null && (
        <div className="w-60 shrink-0">
          <ToothDetailPanel
            fdi={selectedFdi}
            status={selectedTooth?.status ?? "PRESENT"}
            findings={selectedTooth?.findings ?? []}
            patientId={patientId}
            onClose={() => setSelectedFdi(null)}
          />
        </div>
      )}
    </div>
  );
}
