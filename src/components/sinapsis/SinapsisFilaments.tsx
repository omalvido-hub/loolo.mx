"use client";

import { useEffect, useState, type RefObject } from "react";

interface Point {
  x: number;
  y: number;
}

interface SinapsisFilamentsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  pulsing: boolean;
  targetCardId?: string | null;
}

// Mide de verdad la posición del núcleo y de las tarjetas dentro del
// contenedor (getBoundingClientRect) y dibuja los filamentos entre ellos.
// No son coordenadas fijas: si el layout cambia (responsive, personalización,
// tarjeta oculta), las líneas se recalculan solas. En reposo, cada filamento
// lleva un flujo de luz continuo y sutil; al dictar, el filamento hacia la
// tarjeta que se está actualizando se enciende con un pulso más brillante.
export function SinapsisFilaments({ containerRef, pulsing, targetCardId }: SinapsisFilamentsProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const box = container.getBoundingClientRect();
      setSize({ width: box.width, height: box.height });

      const coreEl = container.querySelector<HTMLElement>("[data-sinapsis-core]");
      if (!coreEl) {
        setPaths([]);
        return;
      }
      const coreBox = coreEl.getBoundingClientRect();
      const core: Point = { x: coreBox.left + coreBox.width / 2 - box.left, y: coreBox.bottom - box.top };

      const cardEls = Array.from(container.querySelectorAll<HTMLElement>("[data-sinapsis-card]"));
      const next = cardEls.map((el) => {
        const cardBox = el.getBoundingClientRect();
        const target: Point = { x: cardBox.left + cardBox.width / 2 - box.left, y: cardBox.top - box.top };
        const midY = core.y + (target.y - core.y) * 0.5;
        return {
          id: el.getAttribute("data-sinapsis-card") ?? "",
          d: `M ${core.x} ${core.y} C ${core.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`,
        };
      });
      setPaths(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef]);

  if (size.width === 0 || paths.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
    >
      <defs>
        <linearGradient id="sinapsis-filament" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(63,233,180,0.34)" />
          <stop offset="100%" stopColor="rgba(63,233,180,0.08)" />
        </linearGradient>
      </defs>
      {paths.map((p) => {
        const isTarget = pulsing && (targetCardId ? p.id === targetCardId : true);
        return (
          <g key={p.id}>
            <path
              d={p.d}
              fill="none"
              stroke="url(#sinapsis-filament)"
              strokeWidth={1.1}
              strokeLinecap="round"
              className="sinapsis-filament-idle"
            />
            {isTarget && (
              <>
                <path
                  d={p.d}
                  fill="none"
                  stroke="#3FE9B4"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  className="sinapsis-filament-pulse"
                  style={{ filter: "drop-shadow(0 0 8px #3FE9B4)" }}
                />
                <circle r={3} fill="#3FE9B4" style={{ filter: "drop-shadow(0 0 6px #3FE9B4)" }}>
                  <animateMotion dur="1.3s" repeatCount="1" path={p.d} />
                </circle>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
