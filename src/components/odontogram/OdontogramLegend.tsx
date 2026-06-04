const FINDING_TYPE_LEGEND = [
  { type: "CARIES",       label: "Caries",         color: "#dc2626" },
  { type: "RESTORATION",  label: "Restauración",   color: "#2563eb" },
  { type: "CROWN",        label: "Corona",          color: "#7c3aed" },
  { type: "ENDODONTICS",  label: "Endodoncia",      color: "#ea580c" },
  { type: "IMPLANT",      label: "Implante",        color: "#6b7280" },
  { type: "FRACTURE",     label: "Fractura",        color: "#f59e0b" },
  { type: "MOBILITY",     label: "Movilidad",       color: "#ca8a04" },
  { type: "MISSING",      label: "Ausente",         color: "#374151" },
  { type: "SEALANT",      label: "Sellante",        color: "#0891b2" },
  { type: "OTHER",        label: "Otro",            color: "#9ca3af" },
] as const;

const TOOTH_STATUS_LEGEND = [
  { status: "PRESENT",    label: "Presente",        fill: "#ffffff", stroke: "#d1d5db" },
  { status: "EXTRACTED",  label: "Extraído",        fill: "#e5e7eb", stroke: "#9ca3af" },
  { status: "MISSING",    label: "Ausente",         fill: "#e5e7eb", stroke: "#9ca3af" },
  { status: "IMPACTED",   label: "Impactado",       fill: "#fef9c3", stroke: "#fbbf24" },
  { status: "UNERUPTED",  label: "Sin erupcionar",  fill: "#f0fdf4", stroke: "#86efac" },
  { status: "ROOT_ONLY",  label: "Solo raíz",       fill: "#fef2f2", stroke: "#fca5a5" },
  { status: "ABSENT",     label: "Ausente (anotado)", fill: "#f3f4f6", stroke: "#d1d5db" },
] as const;

export function OdontogramLegend() {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-2">
          Tipo de hallazgo
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {FINDING_TYPE_LEGEND.map(({ type, label, color }) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-foreground/80">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-2">
          Estado de la pieza
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {TOOTH_STATUS_LEGEND.map(({ status, label, fill, stroke }) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 border"
                style={{ backgroundColor: fill, borderColor: stroke }}
              />
              <span className="text-foreground/80">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Pieza con X = extraída o ausente. Zonas coloreadas = superficie afectada.
      </p>
    </div>
  );
}
