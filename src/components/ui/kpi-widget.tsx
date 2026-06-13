import * as React from "react";

import { cn } from "@/lib/utils";
import type {
  ModuleIconPosition,
  ModuleIconSize,
  ModuleContentAlign,
  ModuleCardAppearance,
  ModuleCardBackground,
  ModuleCardBorder,
  ModuleCardShadow,
} from "@/lib/module-identity";

export type KpiWidgetTone = "default" | "accent" | "success" | "warning" | "danger" | "muted";

const TONE_CLASS: Record<KpiWidgetTone, { icon: string; bar: string }> = {
  default: { icon: "bg-foreground/5 text-foreground", bar: "bg-foreground/10" },
  accent: { icon: "bg-brand-accent-soft text-brand-accent", bar: "bg-brand-accent/70" },
  success: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500/70 dark:bg-emerald-400/60" },
  warning: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "bg-amber-400/70 dark:bg-amber-400/50" },
  danger: { icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400", bar: "bg-rose-500/70 dark:bg-rose-400/50" },
  muted: { icon: "bg-muted text-muted-foreground", bar: "bg-foreground/10" },
};

export interface KpiWidgetProps {
  /** Etiqueta corta en mayúsculas, p. ej. "Citas de hoy". */
  label: string;
  /** Valor principal — viene siempre de datos ya calculados, nunca inventado aquí. */
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: KpiWidgetTone;
  /** Detalle adicional corto (p. ej. un link o variación), opcional. */
  trend?: React.ReactNode;
  className?: string;
  /**
   * Si es `false`, `icon` se renderiza tal cual, sin el contenedor con tono
   * (size-8/rounded-lg/color). Úsalo cuando `icon` ya es autocontenido, p. ej.
   * `ModuleIcon` (FASE 1M-C). Por defecto `true`.
   */
  iconWrapped?: boolean;

  // FASE 1M-E — personalización avanzada por KPI/widget. "auto" deja que el
  // estilo global (data-visual-dashboard-card / dock) decida.
  iconPosition?: ModuleIconPosition;
  iconSize?: ModuleIconSize;
  contentAlign?: ModuleContentAlign;
  cardAppearance?: ModuleCardAppearance;
  cardBackground?: ModuleCardBackground;
  cardBorder?: ModuleCardBorder;
  cardShadow?: ModuleCardShadow;
}

/**
 * Tarjeta de indicador reutilizable — fundación de la capa visual
 * "Personalizar" (1M-A). Reacciona a `data-visual-*` vía la clase
 * `kpi-widget` y las reglas aditivas en globals.css. Solo representa datos
 * que recibe por props; no calcula ni inventa cifras.
 */
export function KpiWidget({
  label,
  value,
  description,
  icon,
  tone = "default",
  trend,
  className,
  iconWrapped = true,
  iconPosition = "auto",
  iconSize = "auto",
  contentAlign = "auto",
  cardAppearance = "auto",
  cardBackground = "auto",
  cardBorder = "auto",
  cardShadow = "auto",
}: KpiWidgetProps) {
  const t = TONE_CLASS[tone];
  const showIcon = !!icon && iconPosition !== "none";
  const isWatermark = iconPosition === "watermark";
  const isCenterLarge = iconPosition === "center-large";

  const renderedIcon = (
    <>
      {icon && iconWrapped && (
        <span className={cn("flex items-center justify-center size-8 rounded-lg", t.icon)}>{icon}</span>
      )}
      {icon && !iconWrapped && icon}
    </>
  );

  return (
    <div
      className={cn("kpi-widget relative overflow-hidden rounded-xl border bg-surface-elevated shadow-soft ring-1 ring-foreground/5 p-3", className)}
      data-card-appearance={cardAppearance}
      data-card-background={cardBackground}
      data-card-border={cardBorder}
      data-card-shadow={cardShadow}
      data-icon-position={iconPosition}
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[2px]", t.bar)} />

      {showIcon && isWatermark && (
        <span aria-hidden className="kpi-widget-icon kpi-widget-icon-watermark" data-icon-size={iconSize}>
          {renderedIcon}
        </span>
      )}

      {showIcon && isCenterLarge && (
        <div className="kpi-widget-icon kpi-widget-icon-center" data-icon-size={iconSize}>
          {renderedIcon}
        </div>
      )}

      <div
        className={cn("kpi-widget-content relative flex items-start justify-between gap-2", isCenterLarge && "flex-col items-center text-center")}
        data-content-align={contentAlign}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight truncate">{value}</p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground truncate">{description}</p>}
        </div>
        {showIcon && !isWatermark && !isCenterLarge && (
          <span className="kpi-widget-icon shrink-0" data-icon-position={iconPosition} data-icon-size={iconSize}>
            {renderedIcon}
          </span>
        )}
      </div>
      {trend && <div className="relative mt-2 text-xs">{trend}</div>}
    </div>
  );
}
