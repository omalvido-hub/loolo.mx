// Presentacional puro. Diagrama dental con 4 cuadrantes FDI 11-48 (dientes permanentes).
// Layout estándar: arco superior e inferior, separados por la línea media.
// El espectador ve la boca del paciente desde el frente (derecha del paciente = izquierda del diagrama).

import type { ToothView } from "@/server/domain/clinical/odontogram-views";
import { ToothGlyph } from "./ToothGlyph";

// Orden de visualización estándar:
//   Arco superior: Q1 de 18→11 | Q2 de 21→28
//   Arco inferior: Q4 de 48→41 | Q3 de 31→38
const UPPER: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

interface Props {
  teeth: ToothView[];
}

function Arch({ fdis, byFdi }: { fdis: number[]; byFdi: Record<number, ToothView> }) {
  return (
    <div className="flex items-end gap-0.5">
      {fdis.map((fdi, idx) => {
        const tooth = byFdi[fdi];
        // Brecha visual entre Q1/Q2 (índice 8) y Q4/Q3 (índice 8)
        const isGap = idx === 8;
        return (
          <div key={fdi} className={isGap ? "ml-2" : undefined}>
            <ToothGlyph
              fdi={fdi}
              status={tooth?.status ?? "PRESENT"}
              findings={tooth?.findings ?? []}
            />
          </div>
        );
      })}
    </div>
  );
}

export function OdontogramChart({ teeth }: Props) {
  const byFdi: Record<number, ToothView> = Object.fromEntries(
    teeth.map((t) => [t.fdi, t]),
  );

  return (
    <div className="space-y-0">
      {/* Etiquetas de cuadrante */}
      <div className="flex justify-center mb-1">
        <div className="flex gap-0.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-[38px]" />
          ))}
        </div>
        <div className="w-2" />
        <div className="flex gap-0.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-[38px]" />
          ))}
        </div>
      </div>

      {/* Arco superior */}
      <div className="flex justify-center">
        <Arch fdis={UPPER} byFdi={byFdi} />
      </div>

      {/* Línea media horizontal */}
      <div className="my-1.5 mx-4 border-t border-dashed border-muted-foreground/25" />

      {/* Arco inferior */}
      <div className="flex justify-center">
        <Arch fdis={LOWER} byFdi={byFdi} />
      </div>
    </div>
  );
}
