"use client";

// Renderiza la identidad visual de un módulo/KPI/widget (FASE 1M-C):
// emoji, icono profesional (lucide), iniciales o badge de color — según lo
// que el usuario eligió en Personalizar > Módulos (useModuleIdentities). Es
// un contenedor autocontenido (forma + estilo + color); KpiWidget lo recibe
// con iconWrapped={false} para no duplicar el contenedor.

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useModuleIdentities,
  MODULE_ICON_LIBRARY,
  type ModuleAccentColor,
  type ModuleIconStyle,
  type ModuleShape,
} from "@/lib/module-identity";

const COLOR_CLASSES: Record<ModuleAccentColor, { soft: string; solid: string; text: string; border: string }> = {
  teal: { soft: "bg-sky-500/10", solid: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/30" },
  violet: { soft: "bg-violet-500/10", solid: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30" },
  emerald: { soft: "bg-emerald-500/10", solid: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  amber: { soft: "bg-amber-500/10", solid: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  rose: { soft: "bg-rose-500/10", solid: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  slate: { soft: "bg-slate-500/10", solid: "bg-slate-500", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
  blue: { soft: "bg-blue-500/10", solid: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  cyan: { soft: "bg-cyan-500/10", solid: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  neutral: { soft: "bg-foreground/5", solid: "bg-foreground/70", text: "text-foreground", border: "border-foreground/20" },
};

const SHAPE_CLASS: Record<ModuleShape, string> = {
  circle: "rounded-full",
  square: "rounded-lg",
  pill: "rounded-full",
};

function containerStyleClass(style: ModuleIconStyle, color: ModuleAccentColor): string {
  const c = COLOR_CLASSES[color];
  switch (style) {
    case "outline":
      return cn("border bg-transparent", c.text, c.border);
    case "solid-soft":
      return cn(c.soft, c.text);
    case "duotone":
      return cn(c.soft, c.text, "ring-1", c.border);
    case "glass":
      return cn(c.soft, c.text, "border backdrop-blur", c.border);
    case "badge":
      return cn(c.solid, "text-white");
    case "emoji":
      return "bg-transparent";
    case "executive":
      return "border bg-muted text-foreground";
    case "clinical":
      return cn("bg-muted/40", c.text);
    case "minimal":
      return cn("bg-transparent", c.text);
    default:
      return cn(c.soft, c.text);
  }
}

export interface ModuleIconProps {
  /** Id en MODULE_IDENTITY_REGISTRY, p. ej. "kpi-citas". */
  id: string;
  /** Icono lucide de respaldo, usado si la identidad no resuelve uno propio. */
  fallbackIcon?: LucideIcon;
  className?: string;
}

export function ModuleIcon({ id, fallbackIcon: Fallback, className }: ModuleIconProps) {
  const { getIdentity } = useModuleIdentities();
  const view = getIdentity(id);
  const shapeClass = SHAPE_CLASS[view.shape];
  const styleClass = containerStyleClass(view.style, view.color);
  const sizeClass = view.shape === "pill" ? "h-8 min-w-8 px-2" : "size-8";

  let content: React.ReactNode = null;
  if (view.type === "emoji") {
    content = <span className="text-base leading-none">{view.emoji || "🟦"}</span>;
  } else if (view.type === "initials") {
    content = <span className="text-[11px] font-semibold tracking-wide">{(view.initials || "—").slice(0, 2).toUpperCase()}</span>;
  } else if (view.type === "badge") {
    content = null;
  } else {
    const entry = MODULE_ICON_LIBRARY.find((i) => i.key === view.iconKey);
    const Icon = entry?.Icon ?? Fallback;
    content = Icon ? <Icon className="h-4 w-4" /> : null;
  }

  return (
    <span className={cn("flex shrink-0 items-center justify-center", sizeClass, shapeClass, styleClass, className)}>
      {content}
    </span>
  );
}
