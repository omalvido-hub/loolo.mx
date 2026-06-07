"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchPatientsAction } from "@/server/actions/patients";
import type { PatientListItem, PatientListResult, PatientSearchItem } from "@/server/domain/patient-record/list";

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

function formatDate(iso: string): string {
  try {
    return FMT_DATE.format(new Date(iso));
  } catch {
    return "—";
  }
}

function hasFullDetails(p: PatientListItem | PatientSearchItem): p is PatientListItem {
  return "status" in p;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PROSPECT: "Prospecto",
};

interface Props {
  data: PatientListResult;
}

export function PatientListView({ data }: Props) {
  const router = useRouter();
  const { items, total, limit, offset } = data;

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Búsqueda con debounce de 200ms. Con menos de 2 caracteres se vuelve a la lista normal.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchPatientsAction(q);
        setSearchResults(res.ok ? res.items : []);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = query.trim().length >= 2;
  const visibleItems = isSearching ? searchResults ?? [] : items;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? "paciente" : "pacientes"} en total
          </p>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar paciente…"
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Buscar paciente por nombre, teléfono o correo"
          autoComplete="off"
        />
        {isPending && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        )}
      </div>

      {isSearching && visibleItems.length === 0 && !isPending ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin resultados</p>
          <p className="text-sm mt-2">No se encontraron pacientes para “{query.trim()}”.</p>
        </div>
      ) : items.length === 0 && !isSearching ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin pacientes registrados</p>
          <p className="text-sm mt-2">
            Los pacientes aparecerán aquí cuando sean dados de alta.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleItems.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pacientes/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.fullName ?? <span className="text-muted-foreground italic">Sin nombre</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {hasFullDetails(p) ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {hasFullDetails(p) ? formatDate(p.createdAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isSearching ? (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {visibleItems.length} {visibleItems.length === 1 ? "resultado" : "resultados"} para “{query.trim()}”.
            </p>
          ) : total > limit ? (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total} pacientes.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
