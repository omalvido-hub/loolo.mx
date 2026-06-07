// Tarjetas de widgets del dashboard. Presentacional puro: hoy no existen las
// consultas agregadas (próximas citas, pacientes recientes, finanzas, etc.) para
// esta vista, así que en vez de simular listas con guiones se usan estados vacíos
// elegantes que indican con qué módulo se conectará cada tarjeta más adelante.
// Cuando esas consultas existan, cada tarjeta recibe props/datos reales.

import { CalendarClock, UserRound, ListTodo, Wallet2, Activity, Compass } from "lucide-react";

function WidgetCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-foreground/[0.04] overflow-hidden transition-all hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.16)] ${className ?? ""}`}>
      <div className="px-5 pt-4 pb-3.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function EmptyHint({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-9 text-center">
      <span className="flex items-center justify-center size-10 rounded-full bg-muted/80 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="max-w-[230px] text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

const CONNECTING_MODULES = ["Agenda", "Consultas", "Cobros", "Seguimiento"];

export function DashboardWidgetGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <WidgetCard title="Resumen operativo" subtitle="Tu día de un vistazo" className="lg:col-span-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aquí vivirá el resumen de tu día — citas, consultas activas y pendientes de
          cobro en un solo lugar. En cuanto conectemos Agenda, Consultas y Cobros, esta
          tarjeta cobrará vida con tus datos reales.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CONNECTING_MODULES.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <Compass className="h-3 w-3" />
              Llega con {m}
            </span>
          ))}
        </div>
      </WidgetCard>

      <WidgetCard title="Próximas citas" subtitle="Vista previa">
        <EmptyHint icon={CalendarClock}>
          Aquí aparecerán tus próximas citas en cuanto conectemos Agenda.
        </EmptyHint>
      </WidgetCard>

      <WidgetCard title="Pacientes recientes" subtitle="Vista previa">
        <EmptyHint icon={UserRound}>
          Se mostrarán los pacientes que has visto recientemente al conectar Pacientes.
        </EmptyHint>
      </WidgetCard>

      <WidgetCard title="Seguimiento pendiente" subtitle="Vista previa">
        <EmptyHint icon={ListTodo}>
          Se conectará con tu bandeja de seguimiento para mostrar lo pendiente.
        </EmptyHint>
      </WidgetCard>

      <WidgetCard title="Finanzas rápidas" subtitle="Los montos siempre los calcula el servidor">
        <EmptyHint icon={Wallet2}>
          Se conectará con Cobros para mostrar tus saldos cobrados y pendientes.
        </EmptyHint>
      </WidgetCard>

      <WidgetCard title="Actividad reciente" subtitle="Vista previa">
        <EmptyHint icon={Activity}>
          Aquí aparecerá la actividad reciente de tu organización.
        </EmptyHint>
      </WidgetCard>
    </div>
  );
}
