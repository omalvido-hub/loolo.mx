import * as React from "react";

import { cn } from "@/lib/utils";

export type StatCardTone = "accent" | "success" | "warning" | "muted";

/** Estilo por tono: barra superior + tinte de superficie + color de etiqueta, sutiles. */
const TONE_STYLES: Record<StatCardTone, { bar: string; surface: string; label: string }> = {
  accent: {
    bar: "bg-brand-accent",
    surface: "bg-brand-accent-soft/50",
    label: "text-brand-accent",
  },
  success: {
    bar: "bg-emerald-500/70 dark:bg-emerald-400/60",
    surface: "bg-emerald-50/60 dark:bg-emerald-950/20",
    label: "text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    bar: "bg-amber-400/70 dark:bg-amber-400/50",
    surface: "bg-amber-50/60 dark:bg-amber-950/20",
    label: "text-amber-700 dark:text-amber-400",
  },
  muted: {
    bar: "bg-foreground/10",
    surface: "",
    label: "text-muted-foreground",
  },
};

export interface StatCardProps {
  /** Etiqueta corta en mayúsculas, p. ej. "Próxima cita". */
  label: string;
  /** Valor principal de la métrica. */
  value: React.ReactNode;
  /** Clases adicionales para el valor (p. ej. color semántico). */
  valueClassName?: string;
  /** Acción o detalle secundario bajo el valor (p. ej. un link). */
  action?: React.ReactNode;
  /** Si el valor ocupa varias líneas (p. ej. fecha + hora), no se trunca a una sola línea. */
  multiline?: boolean;
  /** Acento visual del módulo: barra superior + tinte muy sutil de superficie. Default "muted". */
  tone?: StatCardTone;
  className?: string;
}

/**
 * Mini-tarjeta de métrica con superficie elevada, sombra suave y acento de
 * tono — fundación visual premium (1L-B / 1L-B2). Mismo contrato que el
 * MiniStat original (label/value/action/multiline), con `tone` opcional
 * para dar carácter visual sin tocar lógica.
 */
export function StatCard({ label, value, valueClassName, action, multiline, tone = "muted", className }: StatCardProps) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-elevated px-2.5 pb-1.5 pt-2.5 min-w-0 shadow-soft ring-1 ring-foreground/5",
        t.surface,
        className
      )}
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", t.bar)} />
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", t.label)}>{label}</p>
      <div className={cn("text-sm font-semibold leading-tight mt-0.5", multiline ? "" : "truncate", valueClassName)}>
        {value}
      </div>
      {action && <div className="mt-1 pt-1 border-t border-foreground/5">{action}</div>}
    </div>
  );
}
