"use client";

import { useState } from "react";
import Link from "next/link";
import { Odontogram3DScene } from "./Odontogram3DScene";
import type { ToothSurfaceKind } from "./tooth-arch-layout";
import { ToothDetailPanel } from "@/components/odontogram/ToothDetailPanel";
import type { ToothView } from "@/server/domain/clinical/odontogram-views";

interface Props {
  patientId: string;
  patientName: string;
  teeth: ToothView[];
  activeEncounterId: string | null;
  canVoid: boolean;
  canActOnFindings: boolean;
}

export function Odontogram3DShell({ patientId, patientName, teeth, activeEncounterId, canVoid, canActOnFindings }: Props) {
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<ToothSurfaceKind | null>(null);
  const selectedTooth = selectedFdi !== null ? teeth.find((t) => t.fdi === selectedFdi) ?? null : null;

  function handleSelectTooth(fdi: number) {
    setSelectedFdi(fdi);
    setSelectedSurface(null);
  }

  function handleSelectSurface(fdi: number, surface: ToothSurfaceKind) {
    setSelectedFdi(fdi);
    setSelectedSurface(surface);
  }

  function handleClosePanel() {
    setSelectedFdi(null);
    setSelectedSurface(null);
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
        <div>
          <Link href={`/pacientes/${patientId}`} className="text-xs text-white/50 hover:text-white/80 transition-colors">
            ← Volver a la ficha
          </Link>
          <h1 className="text-lg font-semibold mt-0.5">{patientName}</h1>
          <p className="text-xs text-white/40">Odontograma 3D · arrastra para rotar, rueda para hacer zoom</p>
        </div>
      </header>

      <div className="relative flex-1 min-h-0">
        <Odontogram3DScene
          teeth={teeth}
          selectedFdi={selectedFdi}
          selectedSurface={selectedSurface}
          onSelectTooth={handleSelectTooth}
          onSelectSurface={handleSelectSurface}
        />

        {selectedTooth && (
          <div className="absolute top-4 right-4 w-[min(22rem,90vw)] max-h-[calc(100%-2rem)] overflow-y-auto">
            <ToothDetailPanel
              fdi={selectedTooth.fdi}
              status={selectedTooth.status}
              findings={selectedTooth.findings}
              patientId={patientId}
              activeEncounterId={activeEncounterId}
              onClose={handleClosePanel}
              canVoid={canVoid}
              canActOnFindings={canActOnFindings}
              initialSurface={selectedSurface}
            />
          </div>
        )}
      </div>
    </div>
  );
}
