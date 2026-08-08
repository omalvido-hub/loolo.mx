"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

const FMT_NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fCents = (c: number) => "$" + FMT_NUM.format(Math.round(c / 100));
const fPercent = (n: number) => `${Math.round(n)}%`;
const fInt = (n: number) => String(Math.round(n));

const FMT_DATETIME = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface Metric {
  label: string;
  value: ReactNode;
  color?: string;
  delay?: string;
}

interface SinapsisHeaderProps {
  cobradoMesBrutoCents: number | null;
  metaPercent: number | null;
  ocupacionPercent: number | null;
  citasHoyCount: number;
  navOpen: boolean;
  onToggleNav: () => void;
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="ml-4 hidden shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/35 xl:ml-8 xl:inline"
      style={{ fontFamily: "var(--sn-mono)" }}
    >
      {now ? FMT_DATETIME.format(now).replace(",", " ·") : "—"}
    </span>
  );
}

function MetricItem({ label, value, color, delay }: Metric) {
  return (
    <span
      className="sinapsis-dot-pulse flex shrink-0 items-center gap-2 text-[11px]"
      style={{ fontFamily: "var(--sn-mono)", animationDelay: delay }}
    >
      <span className="sinapsis-dot-pulse size-[5px] shrink-0 rounded-full bg-[#3FE9B4] shadow-[0_0_10px_#3FE9B4]" />
      <span className="text-white/40">{label}</span>
      <span className="tabular-nums" style={{ color: color ?? "var(--sn-ink)" }}>
        {value}
      </span>
    </span>
  );
}

export function SinapsisHeader({
  cobradoMesBrutoCents,
  metaPercent,
  ocupacionPercent,
  citasHoyCount,
  navOpen,
  onToggleNav,
}: SinapsisHeaderProps) {
  return (
    <header className="flex h-[46px] shrink-0 items-center border-b border-[#3FE9B4]/10 bg-[#060e0c]/85 px-4 sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={onToggleNav}
        title={navOpen ? "Colapsar menú" : "Expandir menú"}
        className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#3FE9B4]/20 text-[#3FE9B4]/80 transition-colors hover:border-[#3FE9B4]/40 hover:bg-[#3FE9B4]/5 hover:text-[#3FE9B4] lg:mr-4"
      >
        {navOpen ? <PanelLeftClose className="size-[15px]" strokeWidth={1.7} /> : <PanelLeftOpen className="size-[15px]" strokeWidth={1.7} />}
      </button>
      <div className="mr-4 flex shrink-0 items-center gap-3 lg:mr-6 xl:mr-8">
        <span
          className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold text-[#03110c] shadow-[0_0_18px_rgba(63,233,180,0.5)]"
          style={{ background: "linear-gradient(150deg,#3FE9B4,#0C6249)", fontFamily: "var(--sn-serif)" }}
        >
          N
        </span>
        <span className="hidden text-[9.5px] tracking-[0.3em] text-white/50 xl:inline" style={{ fontFamily: "var(--sn-mono)" }}>
          SINAPSIS
        </span>
      </div>

      <div className="mr-6 hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 xl:flex">
        <Search className="size-[13px] shrink-0 text-white/30" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="Buscar…"
          className="w-[130px] bg-transparent text-[11px] text-white/70 placeholder:text-white/25 focus:outline-none"
          style={{ fontFamily: "var(--sn-mono)" }}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-evenly gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-4 lg:gap-6 xl:gap-8">
        <MetricItem
          label="INGRESOS"
          value={cobradoMesBrutoCents === null ? "—" : <AnimatedNumber value={cobradoMesBrutoCents} format={fCents} />}
        />
        <MetricItem
          label="META"
          value={metaPercent === null ? "—" : <AnimatedNumber value={metaPercent} format={fPercent} />}
          color="#3FE9B4"
          delay="0.8s"
        />
        <MetricItem
          label="OCUPACIÓN"
          value={ocupacionPercent === null ? "—" : <AnimatedNumber value={ocupacionPercent} format={fPercent} />}
          color={ocupacionPercent !== null && ocupacionPercent > 90 ? "#E5A165" : undefined}
          delay="1.6s"
        />
        <MetricItem label="CITAS" value={<AnimatedNumber value={citasHoyCount} format={fInt} />} delay="2.4s" />
      </div>
      <Clock />
    </header>
  );
}
