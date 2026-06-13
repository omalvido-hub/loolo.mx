import * as React from "react";

import { cn } from "@/lib/utils";

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
  className?: string;
}

/**
 * Mini-tarjeta de métrica con superficie elevada y sombra suave —
 * fundación visual premium (1L-B). Reemplaza al MiniStat local de
 * PatientLiveRecordView sin cambiar su contrato (label/value/action/multiline).
 */
export function StatCard({ label, value, valueClassName, action, multiline, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface-elevated px-2.5 py-1.5 min-w-0 shadow-soft ring-1 ring-foreground/5",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn("text-sm font-semibold leading-tight", multiline ? "" : "truncate", valueClassName)}>
        {value}
      </div>
      {action && <div className="mt-0.5">{action}</div>}
    </div>
  );
}
