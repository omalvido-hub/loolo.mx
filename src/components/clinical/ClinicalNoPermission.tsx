// Presentacional puro. Sin acceso a datos clínicos.

export function ClinicalNoPermission() {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
      Sin acceso al expediente clínico.
    </div>
  );
}
