"use client";

import { useCallback, useRef, useState } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Bodoni_Moda } from "next/font/google";
import { cn } from "@/lib/utils";
import "./sinapsis.css";
import { SinapsisNav } from "./SinapsisNav";
import { SinapsisHeader } from "./SinapsisHeader";
import { SinapsisCore } from "./SinapsisCore";
import { SinapsisFilaments } from "./SinapsisFilaments";
import { VoiceDictationBar } from "./VoiceDictationBar";
import { EsperanTuFirmaCard } from "./cards/EsperanTuFirmaCard";
import { AhoraCard } from "./cards/AhoraCard";
import { DineroCard } from "./cards/DineroCard";
import { GastoEquilibrioCard } from "./cards/GastoEquilibrioCard";
import { CarteraVencidaCard } from "./cards/CarteraVencidaCard";
import type { SinapsisDashboardData } from "./types";

const plexMono = IBM_Plex_Mono({ variable: "--font-sinapsis-mono", subsets: ["latin"], weight: ["400", "500"] });
const plexSans = IBM_Plex_Sans({ variable: "--font-sinapsis-sans", subsets: ["latin"], weight: ["400", "500"] });
const bodoniModa = Bodoni_Moda({ variable: "--font-sinapsis-serif", subsets: ["latin"], weight: ["400", "500"] });

interface SinapsisShellProps {
  permissions: string[];
  data: SinapsisDashboardData;
}

function Saludo({ userName }: { userName: string }) {
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;
  return (
    <h1 className="text-[26px] leading-[1.1] tracking-[-0.02em] text-white lg:text-[30px]">
      Hola {firstName}
    </h1>
  );
}

// Tarjeta que ilumina el pulso al terminar de dictar. DINERO porque un
// dictado hoy típicamente registra un cobro — cuando el dominio de IA que
// interprete el dictado exista, este destino podrá variar según el contenido.
const DICTATION_TARGET_CARD = "dinero";
const PULSE_DURATION_MS = 2200;

export function SinapsisShell({ permissions, data }: SinapsisShellProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pulseTarget, setPulseTarget] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(true);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDictationComplete = useCallback(() => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    setPulseTarget(DICTATION_TARGET_CARD);
    pulseTimeoutRef.current = setTimeout(() => setPulseTarget(null), PULSE_DURATION_MS);
  }, []);

  const pulsing = pulseTarget !== null;

  return (
    <div
      className={cn(
        plexMono.variable,
        plexSans.variable,
        bodoniModa.variable,
        "sinapsis-root flex min-h-screen w-full",
      )}
    >
      <SinapsisNav permissions={permissions} userName={data.userName} open={navOpen} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sinapsis-ambient">
          <span className="sinapsis-spark" style={{ left: "12%", top: "22%", animationDelay: "0s" }} />
          <span className="sinapsis-spark" style={{ left: "68%", top: "14%", animationDelay: "1.4s" }} />
          <span className="sinapsis-spark" style={{ left: "40%", top: "60%", animationDelay: "2.8s" }} />
          <span className="sinapsis-spark" style={{ left: "84%", top: "48%", animationDelay: "4.1s" }} />
          <span className="sinapsis-spark" style={{ left: "24%", top: "78%", animationDelay: "3.2s" }} />
          <span className="sinapsis-spark" style={{ left: "55%", top: "88%", animationDelay: "0.9s" }} />
          <span className="sinapsis-comet" />
        </div>

        <SinapsisHeader
          cobradoMesBrutoCents={data.cobradoMesBrutoCents}
          metaPercent={data.metaPercent}
          ocupacionPercent={data.ocupacionPercent}
          citasHoyCount={data.citasHoyCount}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((v) => !v)}
        />

        <div className="px-4 pt-7 sm:px-6 lg:px-10" style={{ fontFamily: "var(--sn-serif)" }}>
          <Saludo userName={data.userName} />
          <p className="mt-1.5 text-[15px] text-white/55 lg:text-[17px]">Lo que hoy pide tu atención.</p>
        </div>

        <div ref={canvasRef} className="relative flex-1 px-4 pb-6 pt-7 sm:px-6 lg:px-10">
          <SinapsisFilaments containerRef={canvasRef} pulsing={pulsing} targetCardId={pulseTarget} />

          <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:auto-rows-[220px] md:gap-5 xl:grid-cols-3 xl:grid-rows-[236px_212px] xl:gap-7">
            <div className="xl:col-start-1 xl:row-start-1">
              <EsperanTuFirmaCard items={data.firmaItems} />
            </div>
            <div className="xl:col-start-2 xl:row-start-1">
              <AhoraCard items={data.ahoraItems} />
            </div>
            <div className="flex items-center justify-center py-4 xl:col-start-3 xl:row-start-1 xl:py-0">
              <SinapsisCore metaPercent={data.metaPercent} pulsing={pulsing} />
            </div>
            <div className="xl:col-start-1 xl:row-start-2">
              <GastoEquilibrioCard
                equilibrioCents={data.equilibrioCents}
                cobradoMesBrutoCents={data.cobradoMesBrutoCents}
              />
            </div>
            <div className="xl:col-start-2 xl:row-start-2">
              <DineroCard
                cobradoMesBrutoCents={data.cobradoMesBrutoCents}
                flujoNetoCents={data.flujoNetoCents}
                tendencia={data.tendencia}
                highlighted={pulseTarget === DICTATION_TARGET_CARD}
              />
            </div>
            <div className="xl:col-start-3 xl:row-start-2">
              <CarteraVencidaCard items={data.carteraItems} totalCents={data.carteraTotalCents} />
            </div>
          </div>
        </div>

        <VoiceDictationBar onDictationComplete={handleDictationComplete} />
      </div>
    </div>
  );
}
