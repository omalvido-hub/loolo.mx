"use client";

import { useCountUp } from "./useCountUp";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}

// Cuenta desde 0 hasta el valor real al montar la tarjeta/header. El valor
// SIEMPRE viene del servidor (real) — esto solo anima cómo se revela.
export function AnimatedNumber({ value, format, durationMs, className }: AnimatedNumberProps) {
  const current = useCountUp(value, durationMs);
  return <span className={className}>{format(current)}</span>;
}
