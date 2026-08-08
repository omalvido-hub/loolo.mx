"use client";

import { AnimatedNumber } from "./AnimatedNumber";

interface SinapsisCoreProps {
  metaPercent: number | null;
  pulsing?: boolean;
}

// Núcleo central: el % de meta del mes. Sin meta configurada, lo dice
// honestamente en vez de mostrar un círculo de progreso falso. Respira solo
// (halo con latido lento) y su anillo orbital gira siempre, sin depender del
// pulso de dictado — ese pulso solo añade un destello extra momentáneo.
export function SinapsisCore({ metaPercent, pulsing }: SinapsisCoreProps) {
  const pct = metaPercent ?? 0;
  const circumference = 2 * Math.PI * 82;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative flex size-[140px] shrink-0 items-center justify-center">
      <div
        aria-hidden
        className="sinapsis-core-breathe pointer-events-none absolute -inset-3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(63,233,180,.22), transparent 70%)", filter: "blur(6px)" }}
      />

      <div
        data-sinapsis-core
        className="relative flex size-full items-center justify-center rounded-full transition-shadow duration-500"
        style={{
          background: "radial-gradient(circle at 40% 32%, #12241E, #050A08 72%)",
          boxShadow: pulsing
            ? "0 30px 70px -24px rgba(0,0,0,1), 0 0 96px rgba(63,233,180,.55), 0 0 0 1px rgba(63,233,180,.5), inset 0 1px 0 rgba(255,255,255,.1)"
            : "0 30px 70px -24px rgba(0,0,0,1), 0 0 50px rgba(63,233,180,.18), inset 0 1px 0 rgba(255,255,255,.07)",
        }}
      >
        <svg className="sinapsis-core-orbit absolute -inset-4 size-[calc(100%+32px)]" viewBox="0 0 176 176">
          <circle cx="88" cy="88" r="82" fill="none" stroke="rgba(63,233,180,0.18)" strokeWidth="1" strokeDasharray="5 14" />
          <circle cx="88" cy="6" r="3" fill="#3FE9B4" style={{ filter: "drop-shadow(0 0 6px #3FE9B4)" }} />
        </svg>

        <svg viewBox="0 0 176 176" className="absolute inset-0 size-full -rotate-90">
          {metaPercent !== null && (
            <circle
              cx="88"
              cy="88"
              r="82"
              fill="none"
              stroke="#3FE9B4"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              opacity={0.55}
            />
          )}
        </svg>

        <div className="relative flex flex-col items-center">
          <span className="text-[8px] tracking-[0.28em] text-white/35" style={{ fontFamily: "var(--sn-mono)" }}>
            NÚCLEO
          </span>
          <span className="mt-1.5 text-[21px] leading-none tabular-nums text-white" style={{ fontFamily: "var(--sn-serif)" }}>
            {metaPercent === null ? "—" : <AnimatedNumber value={metaPercent} format={(n) => `${Math.round(n)}%`} />}
          </span>
          <span className="mt-1 text-[8.5px] text-[#3FE9B4]" style={{ fontFamily: "var(--sn-mono)" }}>
            {metaPercent === null ? "SIN META" : "DE META"}
          </span>
        </div>
      </div>
    </div>
  );
}
