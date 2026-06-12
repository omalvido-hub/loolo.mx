import Link from "next/link";
import type { QuoteOverviewItem } from "@/server/domain/billing/billing-views";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

// NELZZON — Listado global de presupuestos (FASE 1D-A, solo lectura).
// Sin botones de acción ni mutaciones; cada fila enlaza al detalle del paciente.

const FMT_DATE = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
});

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const FMT_NUM2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fCents = (c: number) => "$" + (c % 100 !== 0 ? FMT_NUM2 : FMT_NUM).format(c / 100);
const fDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try { return FMT_DATE.format(new Date(iso)); } catch { return "—"; }
};

interface QuotesOverviewListProps {
  quotes: QuoteOverviewItem[];
}

export function QuotesOverviewList({ quotes }: QuotesOverviewListProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No hay presupuestos registrados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Paciente</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium text-right">Pagado</th>
              <th className="px-4 py-2 font-medium text-right">Saldo</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <Link
                    href={`/pacientes/${q.patientId}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {q.patientName}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <QuoteStatusBadge status={q.status} />
                </td>
                <td className="px-4 py-2 text-right">{fCents(q.totalCents)}</td>
                <td className="px-4 py-2 text-right">{fCents(q.paidCents)}</td>
                <td className="px-4 py-2 text-right">
                  {q.liquidado ? "Liquidado" : fCents(q.balanceCents)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{fDate(q.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
