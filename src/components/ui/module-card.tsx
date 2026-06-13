import * as React from "react";

import { cn } from "@/lib/utils";

export type ModuleCardVariant = "default" | "glass" | "elevated" | "flat";

const VARIANT_CLASS: Record<ModuleCardVariant, string> = {
  default: "border bg-surface-elevated shadow-soft ring-1 ring-foreground/5",
  flat: "border bg-surface-elevated",
  elevated: "border bg-surface-elevated shadow-elevated ring-1 ring-foreground/5",
  glass: "border bg-surface-elevated/70 backdrop-blur ring-1 ring-foreground/5",
};

export interface ModuleCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: ModuleCardVariant;
}

/**
 * Contenedor de módulo premium y reutilizable — fundación de la capa visual
 * "Personalizar" (1M-A). Reacciona a `data-visual-*` (preset/densidad/sombra/
 * radio/estilo de tarjeta) vía las clases `module-card` / `module-card-body`
 * y las reglas aditivas en globals.css.
 */
export function ModuleCard({ title, subtitle, badge, action, children, className, contentClassName, variant = "default" }: ModuleCardProps) {
  return (
    <div className={cn("module-card rounded-xl overflow-hidden transition-all duration-200", VARIANT_CLASS[variant], className)}>
      {(title || subtitle || badge || action) && (
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-medium truncate">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-foreground/5 text-muted-foreground">
                {badge}
              </span>
            )}
            {action}
          </div>
        </div>
      )}
      <div className={cn("module-card-body px-4 py-3", contentClassName)}>{children}</div>
    </div>
  );
}
