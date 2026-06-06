"use client";

// Glifo anatómico de pieza dental. Forma de diente (corona + raíz) en lugar de cuadrito.
// Mantiene la misma lógica de zonas (V·M·O·D·L) y colores que ToothGlyph.
// No guarda, no escribe, no server action.

import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { FINDING_TYPE_COLOR } from "./ToothSurfaceZone";

// ─── Estilos por estado ────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { fill: string; stroke: string; rootFill: string }> = {
  PRESENT:   { fill: "#ffffff", stroke: "#d1d5db", rootFill: "#f3f4f6" },
  ABSENT:    { fill: "#f3f4f6", stroke: "#d1d5db", rootFill: "#e5e7eb" },
  EXTRACTED: { fill: "#e5e7eb", stroke: "#9ca3af", rootFill: "#d1d5db" },
  MISSING:   { fill: "#e5e7eb", stroke: "#9ca3af", rootFill: "#d1d5db" },
  IMPACTED:  { fill: "#fef9c3", stroke: "#fbbf24", rootFill: "#fef3c7" },
  UNERUPTED: { fill: "#f0fdf4", stroke: "#86efac", rootFill: "#dcfce7" },
  ROOT_ONLY: { fill: "#fef2f2", stroke: "#fca5a5", rootFill: "#fee2e2" },
};

// ─── Geometría por tipo de pieza ───────────────────────────────────────────
// Viewport fijo: 32 × 48 px. Cada tipo define [crownW, crownH, crownX, rootW, rootH].
// crownX centra la corona en el viewport de 32px.

type ToothType = "incisor" | "canine" | "premolar" | "molar";

const GEOM: Record<ToothType, [number, number, number, number, number]> = {
  //              crownW  crownH  crownX  rootW  rootH
  incisor:  [      18,     28,     7,      6,     20  ],
  canine:   [      20,     30,     6,      7,     18  ],
  premolar: [      24,     28,     4,      9,     20  ],
  molar:    [      30,     26,     1,      13,    22  ],
};

function toothType(fdi: number): ToothType {
  const pos = fdi % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

// Corona: rectángulo con esquinas superiores redondeadas, base plana.
function crownD(cx: number, cw: number, ch: number, r = 5): string {
  return [
    `M ${cx + r} 0`,
    `H ${cx + cw - r}`,
    `Q ${cx + cw} 0 ${cx + cw} ${r}`,
    `V ${ch}`,
    `H ${cx}`,
    `V ${r}`,
    `Q ${cx} 0 ${cx + r} 0`,
    "Z",
  ].join(" ");
}

// Raíz: trapecio que se afina hasta una punta redondeada.
function rootD(cx: number, cw: number, ch: number, rw: number, rh: number): string {
  const rx = cx + (cw - rw) / 2;
  const tipX = cx + cw / 2;
  const tipY = ch + rh;
  return [
    `M ${rx} ${ch}`,
    `L ${rx + rw} ${ch}`,
    `L ${tipX + 2} ${tipY - 4}`,
    `Q ${tipX} ${tipY} ${tipX - 2} ${tipY - 4}`,
    "Z",
  ].join(" ");
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  fdi: number;
  status: string;
  findings: FindingPanelItem[];
  onClick?: () => void;
  isSelected?: boolean;
  overflowCount?: number;
}

const SVG_W = 32;
const SVG_H = 48;

export function ToothAnatomyGlyph({ fdi, status, findings, onClick, isSelected }: Props) {
  const type = toothType(fdi);
  const [cw, ch, cx, rw, rh] = GEOM[type];
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PRESENT;
  const isGone = status === "EXTRACTED" || status === "MISSING" || status === "ABSENT";

  // Mapa superficie → color de hallazgo (primer hallazgo por superficie gana).
  const surfaceMap: Record<string, string> = {};
  let toothLevelFinding: string | null = null;
  for (const f of findings) {
    if (!f.surface) {
      if (!toothLevelFinding) toothLevelFinding = f.findingType;
    } else if (!surfaceMap[f.surface]) {
      surfaceMap[f.surface] = f.findingType;
    }
  }
  const centerFinding =
    surfaceMap["OCCLUSAL"] ?? surfaceMap["INCISAL"] ?? toothLevelFinding ?? null;
  const hasFindings = findings.length > 0;

  const strokeColor = isSelected ? "#3b82f6" : hasFindings ? "#94a3b8" : style.stroke;
  const strokeW     = isSelected ? 2.5         : hasFindings ? 1.5         : 1;

  // Proporciones de zonas dentro de la corona.
  const STRIP = Math.round(ch * 0.25); // alto de franja V y L
  const midH  = ch - STRIP * 2;
  const SIDE  = Math.round(cw * 0.22); // ancho de franja M y D
  const midW  = cw - SIDE * 2;

  const zoneColor = (ft: string | undefined | null) =>
    ft ? (FINDING_TYPE_COLOR[ft] ?? "#9ca3af") : null;

  return (
    <div
      className={[
        "flex flex-col items-center px-0.5 pt-0.5",
        onClick ? "cursor-pointer select-none" : "",
        isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-offset-1 rounded-md" : "",
      ].filter(Boolean).join(" ")}
      title={`${fdi}${findings.length > 0 ? ` · ${findings.length} hallazgo${findings.length > 1 ? "s" : ""}` : ""}`}
      onClick={onClick}
    >
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="overflow-visible"
      >
        {/* Raíz */}
        <path
          d={rootD(cx, cw, ch, rw, rh)}
          fill={style.rootFill}
          stroke={style.stroke}
          strokeWidth={0.8}
        />

        {/* Corona — fondo */}
        <path d={crownD(cx, cw, ch)} fill={style.fill} stroke="none" />

        {/* Zonas de superficie (solo si la pieza no está extraída/ausente) */}
        {!isGone && (
          <>
            {/* Vestibular — franja superior */}
            {zoneColor(surfaceMap["VESTIBULAR"]) && (
              <rect x={cx + SIDE} y={1} width={midW} height={STRIP - 1}
                fill={zoneColor(surfaceMap["VESTIBULAR"])!} opacity={0.88} />
            )}
            {/* Mesial — franja izquierda */}
            {zoneColor(surfaceMap["MESIAL"]) && (
              <rect x={cx + 1} y={STRIP} width={SIDE - 1} height={midH}
                fill={zoneColor(surfaceMap["MESIAL"])!} opacity={0.88} />
            )}
            {/* Oclusal/Incisal o hallazgo a nivel pieza — zona central */}
            {zoneColor(centerFinding) && (
              <rect x={cx + SIDE} y={STRIP} width={midW} height={midH}
                fill={zoneColor(centerFinding)!} opacity={0.88} />
            )}
            {/* Distal — franja derecha */}
            {zoneColor(surfaceMap["DISTAL"]) && (
              <rect x={cx + cw - SIDE} y={STRIP} width={SIDE - 1} height={midH}
                fill={zoneColor(surfaceMap["DISTAL"])!} opacity={0.88} />
            )}
            {/* Lingual — franja inferior */}
            {zoneColor(surfaceMap["LINGUAL"]) && (
              <rect x={cx + SIDE} y={STRIP + midH} width={midW} height={STRIP - 1}
                fill={zoneColor(surfaceMap["LINGUAL"])!} opacity={0.88} />
            )}

            {/* Líneas divisorias */}
            <line x1={cx} y1={STRIP} x2={cx + cw} y2={STRIP}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={cx} y1={STRIP + midH} x2={cx + cw} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={cx + SIDE} y1={STRIP} x2={cx + SIDE} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={cx + cw - SIDE} y1={STRIP} x2={cx + cw - SIDE} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
          </>
        )}

        {/* X para pieza extraída/ausente */}
        {isGone && (
          <>
            <line x1={cx + 4} y1={4} x2={cx + cw - 4} y2={ch - 4}
              stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
            <line x1={cx + cw - 4} y1={4} x2={cx + 4} y2={ch - 4}
              stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
          </>
        )}

        {/* Corona — contorno encima de zonas (da efecto de "recorte" visual) */}
        <path
          d={crownD(cx, cw, ch)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      </svg>

      {/* Etiqueta FDI */}
      <span
        className={`leading-none mt-0.5 font-mono${
          isSelected ? " text-[10px] text-blue-600 font-bold" : " text-[9px] text-muted-foreground"
        }`}
      >
        {fdi}
      </span>
    </div>
  );
}
