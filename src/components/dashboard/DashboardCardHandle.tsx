// Indicador visual de "arrastrar para reordenar". Puramente decorativo:
// el atributo draggable vive en el contenedor de DraggableDashboardLayout,
// así que este ícono no necesita capturar eventos propios.
import { GripVertical } from "lucide-react";

export function DashboardCardHandle() {
  return (
    <span
      aria-hidden
      title="Arrastrar para reordenar"
      className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground/60 opacity-0 shadow-sm transition-opacity duration-150 group-hover/drag:opacity-100"
    >
      <GripVertical className="h-3 w-3" />
    </span>
  );
}
