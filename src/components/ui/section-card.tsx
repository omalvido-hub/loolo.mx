import * as React from "react";

import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  /** Aviso corto ("Resumen") junto al título — aclara que el detalle completo vive en otra parte. */
  badge?: string;
  /** Texto bajo el título, p.ej. apuntando a dónde está el detalle completo. */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Tarjeta de sección con superficie elevada y sombra suave — fundación
 * visual premium (1L-B). Mismo contrato que el SectionCard local de
 * PatientLiveRecordView (title/badge/hint/children), disponible para
 * reutilizarse en otras pantallas.
 */
export function SectionCard({ title, badge, hint, children, className }: SectionCardProps) {
  return (
    <div className={cn("rounded-xl border bg-surface-elevated text-sm ring-1 ring-foreground/10 shadow-soft overflow-hidden", className)}>
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-base">{title}</h2>
          {badge && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-foreground/5 text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}
