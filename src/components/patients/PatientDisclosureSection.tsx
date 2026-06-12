// NELZZON — Sección desplegable presentacional (1I-B).
// Envoltorio visual con <details>/<summary>: el resumen (título, subtítulo y
// datos compactos) siempre es visible; el contenido completo se muestra solo
// al expandir. No desmonta hijos al colapsar (no rompe formularios ni
// acciones internas) y no persiste estado.

interface Props {
  title: string;
  subtitle?: string;
  /** Datos compactos siempre visibles, incluso colapsado (p.ej. resumen de "Datos del paciente"). */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  /** "muted" baja la jerarquía visual — para secciones secundarias como auditoría/bitácora. */
  tone?: "default" | "muted";
  children: React.ReactNode;
}

export function PatientDisclosureSection({ title, subtitle, summary, defaultOpen = false, tone = "default", children }: Props) {
  const muted = tone === "muted";
  return (
    <details
      className={`group rounded-xl border text-sm overflow-hidden ${
        muted ? "border-dashed bg-transparent" : "bg-card ring-1 ring-foreground/10"
      }`}
      open={defaultOpen}
    >
      <summary className={`cursor-pointer list-none px-4 py-2.5 ${muted ? "bg-transparent" : "bg-muted/30"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={muted ? "text-xs font-medium text-muted-foreground uppercase tracking-wide" : "font-medium text-base"}>
            {title}
          </h2>
          <span className="text-xs text-muted-foreground shrink-0">
            <span className="group-open:hidden">Ver detalle</span>
            <span className="hidden group-open:inline">Ocultar</span>
          </span>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {summary && <div className="mt-2 space-y-1">{summary}</div>}
      </summary>
      <div className="px-4 py-4 border-t space-y-4">{children}</div>
    </details>
  );
}
