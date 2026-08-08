"use client";

import { useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { getToothSurfacePositions, type ToothArchPosition, type ToothSurfaceKind } from "./tooth-arch-layout";
import {
  pickToothColorHex,
  SELECTED_OUTLINE_COLOR_HEX,
  HOVER_TINT_COLOR_HEX,
  SURFACE_DOT_COLOR_HEX,
} from "./odontogram3d-colors";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";

interface Props {
  tooth: ToothView;
  archPosition: ToothArchPosition;
  isSelected: boolean;
  selectedSurface: ToothSurfaceKind | null;
  /** Color de una pieza en un punto pasado de su historial (Fase 3). Reemplaza el color en vivo. */
  previewColorOverride?: string | null;
  onSelect: (fdi: number) => void;
  onSelectSurface: (fdi: number, surface: ToothSurfaceKind) => void;
}

const ABSENT_STATUSES = new Set(["ABSENT", "EXTRACTED", "MISSING"]);

export function ToothNode3D({
  tooth,
  archPosition,
  isSelected,
  selectedSurface,
  previewColorOverride,
  onSelect,
  onSelectSurface,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const baseColor = useMemo(
    () => pickToothColorHex(tooth.status, tooth.findings),
    [tooth.status, tooth.findings],
  );
  const isAbsent = ABSENT_STATUSES.has(tooth.status);
  const isPreviewing = previewColorOverride != null;
  const color = isPreviewing
    ? previewColorOverride
    : isSelected
      ? SELECTED_OUTLINE_COLOR_HEX
      : hovered
        ? HOVER_TINT_COLOR_HEX
        : baseColor;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onSelect(tooth.fdi);
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }

  function handlePointerOut() {
    setHovered(false);
    document.body.style.cursor = "auto";
  }

  return (
    <>
      <group position={[archPosition.x, archPosition.y, archPosition.z]} rotation={[0, archPosition.rotationY, 0]}>
        {/* Malla visual temporal — se reemplaza por el asset .glb en una fase
            posterior sin tocar la lógica de clic, que vive en la malla invisible de abajo. */}
        <mesh scale={isSelected || hovered ? 1.15 : 1}>
          <capsuleGeometry args={[0.16, 0.32, 4, 8]} />
          {/* Opacidad reducida en vista histórica (Fase 3): comunica que es un
              estado pasado, no el estado en vivo de la pieza. */}
          <meshStandardMaterial
            color={color}
            opacity={isPreviewing ? 0.6 : isAbsent ? 0.35 : 1}
            transparent={isPreviewing || isAbsent}
            roughness={0.6}
          />
        </mesh>

        {/* Zona de clic invisible, independiente de la malla visual — su tamaño y
            posición no cambian aunque el modelo 3D real se intercambie después.
            Escala 1.0 (no 1.6, como en Fase 1): debe quedar por dentro del radio
            de los marcadores de superficie de abajo para que el rayo siempre
            golpee primero el marcador correcto, nunca esta zona de pieza completa. */}
        <mesh scale={1} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
          <capsuleGeometry args={[0.16, 0.32, 4, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Marcadores de superficie fuera del group rotado de arriba: sus
          posiciones ya son absolutas (ver getToothSurfacePositions), aplicar
          la rotación del group las movería al lugar equivocado. */}
      {isSelected && (
        <SurfaceDots fdi={tooth.fdi} selectedSurface={selectedSurface} onSelectSurface={onSelectSurface} />
      )}
    </>
  );
}

// ─── Marcadores de superficie (Fase 2 — clic por superficie) ────────────────
// Solo se muestran en la pieza seleccionada, para no saturar la arcada con
// 32×5 puntos. Posiciones en espacio absoluto (mundo), sin transformación de
// grupo — ver getToothSurfacePositions.

interface SurfaceDotsProps {
  fdi: number;
  selectedSurface: ToothSurfaceKind | null;
  onSelectSurface: (fdi: number, surface: ToothSurfaceKind) => void;
}

function SurfaceDots({ fdi, selectedSurface, onSelectSurface }: SurfaceDotsProps) {
  const zones = useMemo(() => getToothSurfacePositions(fdi), [fdi]);
  if (!zones) return null;

  return (
    <>
      {zones.map((zone) => (
        <SurfaceDot
          key={zone.surface}
          x={zone.x}
          y={zone.y}
          z={zone.z}
          isSelected={selectedSurface === zone.surface}
          onClick={() => onSelectSurface(fdi, zone.surface)}
        />
      ))}
    </>
  );
}

function SurfaceDot({
  x,
  y,
  z,
  isSelected,
  onClick,
}: {
  x: number;
  y: number;
  z: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = isSelected ? SELECTED_OUTLINE_COLOR_HEX : hovered ? HOVER_TINT_COLOR_HEX : SURFACE_DOT_COLOR_HEX;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onClick();
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }

  function handlePointerOut() {
    setHovered(false);
    document.body.style.cursor = "auto";
  }

  return (
    <mesh
      position={[x, y, z]}
      scale={isSelected || hovered ? 1.3 : 1}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );
}
