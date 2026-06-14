"use client";

// KPI rail del dashboard — 8 tarjetas compactas (4 arriba + 2x2 abajo),
// estilo plano aprobado: icono pequeño junto a la etiqueta, icono de info en
// la esquina, valor grande, chip de estado al pie. "Citas de hoy" usa datos
// reales de Agenda. El resto muestra estado honesto (chip "Pendiente"/
// "Configurable") hasta tener agregaciones seguras (Cobros, Tratamientos,
// Presupuestos, metas). Nunca se inventan montos.
//
// FASE 1M-A: las tarjetas se renderizan con KPIWidget (componente reutilizable
// de la capa "Personalizar"), reaccionando a data-visual-* sin cambiar los
// datos ni la fuente de cada KPI.
//
// FASE 1M-C: el icono de cada tarjeta viene de ModuleIcon (identidad visual
// elegida en Personalizar > Módulos); si esa identidad marca el widget como
// oculto, la tarjeta no se renderiza. Datos y lógica sin cambios.

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
  Info,
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

// Color del badge circular de icono, por tarjeta — coincide con la
// referencia aprobada (un color pastel distinto por KPI).
const ICON_BADGE_CLASS: Record<string, string> = {
  "kpi-citas": "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  "kpi-cobrado": "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  "kpi-tratamientos": "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  "kpi-ingresos": "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  "kpi-porcobrar": "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  "kpi-punto-equilibrio": "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  "kpi-presupuestos": "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  "kpi-meta-mensual": "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

function IconBadge({ cardId, children }: { cardId: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full size-6",
        ICON_BADGE_CLASS[cardId] ?? "bg-foreground/5 text-foreground"
      )}
    >
      {children}
    </span>
  );
}

// Tarjeta compacta — estilo plano aprobado: icono pequeño junto a la
// etiqueta, icono de info en la esquina, valor grande y chip de estado al pie.
// Las 8 tarjetas del Dashboard usan esta misma forma (4 arriba + 2x2 abajo).
export function KpiCard({ cardId, icon: Icon, label, value, status, footer, href }: CardProps) {
  const { getIdentity } = useModuleIdentities();
  if (getIdentity(cardId).hidden) return null;
  const identity = getIdentity(cardId);

  const widget = (
    <KpiWidget
      label={label}
      value={value}
      icon={
        <IconBadge cardId={cardId}>
          <ModuleIcon id={cardId} fallbackIcon={Icon} className="size-3.5" />
        </IconBadge>
      }
      iconWrapped={false}
      tone={STATUS_TONE[status]}
      trend={<StatusTrend status={status} footer={footer} />}
      cornerAccessory={<Info className="size-3.5" />}
      className={cn("flex h-[96px] sm:h-[104px] flex-col justify-between", !href && "opacity-90")}
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
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
    <KpiCard
      cardId="kpi-meta-mensual"
      icon={Target}
      label="Meta mensual"
      value="—"
      status="Configurable"
      footer="Configurar"
    />
  );
}
