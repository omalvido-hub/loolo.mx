// Presentacional puro. Estado vacío de historial de consultas.

export function EncountersEmpty() {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      No hay consultas registradas para este paciente.
    </div>
  );
}
