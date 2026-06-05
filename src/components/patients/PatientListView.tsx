"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PatientListResult } from "@/server/domain/patient-record/list";

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

      {items.length === 0 ? (
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
                {items.map((p) => (
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
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total} pacientes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
