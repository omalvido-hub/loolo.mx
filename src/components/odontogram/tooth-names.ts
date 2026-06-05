// Mapa FDI → nombre del diente. Soporta modo número, nombre corto, nombre completo.
// Preparado para vista esquemática y futura vista anatómica.

export interface ToothName {
  short: string;
  full: string;
  quadrant: string;
}

const TOOTH_TYPES: Record<number, string> = {
  1: "Incisivo central",
  2: "Incisivo lateral",
  3: "Canino",
  4: "Primer premolar",
  5: "Segundo premolar",
  6: "Primer molar",
  7: "Segundo molar",
  8: "Tercer molar",
};

const QUADRANT_NAME: Record<number, string> = {
  1: "Superior derecho",
  2: "Superior izquierdo",
  3: "Inferior izquierdo",
  4: "Inferior derecho",
};

function buildToothNames(): Record<number, ToothName> {
  const map: Record<number, ToothName> = {};
  for (let q = 1; q <= 4; q++) {
    for (let p = 1; p <= 8; p++) {
      const fdi = q * 10 + p;
      const short = TOOTH_TYPES[p] ?? `Pieza ${fdi}`;
      const quadrant = QUADRANT_NAME[q] ?? "";
      map[fdi] = {
        short,
        full: `${short} — ${quadrant}`,
        quadrant,
      };
    }
  }
  return map;
}

export const TOOTH_NAMES: Record<number, ToothName> = buildToothNames();

export function getToothName(fdi: number): ToothName {
  return TOOTH_NAMES[fdi] ?? { short: `Pieza ${fdi}`, full: `Pieza ${fdi}`, quadrant: "" };
}
