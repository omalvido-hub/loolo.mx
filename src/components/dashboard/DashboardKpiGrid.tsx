// Tarjetas KPI del dashboard. Presentacional puro, con datos de muestra (mock):
// el backend de agenda/cobros/seguimiento aún no expone estos agregados a esta vista.
// Cuando existan esas consultas, esta cuadrícula recibe props reales en vez de MOCK_KPIS.

import { Users, CalendarCheck, AlertCircle, Wallet, ListChecks, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiItem {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  accent: string;
}

const MOCK_KPIS: KpiItem[] = [
  { key: "patients",  label: "Pacientes",     value: "—", hint: "Total en la organización",        icon: Users,         accent: "bg-blue-500/10 text-blue-600" },
  { key: "today",     label: "Citas hoy",     value: "—", hint: "Agendadas para hoy",              icon: CalendarCheck, accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "pending",   label: "Pendientes",    value: "—", hint: "Tareas y conversaciones abiertas",icon: AlertCircle,   accent: "bg-amber-500/10 text-amber-600" },
  { key: "billing",   label: "Cobros",        value: "—", hint: "Saldo por cobrar este mes",       icon: Wallet,        accent: "bg-violet-500/10 text-violet-600" },
  { key: "follow-up", label: "Seguimiento",   value: "—", hint: "Pacientes en seguimiento activo", icon: ListChecks,    accent: "bg-cyan-500/10 text-cyan-600" },
  { key: "alerts",    label: "Alertas",       value: "—", hint: "Avisos que requieren atención",   icon: Bell,          accent: "bg-rose-500/10 text-rose-600" },
];

export function DashboardKpiGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {MOCK_KPIS.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.key}
            className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className={cn("flex items-center justify-center size-9 rounded-lg", kpi.accent)}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="text-sm font-medium mt-0.5">{kpi.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
