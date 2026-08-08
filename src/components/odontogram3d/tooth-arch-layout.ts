// Posiciones 3D de las 32 piezas FDI sobre un arco dental (maxilar/mandíbula).
// Puro, sin JSX — testeable con vitest. Independiente de cualquier malla visual:
// esto solo dice DÓNDE va cada pieza, no CÓMO se dibuja (el .glb futuro solo
// necesita este mapa para posicionarse, sin tocar la lógica de clic).

export interface ToothArchPosition {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

// Mismo orden visual que ALL_FDI en odontogram-views.ts: arcada superior
// izquierda→derecha del observador (18→11, 21→28), arcada inferior igual (48→41, 31→38).
const UPPER_ORDER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ORDER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const ARCH_RADIUS = 4;
const ARCH_HALF_ANGLE_DEG = 100;
const UPPER_Y = 1.1;
const LOWER_Y = -1.1;

function archPositionForIndex(index: number, count: number, y: number): ToothArchPosition {
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angleDeg = -ARCH_HALF_ANGLE_DEG + t * (2 * ARCH_HALF_ANGLE_DEG);
  const angleRad = (angleDeg * Math.PI) / 180;

  const x = ARCH_RADIUS * Math.sin(angleRad);
  const z = -ARCH_RADIUS * Math.cos(angleRad) + ARCH_RADIUS;

  return { x, y, z, rotationY: -angleRad };
}

/** Devuelve la posición 3D para una pieza FDI (11-48), o null si el FDI no es válido. */
export function getToothArchPosition(fdi: number): ToothArchPosition | null {
  const upperIndex = UPPER_ORDER.indexOf(fdi);
  if (upperIndex !== -1) return archPositionForIndex(upperIndex, UPPER_ORDER.length, UPPER_Y);

  const lowerIndex = LOWER_ORDER.indexOf(fdi);
  if (lowerIndex !== -1) return archPositionForIndex(lowerIndex, LOWER_ORDER.length, LOWER_Y);

  return null;
}
