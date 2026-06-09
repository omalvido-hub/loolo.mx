// Tarjetas KPI del dashboard. Presentacional puro: hoy no existen las consultas
// agregadas (agenda, cobros, seguimiento) que alimentarían estos números, así que
// en vez de mostrar valores vacíos ("—") cada tarjeta indica con qué módulo se
// conectará más adelante. Cuando esas consultas existan, esta cuadrícula recibe
// props reales en vez de MOCK_KPIS.

import Link from "next/link";
import { Users, CalendarCheck, AlertCircle, Wallet, ListChecks, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiItem {
  key: string;
  label: string;
  source: string;
  href: string;
  icon: React.ElementType;
  accent: string;
}

const MOCK_KPIS: KpiItem[] = [
  { key: "patients",  label: "Pacientes",   source: "Se conectará con Pacientes",   href: "/pacientes", icon: Users,         accent: "bg-blue-500/10 text-blue-600" },
  { key: "today",     label: "Citas hoy",   source: "Se conectará con Agenda",      href: "/agenda",    icon: CalendarCheck, accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "pending",   label: "Pendientes",  source: "Se conectará con Seguimiento", href: "/agenda",    icon: AlertCircle,   accent: "bg-amber-500/10 text-amber-600" },
  { key: "billing",   label: "Cobros",      source: "Se conectará con Cobros",      href: "/cobros",    icon: Wallet,        accent: "bg-violet-500/10 text-violet-600" },
  { key: "follow-up", label: "Seguimiento", source: "Se conectará con Seguimiento", href: "/agenda",    icon: ListChecks,    accent: "bg-cyan-500/10 text-cyan-600" },
  { key: "alerts",    label: "Alertas",     source: "Se conectará con Avisos",      href: "/pacientes", icon: Bell,          accent: "bg-rose-500/10 text-rose-600" },
];

export function DashboardKpiGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {MOCK_KPIS.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Link
            key={kpi.key}
            href={kpi.href}
            className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.2)] hover:ring-foreground/10 cursor-pointer"
          >
            <Icon
              aria-hidden
              className="pointer-events-none absolute -right-3 -bottom-3 h-16 w-16 rotate-[-12deg] text-foreground/[0.035] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110"
              strokeWidth={1.25}
            />

            <span className={cn("relative flex items-center justify-center size-10 rounded-2xl transition-transform group-hover:scale-105", kpi.accent)}>
              <Icon className="h-[18px] w-[18px]" />
            </span>

            <p className="relative mt-4 text-sm font-semibold tracking-tight">{kpi.label}</p>

            <div className="relative mt-2.5 flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/20" />
                <span className="relative inline-flex size-1.5 rounded-full bg-foreground/30" />
              </span>
              <p className="text-[11px] leading-snug text-muted-foreground">{kpi.source}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
