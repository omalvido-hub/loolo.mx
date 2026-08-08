import { SinapsisCard } from "../SinapsisCard";
import { ScrollableList } from "../ScrollableList";
import type { SinapsisAhoraItem } from "../types";

interface Props {
  items: SinapsisAhoraItem[];
  highlighted?: boolean;
}

const STATUS_ES: Record<string, string> = {
  SCHEDULED: "programada",
  CONFIRMED: "confirmada",
  COMPLETED: "completada",
  NO_SHOW: "no se presentó",
  RESCHEDULED: "reagendada",
};

function formatRange(startAt: string, endAt: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" };
  const start = new Date(startAt).toLocaleTimeString("es-MX", opts);
  const end = new Date(endAt).toLocaleTimeString("es-MX", opts);
  return `${start} – ${end}`;
}

// Lo que está pasando ahora y lo próximo en la agenda de hoy. Orden: en
// curso primero, luego lo que falta por venir (más cercano primero), y al
// final lo que ya pasó (completada/no se presentó) — nunca al revés, o la
// tarjeta "Ahora" termina mostrando historial viejo en vez de lo que sigue.
export function AhoraCard({ items, highlighted }: Props) {
  const now = Date.now();
  const isPast = (item: SinapsisAhoraItem) => !item.isNow && new Date(item.endAt).getTime() < now;

  const sorted = [...items].sort((a, b) => {
    if (a.isNow !== b.isNow) return a.isNow ? -1 : 1;
    const aPast = isPast(a);
    const bPast = isPast(b);
    if (aPast !== bPast) return aPast ? 1 : -1;
    return a.startAt.localeCompare(b.startAt);
  });

  return (
    <SinapsisCard
      cardId="ahora"
      title="Ahora"
      headerRight={sorted.length > 0 ? `${sorted.length} HOY` : undefined}
      highlighted={highlighted}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-white/40">No hay más citas por hoy.</p>
      ) : (
        <ScrollableList>
          {sorted.map((item) => (
            <div
              key={item.id}
              className={
                "rounded-lg border px-3 py-2 " +
                (item.isNow
                  ? "border-emerald-400/40 bg-emerald-400/[0.07]"
                  : "border-white/5 bg-white/[0.03]")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium text-white/90">{item.patientName}</p>
                {item.isNow && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">En curso</span>}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-white/45">
                {formatRange(item.startAt, item.endAt)} · {STATUS_ES[item.status] ?? item.status.toLowerCase()}
              </p>
            </div>
          ))}
        </ScrollableList>
      )}
    </SinapsisCard>
  );
}
