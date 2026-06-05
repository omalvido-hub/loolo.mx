// Presentacional. Representa una pieza dental FDI como diagrama de 5 zonas.
// Zonas: V (vestibular/top), M (mesial/left), O/I (oclusal-incisal/center), D (distal/right), L (lingual/bottom).
// No recibe ni renderiza note ni recordedByUserId.
// Acepta props opcionales de interacción: onClick, isSelected, overflowCount.

import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { ToothSurfaceZone } from "./ToothSurfaceZone";

// Dimensiones del diente: 36×36px (+ 12px para etiqueta FDI = 48px total).
const W = 36;
const H = 36;
const STRIP = 9;   // altura de zonas V y L
const MID_H = H - STRIP * 2; // altura de la fila central (18px)
const SIDE_W = 9;  // ancho de zonas M y D
const CTR_W = W - SIDE_W * 2; // ancho de la zona O/I

const TOOTH_STATUS_STYLE: Record<string, { fill: string; stroke: string }> = {
  PRESENT:   { fill: "#ffffff", stroke: "#d1d5db" },
  ABSENT:    { fill: "#f3f4f6", stroke: "#d1d5db" },
  EXTRACTED: { fill: "#e5e7eb", stroke: "#9ca3af" },
  MISSING:   { fill: "#e5e7eb", stroke: "#9ca3af" },
  IMPACTED:  { fill: "#fef9c3", stroke: "#fbbf24" },
  UNERUPTED: { fill: "#f0fdf4", stroke: "#86efac" },
  ROOT_ONLY: { fill: "#fef2f2", stroke: "#fca5a5" },
};

interface Props {
  fdi: number;
  status: string;
  findings: FindingPanelItem[];
  onClick?: () => void;
  isSelected?: boolean;
  overflowCount?: number;
}

export function ToothGlyph({ fdi, status, findings, onClick, isSelected, overflowCount }: Props) {
  const style = TOOTH_STATUS_STYLE[status] ?? TOOTH_STATUS_STYLE.PRESENT;
  const isGone = status === "EXTRACTED" || status === "MISSING";

  // Construir mapa superficie → findingType (primer hallazgo por superficie gana).
  const surfaceMap: Record<string, string> = {};
  let toothLevelFinding: string | null = null;
  for (const f of findings) {
    if (!f.surface) {
      if (!toothLevelFinding) toothLevelFinding = f.findingType;
    } else if (!surfaceMap[f.surface]) {
      surfaceMap[f.surface] = f.findingType;
    }
  }

  // Zona central = oclusal o incisal (o hallazgo a nivel pieza como corona).
  const centerFinding =
    surfaceMap["OCCLUSAL"] ?? surfaceMap["INCISAL"] ?? toothLevelFinding ?? null;

  const hasFindings = findings.length > 0;

  const extraCount = overflowCount ?? 0;

  return (
    <div
      className={`flex flex-col items-center${onClick ? " cursor-pointer select-none" : ""}`}
      title={`${fdi}${findings.length > 0 ? ` · ${findings.length} hallazgo${findings.length > 1 ? 's' : ''}` : ''}`}
      onClick={onClick}
    >
      <div className="relative">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="overflow-visible"
        >
          {/* Fondo de la pieza */}
          <rect
            x={0.5}
            y={0.5}
            width={W - 1}
            height={H - 1}
            rx={3}
            fill={style.fill}
            stroke={isSelected ? "#3b82f6" : (hasFindings ? "#94a3b8" : style.stroke)}
            strokeWidth={isSelected ? 2.5 : (hasFindings ? 1.5 : 1)}
          />

        {/* Zonas de superficie (solo si la pieza no está extraída/ausente) */}
        {!isGone && (
          <>
            {/* Vestibular — franja superior */}
            <ToothSurfaceZone
              x={SIDE_W}
              y={1}
              width={CTR_W}
              height={STRIP - 1}
              findingType={surfaceMap["VESTIBULAR"] ?? null}
            />
            {/* Mesial — franja izquierda */}
            <ToothSurfaceZone
              x={1}
              y={STRIP}
              width={SIDE_W - 1}
              height={MID_H}
              findingType={surfaceMap["MESIAL"] ?? null}
            />
            {/* Oclusal/Incisal — zona central */}
            <ToothSurfaceZone
              x={SIDE_W}
              y={STRIP}
              width={CTR_W}
              height={MID_H}
              findingType={centerFinding}
              rx={2}
            />
            {/* Distal — franja derecha */}
            <ToothSurfaceZone
              x={W - SIDE_W}
              y={STRIP}
              width={SIDE_W - 1}
              height={MID_H}
              findingType={surfaceMap["DISTAL"] ?? null}
            />
            {/* Lingual — franja inferior */}
            <ToothSurfaceZone
              x={SIDE_W}
              y={STRIP + MID_H}
              width={CTR_W}
              height={STRIP - 1}
              findingType={surfaceMap["LINGUAL"] ?? null}
            />

            {/* Líneas divisorias de zonas */}
            <line x1={SIDE_W} y1={STRIP} x2={W - SIDE_W} y2={STRIP} stroke={style.stroke} strokeWidth={0.5} />
            <line x1={SIDE_W} y1={STRIP + MID_H} x2={W - SIDE_W} y2={STRIP + MID_H} stroke={style.stroke} strokeWidth={0.5} />
            <line x1={SIDE_W} y1={STRIP} x2={SIDE_W} y2={STRIP + MID_H} stroke={style.stroke} strokeWidth={0.5} />
            <line x1={W - SIDE_W} y1={STRIP} x2={W - SIDE_W} y2={STRIP + MID_H} stroke={style.stroke} strokeWidth={0.5} />
          </>
        )}

        {/* X para pieza extraída/ausente */}
        {isGone && (
          <>
            <line x1={5} y1={5} x2={W - 5} y2={H - 5} stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
            <line x1={W - 5} y1={5} x2={5} y2={H - 5} stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
          </>
        )}
        </svg>

        {/* Badge de overflow: "+N" cuando hay más hallazgos de los que caben visualmente */}
        {extraCount > 0 && (
          <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-blue-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none z-10 pointer-events-none">
            +{extraCount}
          </span>
        )}
      </div>

      {/* Etiqueta FDI */}
      <span className={`text-[9px] leading-none mt-0.5 font-mono${isSelected ? " text-blue-500 font-bold" : " text-muted-foreground"}`}>
        {fdi}
      </span>
    </div>
  );
}
