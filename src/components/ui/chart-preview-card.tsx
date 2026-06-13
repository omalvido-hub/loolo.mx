import * as React from "react";

import { cn } from "@/lib/utils";

export type ChartPreviewKind = "bars" | "donut" | "sparkline";

const BAR_HEIGHTS = [40, 65, 30, 80, 50, 70, 45];

function MiniBars() {
  return (
    <div className="flex h-16 items-end gap-1" aria-hidden>
      {BAR_HEIGHTS.map((h, i) => (
        <span key={i} className="flex-1 rounded-sm bg-brand-accent/30" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function MiniDonut() {
  return (
    <div className="flex h-16 items-center justify-center" aria-hidden>
      <div
        className="size-14 rounded-full"
        style={{ background: "conic-gradient(var(--brand-accent) 0deg 150deg, var(--brand-accent-soft) 150deg 360deg)" }}
      />
    </div>
  );
}

function MiniSparkline() {
  return (
    <svg viewBox="0 0 100 32" className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points="0,28 15,20 30,24 45,10 60,16 75,6 90,12 100,4"
        fill="none"
        stroke="var(--brand-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ChartPreviewCardProps {
  title: string;
  description?: string;
  kind?: ChartPreviewKind;
  className?: string;
}

/**
 * Tarjeta de gráfico decorativo — fundación de la capa visual "Personalizar"
 * (1M-A). Siempre se marca como "Vista previa": no representa ingresos,
 * citas ni ninguna métrica operativa real. Reacciona a `data-visual-*` vía
 * la clase `chart-preview-card`.
 */
export function ChartPreviewCard({ title, description, kind = "bars", className }: ChartPreviewCardProps) {
  return (
    <div className={cn("chart-preview-card rounded-xl border bg-surface-elevated shadow-soft ring-1 ring-foreground/5 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Vista previa
        </span>
      </div>
      <div className="mt-2">
        {kind === "bars" && <MiniBars />}
        {kind === "donut" && <MiniDonut />}
        {kind === "sparkline" && <MiniSparkline />}
      </div>
      {description && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{description}</p>}
    </div>
  );
}
