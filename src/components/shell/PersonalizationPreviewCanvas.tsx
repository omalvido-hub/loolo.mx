"use client";

// Vista previa en vivo del Personalizar Studio (FASE 1M-B). Mini "dashboard"
// de ejemplo, construido con los mismos componentes que usa el Dashboard real
// (ModuleCard / KpiWidget / ChartPreviewCard). No representa datos reales: vive
// dentro del documento, así que reacciona de inmediato a los atributos
// data-visual-* aplicados por VisualPreferencesProvider, igual que el
// Dashboard.

import { CalendarCheck, Wallet } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";
import { KpiWidget } from "@/components/ui/kpi-widget";
import { ChartPreviewCard } from "@/components/ui/chart-preview-card";

export function PersonalizationPreviewCanvas() {
  return (
    <div className="space-y-2">
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
          Este texto y los colores cambian al elegir otro preset, acento, densidad o estilo de tarjeta.
        </p>
      </ModuleCard>
    </div>
  );
}
