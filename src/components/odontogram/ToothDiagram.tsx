// Diagrama visual ampliado de un diente. Mismas 5 zonas que ToothGlyph
// pero a mayor escala, con etiquetas de superficie y hallazgos coloreados.
// Solo presentacional — no escribe, no guarda.

import type { FindingPanelItem } from "@/server/domain/clinical/odontogram-views";
import { FINDING_TYPE_COLOR } from "./ToothSurfaceZone";

const STATUS_STYLE: Record<string, { fill: string; stroke: string }> = {
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
  size?: number;
}

export function ToothDiagram({ status, findings, size = 72 }: Props) {
  const S = size;
  const STRIP = Math.round(S * 0.22);
  const SIDE  = Math.round(S * 0.22);
  const MID_H = S - STRIP * 2;
  const CTR_W = S - SIDE * 2;

  const style  = STATUS_STYLE[status] ?? STATUS_STYLE.PRESENT;
  const isGone = status === "EXTRACTED" || status === "MISSING" || status === "ABSENT";

  const surfaceMap: Record<string, string> = {};
  let toothLevel: string | null = null;
  for (const f of findings) {
    if (!f.surface) {
      if (!toothLevel) toothLevel = f.findingType;
    } else if (!surfaceMap[f.surface]) {
      surfaceMap[f.surface] = f.findingType;
    }
  }
  const centerFinding =
    surfaceMap["OCCLUSAL"] ?? surfaceMap["INCISAL"] ?? toothLevel ?? null;

  const FS = Math.max(7, Math.round(S * 0.13));
  const labelFill = "#94a3b8";

  function zoneColor(type: string | null): string {
    if (!type) return "transparent";
    return FINDING_TYPE_COLOR[type] ?? "#9ca3af";
  }

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Fondo base */}
      <rect
        x={0.5} y={0.5}
        width={S - 1} height={S - 1}
        rx={5}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1.5}
      />

      {!isGone ? (
        <>
          {/* ── Zonas coloreadas ── */}
          {surfaceMap["VESTIBULAR"] && (
            <rect x={SIDE} y={1} width={CTR_W} height={STRIP - 1}
              fill={zoneColor(surfaceMap["VESTIBULAR"])} opacity={0.82} />
          )}
          {surfaceMap["MESIAL"] && (
            <rect x={1} y={STRIP} width={SIDE - 1} height={MID_H}
              fill={zoneColor(surfaceMap["MESIAL"])} opacity={0.82} />
          )}
          {centerFinding && (
            <rect x={SIDE} y={STRIP} width={CTR_W} height={MID_H}
              rx={3} fill={zoneColor(centerFinding)} opacity={0.82} />
          )}
          {surfaceMap["DISTAL"] && (
            <rect x={S - SIDE} y={STRIP} width={SIDE - 1} height={MID_H}
              fill={zoneColor(surfaceMap["DISTAL"])} opacity={0.82} />
          )}
          {surfaceMap["LINGUAL"] && (
            <rect x={SIDE} y={STRIP + MID_H} width={CTR_W} height={STRIP - 1}
              fill={zoneColor(surfaceMap["LINGUAL"])} opacity={0.82} />
          )}

          {/* ── Líneas divisorias ── */}
          <line x1={SIDE} y1={STRIP} x2={S - SIDE} y2={STRIP}
            stroke={style.stroke} strokeWidth={0.75} />
          <line x1={SIDE} y1={STRIP + MID_H} x2={S - SIDE} y2={STRIP + MID_H}
            stroke={style.stroke} strokeWidth={0.75} />
          <line x1={SIDE} y1={STRIP} x2={SIDE} y2={STRIP + MID_H}
            stroke={style.stroke} strokeWidth={0.75} />
          <line x1={S - SIDE} y1={STRIP} x2={S - SIDE} y2={STRIP + MID_H}
            stroke={style.stroke} strokeWidth={0.75} />

          {/* ── Etiquetas de zona ── */}
          {/* V — Vestibular */}
          <text
            x={S / 2} y={STRIP / 2 + FS * 0.35}
            textAnchor="middle" fontSize={FS} fontWeight="700"
            fill={surfaceMap["VESTIBULAR"] ? "#fff" : labelFill}
          >V</text>
          {/* M — Mesial */}
          <text
            x={SIDE / 2} y={STRIP + MID_H / 2 + FS * 0.35}
            textAnchor="middle" fontSize={FS} fontWeight="700"
            fill={surfaceMap["MESIAL"] ? "#fff" : labelFill}
          >M</text>
          {/* O — Oclusal/Incisal */}
          <text
            x={S / 2} y={STRIP + MID_H / 2 + FS * 0.35}
            textAnchor="middle" fontSize={FS} fontWeight="700"
            fill={centerFinding ? "#fff" : labelFill}
          >O</text>
          {/* D — Distal */}
          <text
            x={S - SIDE / 2} y={STRIP + MID_H / 2 + FS * 0.35}
            textAnchor="middle" fontSize={FS} fontWeight="700"
            fill={surfaceMap["DISTAL"] ? "#fff" : labelFill}
          >D</text>
          {/* L — Lingual */}
          <text
            x={S / 2} y={STRIP + MID_H + STRIP / 2 + FS * 0.35}
            textAnchor="middle" fontSize={FS} fontWeight="700"
            fill={surfaceMap["LINGUAL"] ? "#fff" : labelFill}
          >L</text>
        </>
      ) : (
        <>
          <line x1={8} y1={8} x2={S - 8} y2={S - 8}
            stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
          <line x1={S - 8} y1={8} x2={8} y2={S - 8}
            stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
