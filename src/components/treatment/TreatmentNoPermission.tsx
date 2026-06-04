// Presentacional puro. Se muestra cuando el actor no tiene treatment.view.

export function TreatmentNoPermission() {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">Sin acceso a planes de tratamiento.</p>
    </div>
  );
}
