"use client";

import { useEffect, useRef, useState } from "react";

const EASE_OUT_QUART = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Cuenta de 0 hasta `target` una sola vez al montar (o cuando `target`
 * cambia), con ease-out. Si el usuario pidió reducir movimiento
 * (prefers-reduced-motion), salta directo al valor final.
 */
export function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(from + (to - from) * EASE_OUT_QUART(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
