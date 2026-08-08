import Link from "next/link";
import { SinapsisCard } from "../SinapsisCard";
import { ScrollableList } from "../ScrollableList";
import type { SinapsisFirmaItem } from "../types";

interface Props {
  items: SinapsisFirmaItem[];
  highlighted?: boolean;
}

// Presupuestos y planes de tratamiento en DRAFT: creados y esperando tu
// revisión antes de proponerse al paciente. Orden por prioridad — el más
// antiguo (el que más tiempo lleva esperando) va primero, siempre visible
// sin necesidad de hacer scroll.
export function EsperanTuFirmaCard({ items, highlighted }: Props) {
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <SinapsisCard
      cardId="esperan-firma"
      title="Esperan tu firma"
      accent="copper"
      headerRight={String(sorted.length)}
      highlighted={highlighted}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-white/40">Nada esperando tu revisión.</p>
      ) : (
        <ScrollableList>
          {sorted.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 transition-colors hover:border-[#E5A165]/30 hover:bg-white/[0.06]"
            >
              <p className="truncate text-sm font-medium text-white/90">{item.patientName}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/45">{item.label}</p>
            </Link>
          ))}
        </ScrollableList>
      )}
    </SinapsisCard>
  );
}
