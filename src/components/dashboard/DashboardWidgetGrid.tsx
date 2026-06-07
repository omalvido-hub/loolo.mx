// Tarjetas de widgets del dashboard. Presentacional puro, con datos de muestra (mock):
// hoy no existen las consultas agregadas (próximas citas, pacientes recientes, etc.)
// para esta vista. Cuando existan, cada tarjeta recibe props reales.

const MOCK_UPCOMING_APPOINTMENTS = [
  { time: "—:—", patient: "Sin datos todavía", note: "La agenda alimentará esta lista" },
  { time: "—:—", patient: "Sin datos todavía", note: "La agenda alimentará esta lista" },
  { time: "—:—", patient: "Sin datos todavía", note: "La agenda alimentará esta lista" },
];

const MOCK_RECENT_PATIENTS = [
  { name: "Sin datos todavía", detail: "Aparecerán aquí los pacientes vistos recientemente" },
  { name: "Sin datos todavía", detail: "Aparecerán aquí los pacientes vistos recientemente" },
];

const MOCK_FOLLOW_UPS = [
  { label: "Sin seguimientos pendientes mostrados todavía", count: "—" },
  { label: "Conectaremos esto a la bandeja de seguimiento", count: "—" },
];

const MOCK_RECENT_ACTIVITY = [
  "Aquí aparecerá la actividad reciente de la organización (citas, consultas, cobros…).",
  "Esta tarjeta es una vista previa — todavía no consulta datos reales.",
];

function WidgetCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-medium text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-4 py-4 text-sm space-y-2.5">{children}</div>
    </div>
  );
}

export function DashboardWidgetGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      <WidgetCard title="Resumen operativo" subtitle="Vista preliminar — placeholder de datos">
        <p className="text-muted-foreground">
          Aquí vivirá un resumen del día: citas, consultas en curso y pendientes de cobro.
          Por ahora es una vista de muestra mientras se conectan las consultas reales.
        </p>
      </WidgetCard>

      <WidgetCard title="Próximas citas" subtitle="Datos de muestra">
        <ul className="space-y-2">
          {MOCK_UPCOMING_APPOINTMENTS.map((a, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground shrink-0">{a.time}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{a.patient}</p>
                <p className="text-xs text-muted-foreground truncate">{a.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>

      <WidgetCard title="Pacientes recientes" subtitle="Datos de muestra">
        <ul className="space-y-2">
          {MOCK_RECENT_PATIENTS.map((p, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex items-center justify-center size-8 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                ?
              </span>
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>

      <WidgetCard title="Seguimiento pendiente" subtitle="Datos de muestra">
        <ul className="space-y-2">
          {MOCK_FOLLOW_UPS.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground truncate">{f.label}</span>
              <span className="text-xs font-semibold shrink-0">{f.count}</span>
            </li>
          ))}
        </ul>
      </WidgetCard>

      <WidgetCard title="Finanzas rápidas" subtitle="Datos de muestra — montos siempre los calcula el servidor">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Cobrado este mes</p>
            <p className="text-lg font-semibold mt-0.5">—</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Por cobrar</p>
            <p className="text-lg font-semibold mt-0.5">—</p>
          </div>
        </div>
      </WidgetCard>

      <WidgetCard title="Actividad reciente" subtitle="Datos de muestra">
        <ul className="space-y-2 text-muted-foreground">
          {MOCK_RECENT_ACTIVITY.map((line, i) => (
            <li key={i} className="leading-snug">{line}</li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
