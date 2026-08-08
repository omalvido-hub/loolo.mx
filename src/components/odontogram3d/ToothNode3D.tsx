"use client";

import { useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { ToothArchPosition } from "./tooth-arch-layout";
import { pickToothColorHex, SELECTED_OUTLINE_COLOR_HEX, HOVER_TINT_COLOR_HEX } from "./odontogram3d-colors";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";

interface Props {
  tooth: ToothView;
  archPosition: ToothArchPosition;
  isSelected: boolean;
  onSelect: (fdi: number) => void;
}

const ABSENT_STATUSES = new Set(["ABSENT", "EXTRACTED", "MISSING"]);

export function ToothNode3D({ tooth, archPosition, isSelected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);

  const baseColor = useMemo(
    () => pickToothColorHex(tooth.status, tooth.findings),
    [tooth.status, tooth.findings],
  );
  const isAbsent = ABSENT_STATUSES.has(tooth.status);
  const color = isSelected ? SELECTED_OUTLINE_COLOR_HEX : hovered ? HOVER_TINT_COLOR_HEX : baseColor;

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
    <group position={[archPosition.x, archPosition.y, archPosition.z]} rotation={[0, archPosition.rotationY, 0]}>
      {/* Malla visual temporal — se reemplaza por el asset .glb en una fase
          posterior sin tocar la lógica de clic, que vive en la malla invisible de abajo. */}
      <mesh scale={isSelected || hovered ? 1.15 : 1}>
        <capsuleGeometry args={[0.16, 0.32, 4, 8]} />
        <meshStandardMaterial color={color} opacity={isAbsent ? 0.35 : 1} transparent={isAbsent} roughness={0.6} />
      </mesh>

      {/* Zona de clic invisible, independiente de la malla visual — su tamaño y
          posición no cambian aunque el modelo 3D real se intercambie después. */}
      <mesh scale={[1.6, 1.6, 1.6]} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <capsuleGeometry args={[0.16, 0.32, 4, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
