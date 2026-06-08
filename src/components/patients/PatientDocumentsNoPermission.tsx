// Presentacional puro. Se muestra cuando el actor no tiene patient_documents.view.

export function PatientDocumentsNoPermission() {
  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="font-medium text-base">Documentos del paciente</h2>
      </div>
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Sin acceso a los documentos del paciente.</p>
      </div>
    </div>
  );
}
