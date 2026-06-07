// Tarjetas KPI del dashboard. Presentacional puro: hoy no existen las consultas
// agregadas (agenda, cobros, seguimiento) que alimentarían estos números, así que
// en vez de mostrar valores vacíos ("—") cada tarjeta indica con qué módulo se
// conectará más adelante. Cuando esas consultas existan, esta cuadrícula recibe
// props reales en vez de MOCK_KPIS.

import { Users, CalendarCheck, AlertCircle, Wallet, ListChecks, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiItem {
  key: string;
  label: string;
  source: string;
  icon: React.ElementType;
  accent: string;
}

const MOCK_KPIS: KpiItem[] = [
  { key: "patients",  label: "Pacientes",   source: "Se conectará con Pacientes",   icon: Users,         accent: "bg-blue-500/10 text-blue-600" },
  { key: "today",     label: "Citas hoy",   source: "Se conectará con Agenda",      icon: CalendarCheck, accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "pending",   label: "Pendientes",  source: "Se conectará con Seguimiento", icon: AlertCircle,   accent: "bg-amber-500/10 text-amber-600" },
  { key: "billing",   label: "Cobros",      source: "Se conectará con Cobros",      icon: Wallet,        accent: "bg-violet-500/10 text-violet-600" },
  { key: "follow-up", label: "Seguimiento", source: "Se conectará con Seguimiento", icon: ListChecks,    accent: "bg-cyan-500/10 text-cyan-600" },
  { key: "alerts",    label: "Alertas",     source: "Se conectará con Avisos",      icon: Bell,          accent: "bg-rose-500/10 text-rose-600" },
];

export function DashboardKpiGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {MOCK_KPIS.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.key}
            className="rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex items-center justify-center size-9 rounded-xl", kpi.accent)}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Próximamente
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{kpi.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{kpi.source}</p>
          </div>
        );
      })}
    </div>
  );
}
