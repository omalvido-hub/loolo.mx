import Link from "next/link";
import { SinapsisCard } from "../SinapsisCard";
import { AnimatedNumber } from "../AnimatedNumber";
import type { SinapsisTrendPoint } from "../types";

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fCents = (c: number) => "$" + FMT_NUM.format(Math.round(c / 100));

interface Props {
  cobradoMesBrutoCents: number | null;
  flujoNetoCents: number | null;
  tendencia: SinapsisTrendPoint[];
  highlighted?: boolean;
}

function diaDelMes(): string {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `DÍA ${now.getDate()} DE ${daysInMonth}`;
}

// Mini-gráfica de los últimos 7 días de cobro (PAYMENT − REVERSAL, ledger
// real, sin proyecciones). La línea es una sola, sólida y quieta — nada de
// punteado, que a este grosor siempre termina leyéndose como puntitos sueltos.
// Lo que se mueve es un punto que recorre la curva completa sin parar, con
// <animateMotion> — la misma técnica ya probada en SinapsisFilaments para el
// pulso del núcleo, aquí en bucle en vez de una sola vez. Recorre los 7 días
// y remata en HOY en cada vuelta: es el día que todavía puede subir, el
// resto ya cerró — por eso el recorrido siempre termina ahí, no a la mitad.
function TrendSparkline({ points }: { points: SinapsisTrendPoint[] }) {
  const hasSignal = points.some((p) => p.netCents !== 0);
  if (!hasSignal) return null;

  const values = points.map((p) => p.netCents);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(1, ...values);
  const range = maxV - minV || 1;
  const n = Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({
    x: (i / n) * 320,
    y: 32 - ((p.netCents - minV) / range) * 28,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x.toFixed(1) ?? 0},36 L0,36 Z`;
  const today = coords[coords.length - 1];

  return (
    <svg viewBox="0 0 320 36" className="mt-2 h-9 w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sinapsis-dinero-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3FE9B4" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3FE9B4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sinapsis-dinero-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#3FE9B4"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px rgba(63,233,180,.5))" }}
      />
      {today && (
        <>
          <circle cx={today.x} cy={today.y} r="2" fill="#3FE9B4" fillOpacity="0.55">
            <title>Hoy — todavía puede subir, el día no ha cerrado</title>
          </circle>
          <circle r="2.4" fill="#3FE9B4" style={{ filter: "drop-shadow(0 0 7px #3FE9B4)" }}>
            <animateMotion dur="9s" repeatCount="indefinite" path={linePath} />
          </circle>
        </>
      )}
    </svg>
  );
}

// Métrica principal: flujo neto sobre lo cobrado (cobrado − nómina − costos
// fijos). Sin periodo financiero configurado en la organización, se declara
// honestamente en vez de mostrar una cifra inflada. El cobrado bruto sí es
// real y se muestra como segundo concepto, etiquetado sin ambigüedad como
// bruto (no como ganancia), con su tendencia de los últimos 7 días debajo.
export function DineroCard({ cobradoMesBrutoCents, flujoNetoCents, tendencia, highlighted }: Props) {
  return (
    <SinapsisCard cardId="dinero" title="Dinero" headerRight={diaDelMes()} highlighted={highlighted}>
      <Link href="/cobros" className="block h-full">
        <p className="text-[11px] uppercase tracking-wide text-white/40">Flujo neto sobre lo cobrado</p>
        {flujoNetoCents === null ? (
          <>
            <p className="mt-1 text-sm font-medium text-amber-300/90">Sin datos suficientes</p>
            <p className="mt-0.5 text-[11px] text-white/35">Falta configurar nómina y costos fijos</p>
          </>
        ) : (
          <p className={"mt-1 text-2xl font-semibold tabular-nums " + (flujoNetoCents >= 0 ? "text-emerald-300" : "text-rose-300")}>
            <AnimatedNumber value={flujoNetoCents} format={fCents} />
            <span className="ml-1 text-xs font-normal text-white/40">MXN</span>
          </p>
        )}

        <div className="mt-3 border-t border-white/10 pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-white/40">Cobrado este mes (bruto)</p>
            <p className="shrink-0 text-sm font-medium tabular-nums text-white/80">
              {cobradoMesBrutoCents === null ? "—" : <AnimatedNumber value={cobradoMesBrutoCents} format={fCents} />}
            </p>
          </div>
          <TrendSparkline points={tendencia} />
        </div>
      </Link>
    </SinapsisCard>
  );
}
