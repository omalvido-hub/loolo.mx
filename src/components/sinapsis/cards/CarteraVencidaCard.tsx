import Link from "next/link";
import { SinapsisCard } from "../SinapsisCard";
import { ScrollableList } from "../ScrollableList";
import { AnimatedNumber } from "../AnimatedNumber";
import type { SinapsisCarteraItem } from "../types";

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fCents = (c: number) => "$" + FMT_NUM.format(Math.round(c / 100));

interface Props {
  items: SinapsisCarteraItem[];
  totalCents: number;
  highlighted?: boolean;
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

// Presupuestos ACEPTADOS con saldo pendiente: trabajo que el paciente ya
// comprometió pagar y todavía no se cobra. Orden por antigüedad — el más
// viejo primero, porque es el que más riesgo tiene de volverse incobrable.
export function CarteraVencidaCard({ items, totalCents, highlighted }: Props) {
  const sorted = [...items].sort((a, b) => a.acceptedAt.localeCompare(b.acceptedAt));
  const oldestDays = sorted.length > 0 ? diasDesde(sorted[0].acceptedAt) : null;

  return (
    <SinapsisCard
      cardId="por-cobrar"
      title="Por cobrar"
      accent="copper"
      headerRight={oldestDays !== null ? `MÁS VIEJO ${oldestDays}D` : undefined}
      highlighted={highlighted}
    >
      <div className="flex h-full flex-col">
        <p className="shrink-0 text-[11px] uppercase tracking-wide text-white/40">Saldo pendiente total</p>
        <p className="mt-1 shrink-0 text-2xl font-semibold tabular-nums text-white/90">
          <AnimatedNumber value={totalCents} format={fCents} />
          <span className="ml-1 text-xs font-normal text-white/40">MXN</span>
        </p>

        {sorted.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">Todo cobrado — sin saldos pendientes.</p>
        ) : (
          <div className="mt-3 min-h-0 flex-1">
            <ScrollableList>
              {sorted.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 transition-colors hover:border-[#E5A165]/30 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white/90">{item.patientName}</p>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-amber-300/90">{fCents(item.balanceCents)}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-white/45">hace {diasDesde(item.acceptedAt)} días</p>
                </Link>
              ))}
            </ScrollableList>
          </div>
        )}
      </div>
    </SinapsisCard>
  );
}
