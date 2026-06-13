"use client";

// Vista previa en vivo del Personalizar Studio (FASE 1M-B, ampliada en 1M-D).
// Mini "dashboard" de ejemplo, construido con los mismos componentes que usa
// el Dashboard real (ModuleCard / KpiWidget / ChartPreviewCard). No representa
// datos reales: vive dentro del documento, así que reacciona de inmediato a
// los atributos data-visual-* aplicados por VisualPreferencesProvider —
// incluido el fondo (.personalization-preview-shell, igual que
// .dashboard-shell) y el bloque de marca (brandName/brandTagline/tamaño/
// estilo).

import { CalendarCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleCard } from "@/components/ui/module-card";
import { KpiWidget } from "@/components/ui/kpi-widget";
import { ChartPreviewCard } from "@/components/ui/chart-preview-card";
import { useVisualPreferences } from "@/lib/visual-preferences";

const BRAND_SIZE_CLASS: Record<string, string> = {
  compact: "text-xs",
  normal: "text-sm",
  large: "text-base",
};

export function PersonalizationPreviewCanvas() {
  const { preferences } = useVisualPreferences();
  const { brandName, brandTagline, brandSize, brandTextStyle } = preferences;

  return (
    <div className="personalization-preview-shell space-y-2 rounded-2xl p-2">
      {brandTextStyle !== "hide" && (
        <div className="brand-block flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2">
          <span className="brand-symbol flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-accent-soft text-sm font-bold text-brand-accent">
            {brandName.slice(0, 1).toUpperCase() || "N"}
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate font-semibold tracking-tight",
                BRAND_SIZE_CLASS[brandSize] ?? BRAND_SIZE_CLASS.normal,
                brandTextStyle === "lowercase" ? "lowercase" : "capitalize"
              )}
            >
              {brandName || "nelzzon"}
            </span>
            <span className="block truncate text-[10px] leading-snug text-muted-foreground">{brandTagline}</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <KpiWidget
          label="Citas de hoy"
          value="8"
          icon={<CalendarCheck className="h-4 w-4" />}
          tone="accent"
          trend={<span className="text-[10px] text-muted-foreground">Ejemplo</span>}
        />
        <KpiWidget
          label="Cobrado este mes"
          value="—"
          icon={<Wallet className="h-4 w-4" />}
          tone="muted"
          trend={<span className="text-[10px] text-muted-foreground">Ejemplo</span>}
        />
      </div>

      <ModuleCard title="Módulo grande" subtitle="Así se vería un módulo en tu Dashboard" badge="Vista previa">
        <ChartPreviewCard title="Actividad de ejemplo" kind="bars" />
      </ModuleCard>

      <ModuleCard title="Módulo pequeño" badge="Vista previa" variant="flat">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Este texto y los colores cambian al elegir otro preset, acento, densidad, estilo de tarjeta o fondo.
        </p>
      </ModuleCard>
    </div>
  );
}
