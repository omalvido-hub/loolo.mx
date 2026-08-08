"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ToothNode3D } from "./ToothNode3D";
import { getToothArchPosition, type ToothSurfaceKind } from "./tooth-arch-layout";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";

interface Props {
  teeth: ToothView[];
  selectedFdi: number | null;
  selectedSurface: ToothSurfaceKind | null;
  onSelectTooth: (fdi: number) => void;
  onSelectSurface: (fdi: number, surface: ToothSurfaceKind) => void;
}

export function Odontogram3DScene({ teeth, selectedFdi, selectedSurface, onSelectTooth, onSelectSurface }: Props) {
  return (
    <Canvas camera={{ position: [0, 0.5, 9], fov: 42 }} style={{ position: "absolute", inset: 0 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 6]} intensity={1.1} />
      <directionalLight position={[-4, -2, 4]} intensity={0.4} />
      {teeth.map((tooth) => {
        const archPosition = getToothArchPosition(tooth.fdi);
        if (!archPosition) return null;
        const isSelected = selectedFdi === tooth.fdi;
        return (
          <ToothNode3D
            key={tooth.fdi}
            tooth={tooth}
            archPosition={archPosition}
            isSelected={isSelected}
            selectedSurface={isSelected ? selectedSurface : null}
            onSelect={onSelectTooth}
            onSelectSurface={onSelectSurface}
          />
        );
      })}
      <OrbitControls enableDamping dampingFactor={0.12} minDistance={4} maxDistance={16} target={[0, 0, 1]} />
    </Canvas>
  );
}
