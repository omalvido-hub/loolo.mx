"use client";

// FASE 1M-F — Envuelve las 8 tarjetas KPI del Dashboard en una sola grilla
// (grid-cols-2 sm:grid-cols-4) y las renderiza en el orden elegido en
// "Acomoda tu dashboard" (useDashboardLayout). Cada tarjeta sigue decidiendo
// su propia visibilidad (módulos ocultos) y tamaño (col-span); aquí solo se
// fija el orden.

import { cn } from "@/lib/utils";
import { useDashboardLayout, type DashboardCardId } from "@/lib/dashboard-layout";
import {
  CitasHoyKpi,
  CobradoMesKpi,
  PorCobrarKpi,
  PresupuestosPendientesKpi,
  TratamientosActivosKpi,
  IngresosMesKpi,
  PuntoEquilibrioKpi,
  MetaMensualKpi,
} from "@/components/dashboard/DashboardKpiGrid";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
  className?: string;
}

export function DashboardKpiOrderedGrid({ appointmentsToday, className }: Props) {
  const { layout } = useDashboardLayout();

  const cards: Record<DashboardCardId, React.ReactNode> = {
    "kpi-citas": <CitasHoyKpi appointmentsToday={appointmentsToday} />,
    "kpi-cobrado": <CobradoMesKpi />,
    "kpi-porcobrar": <PorCobrarKpi />,
    "kpi-presupuestos": <PresupuestosPendientesKpi />,
    "kpi-tratamientos": <TratamientosActivosKpi />,
    "kpi-ingresos": <IngresosMesKpi />,
    "kpi-punto-equilibrio": <PuntoEquilibrioKpi />,
    "kpi-meta-mensual": <MetaMensualKpi />,
  };

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {layout.order.map((id) => (
        <div key={id} className="contents">
          {cards[id as DashboardCardId]}
        </div>
      ))}
    </div>
  );
}
