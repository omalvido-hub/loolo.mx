// Presentacional puro. Muestra notas clínicas: contenido, autor y fecha.
// El contenido viene de getEncounterSafeView, la única vista autorizada que lo
// expone (NELZZON-CLINICAL-NOTES-1B). React escapa {item.body} por defecto —
// no usar dangerouslySetInnerHTML.

import type { NotesSummary } from "@/server/domain/clinical/encounter-views";

const FMT = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

function fDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return FMT.format(new Date(iso)); } catch { return "—"; }
}

interface Props {
  summary: NotesSummary;
}

export function ClinicalNotesSummary({ summary }: Props) {
  if (summary.count === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin notas clínicas en esta consulta.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {summary.count} {summary.count === 1 ? "nota" : "notas"} clínica{summary.count === 1 ? "" : "s"}.
        {summary.latestCreatedAt && (
          <> Última: {fDatetime(summary.latestCreatedAt)}.</>
        )}
      </p>
      <ul className="space-y-2">
        {summary.items.map((item) => (
          <li key={item.id} className="rounded-lg border px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.authorName ?? "Autor desconocido"}</span>
              <span>{fDatetime(item.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
