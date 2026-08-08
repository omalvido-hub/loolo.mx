import { SinapsisCard } from "../SinapsisCard";
import { AnimatedNumber } from "../AnimatedNumber";

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fCents = (c: number) => "$" + FMT_NUM.format(Math.round(c / 100));

interface Props {
  equilibrioCents: number | null;
  cobradoMesBrutoCents: number | null;
  highlighted?: boolean;
}

const MES = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", month: "long" }).format(new Date()).toUpperCase();

// Punto de equilibrio = costos fijos configurados del mes (renta + nómina +
// servicios + insumos). Sin ese periodo configurado en la organización, se
// declara "sin datos suficientes" en vez de inventar un número.
export function GastoEquilibrioCard({ equilibrioCents, cobradoMesBrutoCents, highlighted }: Props) {
  const cobrado = cobradoMesBrutoCents ?? 0;
  const pct = equilibrioCents && equilibrioCents > 0 ? Math.min(100, Math.round((cobrado / equilibrioCents) * 100)) : 0;
  const cubierto = equilibrioCents !== null && cobrado >= equilibrioCents;

  return (
    <SinapsisCard cardId="gasto-equilibrio" title="Gasto y equilibrio" headerRight={MES} highlighted={highlighted}>
      <p className="text-[11px] uppercase tracking-wide text-white/40">Punto de equilibrio</p>
      {equilibrioCents === null ? (
        <>
          <p className="mt-1 text-sm font-medium text-amber-300/90">Sin datos suficientes</p>
          <p className="mt-0.5 text-[11px] text-white/35">Costos fijos no configurados</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">
            <AnimatedNumber value={equilibrioCents} format={fCents} />
            <span className="ml-1 text-xs font-normal text-white/40">MXN</span>
          </p>
          <p className={"mt-0.5 text-[11px] " + (cubierto ? "text-emerald-300/80" : "text-white/35")}>
            {cubierto ? "Ya cubriste tus costos fijos de este mes" : `Llevas ${pct}% de tu punto de equilibrio`}
          </p>

          <p className="mt-3 text-[11px] uppercase tracking-wide text-white/40">Gastado</p>
          <p className="mt-1 text-sm font-medium text-amber-300/90">
            Sin datos suficientes de <AnimatedNumber value={equilibrioCents} format={fCents} /> presupuestados
          </p>

          <div className="mt-4 h-[3px] rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400/40 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.5)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </SinapsisCard>
  );
}
