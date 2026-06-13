import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icono pequeño dentro de un marcador circular sutil. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Acción sugerida (p. ej. un link), sin inventar funcionalidad nueva. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vacío premium — superficie elevada + sombra suave, en vez de un
 * recuadro punteado tipo maqueta. Fundación visual (1L-C).
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface-elevated shadow-soft ring-1 ring-foreground/5 px-6 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
