// Presentacional puro. Se muestra cuando el actor no tiene quote.view.

export function BillingNoPermission() {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">Presupuestos y Cobros</h2>
      </div>
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Sin acceso a la sección financiera.</p>
      </div>
    </div>
  );
}
