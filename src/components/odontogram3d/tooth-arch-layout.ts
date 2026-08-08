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

// ─── Posiciones de superficie (Fase 2 — clic por superficie) ────────────────
// Mismos valores que ToothSurfaceZ en odontogram-schemas.ts.

export type ToothSurfaceKind = "MESIAL" | "DISTAL" | "OCCLUSAL" | "VESTIBULAR" | "LINGUAL" | "INCISAL";

export interface ToothSurfaceWorldPosition {
  surface: ToothSurfaceKind;
  x: number;
  y: number;
  z: number;
}

// El arco (x = R sinθ, z = R(1-cosθ)) es un círculo de radio ARCH_RADIUS
// centrado en (0, ARCH_RADIUS) en el plano XZ — ese centro es el punto de
// referencia para "hacia afuera" (vestibular) vs "hacia adentro" (lingual).
const ARCH_CENTER_Z = ARCH_RADIUS;

// Distancia de los marcadores de superficie al centro de la pieza. Fuera del
// radio de la zona de clic de la pieza completa (ver ToothNode3D) para que el
// rayo siempre golpee primero el marcador de superficie, nunca la pieza entera.
const SURFACE_DOT_OFFSET = 0.42;

/**
 * Posiciones absolutas (mundo) de las 5 zonas de superficie de una pieza:
 * vestibular/lingual (radial, hacia/desde el centro del arco), mesial/distal
 * (tangencial, hacia/desde la línea media) y oclusal u incisal (hacia la
 * arcada opuesta). Piezas 1-3 (incisivos/canino) usan INCISAL; 4-8
 * (premolares/molares) usan OCCLUSAL — igual que el odontograma 2D.
 */
export function getToothSurfacePositions(fdi: number): ToothSurfaceWorldPosition[] | null {
  const base = getToothArchPosition(fdi);
  if (!base) return null;

  const isUpper = UPPER_ORDER.includes(fdi);
  const positionInQuadrant = fdi % 10;
  const isAnterior = positionInQuadrant >= 1 && positionInQuadrant <= 3;

  // Vestibular: dirección radial hacia afuera desde el centro de curvatura del arco.
  const dx = base.x;
  const dz = base.z - ARCH_CENTER_Z;
  const outLen = Math.hypot(dx, dz) || 1;
  const outward = { x: dx / outLen, z: dz / outLen };

  // Mesial: tangente al arco, apuntando hacia la línea media (θ → 0). Se
  // calcula por diferencia finita — evita errores de signo por cuadrante.
  const order = isUpper ? UPPER_ORDER : LOWER_ORDER;
  const index = order.indexOf(fdi);
  const t = index / (order.length - 1);
  const angleDeg = -ARCH_HALF_ANGLE_DEG + t * (2 * ARCH_HALF_ANGLE_DEG);
  const stepDeg = angleDeg > 0 ? -0.5 : 0.5;
  const neighborAngleRad = ((angleDeg + stepDeg) * Math.PI) / 180;
  const neighborX = ARCH_RADIUS * Math.sin(neighborAngleRad);
  const neighborZ = -ARCH_RADIUS * Math.cos(neighborAngleRad) + ARCH_RADIUS;
  let mx = neighborX - base.x;
  let mz = neighborZ - base.z;
  const mLen = Math.hypot(mx, mz) || 1;
  const mesial = { x: mx / mLen, z: mz / mLen };

  // Oclusal/incisal: hacia la arcada opuesta (abajo si es superior, arriba si es inferior).
  const occlusalDirY = isUpper ? -1 : 1;

  const zones: ToothSurfaceWorldPosition[] = [
    { surface: "VESTIBULAR", x: base.x + outward.x * SURFACE_DOT_OFFSET, y: base.y, z: base.z + outward.z * SURFACE_DOT_OFFSET },
    { surface: "LINGUAL", x: base.x - outward.x * SURFACE_DOT_OFFSET, y: base.y, z: base.z - outward.z * SURFACE_DOT_OFFSET },
    { surface: "MESIAL", x: base.x + mesial.x * SURFACE_DOT_OFFSET, y: base.y, z: base.z + mesial.z * SURFACE_DOT_OFFSET },
    { surface: "DISTAL", x: base.x - mesial.x * SURFACE_DOT_OFFSET, y: base.y, z: base.z - mesial.z * SURFACE_DOT_OFFSET },
    { surface: isAnterior ? "INCISAL" : "OCCLUSAL", x: base.x, y: base.y + occlusalDirY * SURFACE_DOT_OFFSET, z: base.z },
  ];

  return zones;
}
