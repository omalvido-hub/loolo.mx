import Link from "next/link";
import type { PaymentOverviewItem } from "@/server/domain/billing/billing-views";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

// NELZZON — Listado global de cobros (FASE 1D-B, solo lectura).
// Sin botones de registro/reverso ni mutaciones; cada fila enlaza al detalle del paciente.

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

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  OTHER: "Otro",
};

const ENTRY_KIND_LABELS: Record<string, string> = {
  PAYMENT: "Cobro",
  REVERSAL: "Reverso",
};

interface PaymentsOverviewListProps {
  payments: PaymentOverviewItem[];
}

export function PaymentsOverviewList({ payments }: PaymentsOverviewListProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No hay cobros registrados.</p>
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
              <th className="px-4 py-2 font-medium">Movimiento</th>
              <th className="px-4 py-2 font-medium">Método</th>
              <th className="px-4 py-2 font-medium text-right">Monto</th>
              <th className="px-4 py-2 font-medium">Presupuesto</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <Link
                    href={`/pacientes/${p.patientId}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {p.patientName}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {p.entryKind === "REVERSAL" ? (
                    <span className="text-red-600 dark:text-red-400">{ENTRY_KIND_LABELS[p.entryKind]}</span>
                  ) : (
                    ENTRY_KIND_LABELS[p.entryKind] ?? p.entryKind
                  )}
                </td>
                <td className="px-4 py-2">{METHOD_LABELS[p.method] ?? p.method}</td>
                <td className="px-4 py-2 text-right">
                  {p.entryKind === "REVERSAL" ? "-" : ""}{fCents(p.amountCents)}
                </td>
                <td className="px-4 py-2">
                  {p.quoteStatus ? <QuoteStatusBadge status={p.quoteStatus} /> : "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{fDate(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
