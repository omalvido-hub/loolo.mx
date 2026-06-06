"use client";

// Glifo anatómico de pieza dental. Silueta orgánica (corona + raíz) con zonas V·M·O·D·L.
// Usa clipPath para recortar zonas a la forma de la corona.
// No guarda, no escribe, no server action.

import { useId } from "react";
import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { FINDING_TYPE_COLOR } from "./ToothSurfaceZone";

// ─── Estilos por estado ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { fill: string; stroke: string; rootFill: string }> = {
  PRESENT:   { fill: "#ffffff", stroke: "#d1d5db", rootFill: "#f0f0f0" },
  ABSENT:    { fill: "#f3f4f6", stroke: "#d1d5db", rootFill: "#e5e7eb" },
  EXTRACTED: { fill: "#e5e7eb", stroke: "#9ca3af", rootFill: "#d1d5db" },
  MISSING:   { fill: "#e5e7eb", stroke: "#9ca3af", rootFill: "#d1d5db" },
  IMPACTED:  { fill: "#fef9c3", stroke: "#fbbf24", rootFill: "#fef3c7" },
  UNERUPTED: { fill: "#f0fdf4", stroke: "#86efac", rootFill: "#dcfce7" },
  ROOT_ONLY: { fill: "#fef2f2", stroke: "#fca5a5", rootFill: "#fee2e2" },
};

// ─── Definiciones de forma por tipo ─────────────────────────────────────────
// Viewport: 32 × 50 px. Paths en ese sistema de coordenadas.
// zoneX/zoneW: bounding box para las zonas (inset respecto al ancho total de corona).
// crownH: altura de la corona (donde comienza la raíz y se calculan las zonas).
// STRIP: alto de franjas V y L. SIDE: ancho de franjas M y D.

type ToothDef = {
  crown: string;   // path SVG de la corona
  roots: string;   // path(s) SVG de la(s) raíz(-ces)
  crownH: number;
  zoneX: number; zoneW: number;
  STRIP: number;  SIDE: number;
};

// ── INCISIVO: estrecho, alto, borde incisal recto, raíz larga única ──────────
// Corona: lados con curva suave, ligero adelgazamiento cervical.
const INCISOR: ToothDef = {
  crown:
    "M 9 0 H 23" +
    " Q 25.5 0 25.5 3" +
    " Q 26 11 24.5 19" +
    " Q 23.5 26 22 26" +
    " H 10" +
    " Q 8.5 26 7.5 19" +
    " Q 6 11 6.5 3" +
    " Q 6.5 0 9 0 Z",
  roots:
    "M 10 26 L 22 26" +
    " C 23.5 33 20 41 16 47" +
    " C 12 41 8.5 33 10 26 Z",
  crownH: 26,
  zoneX: 8, zoneW: 16,
  STRIP: 6, SIDE: 4,
};

// ── CANINO: cúspide puntiaguda en el centro, más ancho que incisivo ──────────
const CANINE: ToothDef = {
  crown:
    "M 9 7" +
    " Q 10 1.5 16 0" +
    " Q 22 1.5 23 7" +
    " Q 25.5 15 24 22" +
    " Q 22.5 28 21 28" +
    " H 11" +
    " Q 9.5 28 8 22" +
    " Q 6.5 15 9 7 Z",
  roots:
    "M 11 28 L 21 28" +
    " C 22.5 35 19.5 43 16 48" +
    " C 12.5 43 9.5 35 11 28 Z",
  crownH: 28,
  zoneX: 9, zoneW: 14,
  STRIP: 7, SIDE: 4,
};

// ── PREMOLAR: corona más ancha, dos cúspides visibles en el borde oclusal ────
const PREMOLAR: ToothDef = {
  crown:
    "M 5 5" +
    " Q 7 0 12 0" +
    " Q 14 2.5 16 2.5" +
    " Q 18 2.5 20 0" +
    " Q 25 0 27 5" +
    " Q 28.5 13 27 20" +
    " Q 25.5 25 24 25" +
    " H 8" +
    " Q 6.5 25 5 20" +
    " Q 3.5 13 5 5 Z",
  // Raíz bifurcada (bicúspide)
  roots:
    "M 8 25 L 24 25" +
    " C 25 32 22 40 20 47" +
    " C 18 40 17 33 16 29" +
    " C 15 33 14 40 12 47" +
    " C 10 40 7 32 8 25 Z",
  crownH: 25,
  zoneX: 6, zoneW: 20,
  STRIP: 5, SIDE: 5,
};

// ── MOLAR: el más ancho, corona robusta con múltiples cúspides ───────────────
const MOLAR: ToothDef = {
  crown:
    "M 2 6" +
    " Q 3 0 8 0" +
    " Q 11 1.5 14 1.5" +
    " Q 16 0 18 1.5" +
    " Q 21 1.5 24 0" +
    " Q 29 0 30 6" +
    " Q 31 14 29.5 19" +
    " Q 28 23 26 23" +
    " H 6" +
    " Q 4 23 2.5 19" +
    " Q 1 14 2 6 Z",
  // Dos raíces separadas
  roots:
    "M 3 23 L 13 23 C 13.5 31 11 40 9 47 C 7 40 2.5 31 3 23 Z" +
    " M 19 23 L 29 23 C 29.5 31 27 40 23 47 C 19 40 18.5 31 19 23 Z",
  crownH: 23,
  zoneX: 3, zoneW: 26,
  STRIP: 5, SIDE: 6,
};

const TOOTH_DEFS: Record<"incisor" | "canine" | "premolar" | "molar", ToothDef> = {
  incisor: INCISOR,
  canine:  CANINE,
  premolar: PREMOLAR,
  molar:   MOLAR,
};

function toothType(fdi: number): "incisor" | "canine" | "premolar" | "molar" {
  const pos = fdi % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  fdi: number;
  status: string;
  findings: FindingPanelItem[];
  onClick?: () => void;
  isSelected?: boolean;
  overflowCount?: number;
}

const SVG_W = 32;
const SVG_H = 50;

export function ToothAnatomyGlyph({ fdi, status, findings, onClick, isSelected }: Props) {
  // useId genera IDs únicos por instancia — evita colisiones entre los 32 dientes
  // de un odontograma (o dos odontogramas en la misma página).
  const uid = useId();
  const clipId = `tac${uid.replace(/:/g, "")}`;

  const def = TOOTH_DEFS[toothType(fdi)];
  const { crown, roots, crownH, zoneX, zoneW, STRIP, SIDE } = def;

  const style    = STATUS_STYLE[status] ?? STATUS_STYLE.PRESENT;
  const isGone   = status === "EXTRACTED" || status === "MISSING" || status === "ABSENT";
  const midH     = crownH - STRIP * 2;
  const midW     = zoneW - SIDE * 2;

  // Mapa superficie → color (primer hallazgo por superficie gana).
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

  const zc = (ft: string | null | undefined): string | null =>
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
        <defs>
          <clipPath id={clipId}>
            <path d={crown} />
          </clipPath>
        </defs>

        {/* Raíz(ces) — debajo de la corona, sin zonas */}
        <path d={roots} fill={style.rootFill} stroke={style.stroke} strokeWidth={0.8} />

        {/* Corona — fondo de color de estado */}
        <path d={crown} fill={style.fill} stroke="none" />

        {/* Zonas — recortadas por la forma orgánica de la corona */}
        {!isGone && (
          <g clipPath={`url(#${clipId})`}>
            {zc(surfaceMap["VESTIBULAR"]) && (
              <rect x={zoneX + SIDE} y={0} width={midW} height={STRIP}
                fill={zc(surfaceMap["VESTIBULAR"])!} opacity={0.88} />
            )}
            {zc(surfaceMap["MESIAL"]) && (
              <rect x={zoneX} y={STRIP} width={SIDE} height={midH}
                fill={zc(surfaceMap["MESIAL"])!} opacity={0.88} />
            )}
            {zc(centerFinding) && (
              <rect x={zoneX + SIDE} y={STRIP} width={midW} height={midH}
                fill={zc(centerFinding)!} opacity={0.88} />
            )}
            {zc(surfaceMap["DISTAL"]) && (
              <rect x={zoneX + zoneW - SIDE} y={STRIP} width={SIDE} height={midH}
                fill={zc(surfaceMap["DISTAL"])!} opacity={0.88} />
            )}
            {zc(surfaceMap["LINGUAL"]) && (
              <rect x={zoneX + SIDE} y={STRIP + midH} width={midW} height={STRIP}
                fill={zc(surfaceMap["LINGUAL"])!} opacity={0.88} />
            )}
            {/* Líneas divisorias de zonas */}
            <line x1={zoneX} y1={STRIP} x2={zoneX + zoneW} y2={STRIP}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={zoneX} y1={STRIP + midH} x2={zoneX + zoneW} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={zoneX + SIDE} y1={STRIP} x2={zoneX + SIDE} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
            <line x1={zoneX + zoneW - SIDE} y1={STRIP} x2={zoneX + zoneW - SIDE} y2={STRIP + midH}
              stroke={style.stroke} strokeWidth={0.5} />
          </g>
        )}

        {/* X para pieza extraída/ausente/perdida */}
        {isGone && (
          <g clipPath={`url(#${clipId})`}>
            <line x1={zoneX + 3} y1={3} x2={zoneX + zoneW - 3} y2={crownH - 3}
              stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
            <line x1={zoneX + zoneW - 3} y1={3} x2={zoneX + 3} y2={crownH - 3}
              stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
          </g>
        )}

        {/* Contorno de corona — dibujado encima para dar limpieza al borde */}
        <path d={crown} fill="none" stroke={strokeColor} strokeWidth={strokeW} />
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
