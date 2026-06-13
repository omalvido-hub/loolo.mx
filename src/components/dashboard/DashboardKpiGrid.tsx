"use client";

// KPI rail del dashboard — Dashboard Final v3 (pase visual DS-PHASE-A).
// Cada bloque combina 2 tarjetas verticales (portrait) + 2 horizontales
// compactas. "Citas de hoy" usa datos reales de Agenda. El resto muestra
// estado honesto (chip "Pendiente"/"Configurable") hasta tener agregaciones
// seguras (Cobros, Tratamientos, Presupuestos, metas). Nunca se inventan montos.
//
// FASE 1M-A: las tarjetas se renderizan con KPIWidget (componente reutilizable
// de la capa "Personalizar"), reaccionando a data-visual-* sin cambiar los
// datos ni la fuente de cada KPI.
//
// FASE 1M-C: el icono de cada tarjeta viene de ModuleIcon (identidad visual
// elegida en Personalizar > Módulos); si esa identidad marca el widget como
// oculto, la tarjeta no se renderiza. Datos y lógica sin cambios.
//
// DS-PHASE-A: tarjetas más compactas, sin "Ver…"/flechas/divisores internos,
// con un badge de icono tipo "clay" (degradado pastel + sombra suave) por
// encima del ModuleIcon — solo estilo, sin tocar datos ni personalización.

import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  CircleDollarSign,
  FileText,
  ClipboardList,
  TrendingUp,
  Scale,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiWidget, type KpiWidgetTone } from "@/components/ui/kpi-widget";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useModuleIdentities } from "@/lib/module-identity";
import type { AppointmentListItem } from "@/server/domain/agenda/queries";

const APPT_STATUS_ES: Record<string, string> = {
  SCHEDULED: "programadas",
  CONFIRMED: "confirmadas",
  COMPLETED: "completadas",
  CANCELED: "canceladas",
  NO_SHOW: "no presentadas",
  RESCHEDULED: "reagendadas",
};

type KpiStatus = "Activo" | "Pendiente" | "Configurable";

const STATUS_CHIP_CLASS: Record<KpiStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  Pendiente: "bg-muted/60 text-muted-foreground",
  Configurable: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400",
};

// Tono del KPIWidget según estado: "Activo" usa el acento de personalización
// (se nota al cambiar preset/acento), el resto queda neutro hasta tener datos.
const STATUS_TONE: Record<KpiStatus, KpiWidgetTone> = {
  Activo: "accent",
  Pendiente: "muted",
  Configurable: "muted",
};

// Degradados pastel tipo "clay" para el badge de icono de cada tarjeta —
// puramente decorativos, uno por cardId. El ModuleIcon real (con su propio
// estilo de personalización) vive dentro del badge.
const ICON_BADGE_GRADIENT: Record<string, string> = {
  "kpi-citas": "from-sky-200 to-sky-400 dark:from-sky-500/30 dark:to-sky-800/40",
  "kpi-cobrado": "from-emerald-200 to-emerald-400 dark:from-emerald-500/30 dark:to-emerald-800/40",
  "kpi-porcobrar": "from-amber-200 to-amber-400 dark:from-amber-500/30 dark:to-amber-800/40",
  "kpi-presupuestos": "from-violet-200 to-violet-400 dark:from-violet-500/30 dark:to-violet-800/40",
  "kpi-tratamientos": "from-cyan-200 to-cyan-400 dark:from-cyan-500/30 dark:to-cyan-800/40",
  "kpi-ingresos": "from-teal-200 to-teal-400 dark:from-teal-500/30 dark:to-teal-800/40",
  "kpi-punto-equilibrio": "from-slate-200 to-slate-400 dark:from-slate-500/30 dark:to-slate-800/40",
  "kpi-meta-mensual": "from-rose-200 to-rose-400 dark:from-rose-500/30 dark:to-rose-800/40",
};

function IconBadge({ cardId, size, children }: { cardId: string; size: "lg" | "md"; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ring-1 ring-white/60 dark:ring-white/10",
        size === "lg" ? "size-11" : "size-9",
        ICON_BADGE_GRADIENT[cardId] ?? "from-foreground/5 to-foreground/15"
      )}
    >
      {children}
    </span>
  );
}

interface CardProps {
  cardId: string;
  icon: LucideIcon;
  label: string;
  value: string;
  status: KpiStatus;
  footer: string;
  href?: string;
}

// Línea de estado al pie de la tarjeta — sin divisor, sin "Ver…" ni flecha.
function StatusTrend({ status, footer }: Pick<CardProps, "status" | "footer">) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide", STATUS_CHIP_CLASS[status])}>
        {status}
      </span>
      <span className="truncate text-[11px] font-medium text-muted-foreground">{footer}</span>
    </div>
  );
}

// Tarjeta vertical tipo portrait — para los 2 KPIs principales de cada bloque.
export function VerticalKpiCard({ cardId, icon: Icon, label, value, status, footer, href }: CardProps) {
  const { getIdentity } = useModuleIdentities();
  if (getIdentity(cardId).hidden) return null;
  const identity = getIdentity(cardId);

  const widget = (
    <KpiWidget
      label={label}
      value={value}
      icon={
        <IconBadge cardId={cardId} size="lg">
          <ModuleIcon id={cardId} fallbackIcon={Icon} />
        </IconBadge>
      }
      iconWrapped={false}
      tone={STATUS_TONE[status]}
      trend={<StatusTrend status={status} footer={footer} />}
      className={cn("flex h-[148px] sm:h-[164px] flex-col justify-between", !href && "opacity-90")}
      iconPosition={identity.iconPosition}
      iconSize={identity.iconSize}
      contentAlign={identity.contentAlign}
      cardAppearance={identity.cardAppearance}
      cardBackground={identity.cardBackground}
      cardBorder={identity.cardBorder}
      cardShadow={identity.cardShadow}
    />
  );

  if (!href) {
    return <div data-dashboard-card={cardId}>{widget}</div>;
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className="block cursor-pointer">
      {widget}
    </Link>
  );
}

// Tarjeta horizontal compacta — para los 2 KPIs secundarios de cada bloque.
export function HorizontalKpiCard({ cardId, icon: Icon, label, value, status, footer, href }: CardProps) {
  const { getIdentity } = useModuleIdentities();
  if (getIdentity(cardId).hidden) return null;
  const identity = getIdentity(cardId);

  const widget = (
    <KpiWidget
      label={label}
      value={value}
      icon={
        <IconBadge cardId={cardId} size="md">
          <ModuleIcon id={cardId} fallbackIcon={Icon} />
        </IconBadge>
      }
      iconWrapped={false}
      tone={STATUS_TONE[status]}
      trend={<StatusTrend status={status} footer={footer} />}
      className={cn("flex h-[84px] sm:h-[92px] flex-col justify-between", !href && "opacity-90")}
      iconPosition={identity.iconPosition}
      iconSize={identity.iconSize}
      contentAlign={identity.contentAlign}
      cardAppearance={identity.cardAppearance}
      cardBackground={identity.cardBackground}
      cardBorder={identity.cardBorder}
      cardShadow={identity.cardShadow}
    />
  );

  if (!href) {
    return <div data-dashboard-card={cardId}>{widget}</div>;
  }

  return (
    <Link data-dashboard-card={cardId} href={href} className="block cursor-pointer">
      {widget}
    </Link>
  );
}

interface Props {
  appointmentsToday: AppointmentListItem[] | null;
}

// Bloque 1 — vertical 1: Citas de hoy (REAL vía agenda/queries.ts).
export function CitasHoyKpi({ appointmentsToday }: Props) {
  let citasValue = "—";
  let citasFooter = "Agenda de hoy";

  if (appointmentsToday !== null) {
    const n = appointmentsToday.length;
    citasValue = String(n);

    if (n > 0) {
      const counts = new Map<string, number>();
      for (const a of appointmentsToday) {
        counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
      }
      const [topStatus, topCount] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      citasFooter = `${topCount} ${APPT_STATUS_ES[topStatus] ?? topStatus.toLowerCase()}`;
    }
  }

  return (
    <VerticalKpiCard
      cardId="kpi-citas"
      icon={CalendarCheck}
      label="Citas de hoy"
      value={citasValue}
      status="Activo"
      footer={citasFooter}
      href="/agenda"
    />
  );
}

// Bloque 1 — vertical 2: Cobrado este mes.
export function CobradoMesKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-cobrado"
      icon={Wallet}
      label="Cobrado este mes"
      value="—"
      status="Pendiente"
      footer="Este mes"
      href="/cobros"
    />
  );
}

// Bloque 1 — horizontal 1: Por cobrar.
export function PorCobrarKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-porcobrar"
      icon={CircleDollarSign}
      label="Por cobrar"
      value="—"
      status="Pendiente"
      footer="Pendiente de cobro"
      href="/cobros"
    />
  );
}

// Bloque 1 — horizontal 2: Presupuestos pendientes.
export function PresupuestosPendientesKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-presupuestos"
      icon={FileText}
      label="Presupuestos pendientes"
      value="—"
      status="Pendiente"
      footer="En revisión"
      href="/presupuestos"
    />
  );
}

// Bloque 2 — vertical 1: Tratamientos activos.
export function TratamientosActivosKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-tratamientos"
      icon={ClipboardList}
      label="Tratamientos activos"
      value="—"
      status="Pendiente"
      footer="Pendiente"
    />
  );
}

// Bloque 2 — vertical 2: Ingresos del mes.
export function IngresosMesKpi() {
  return (
    <VerticalKpiCard
      cardId="kpi-ingresos"
      icon={TrendingUp}
      label="Ingresos del mes"
      value="—"
      status="Pendiente"
      footer="Este mes"
    />
  );
}

// Bloque 2 — horizontal 1: Punto de equilibrio.
export function PuntoEquilibrioKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-punto-equilibrio"
      icon={Scale}
      label="Punto de equilibrio"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}

// Bloque 2 — horizontal 2: Meta mensual.
export function MetaMensualKpi() {
  return (
    <HorizontalKpiCard
      cardId="kpi-meta-mensual"
      icon={Target}
      label="Meta mensual"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}
