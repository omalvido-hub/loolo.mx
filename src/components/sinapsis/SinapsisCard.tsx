import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SinapsisCardProps {
  cardId: string;
  title: string;
  headerRight?: ReactNode;
  accent?: "jade" | "copper";
  highlighted?: boolean;
  className?: string;
  children: ReactNode;
}

const ACCENT_STYLE: Record<"jade" | "copper", { bg: string; shadow: string; title: string }> = {
  jade: {
    bg: "radial-gradient(130% 150% at 12% -12%,rgba(130,255,214,.1),transparent 55%),linear-gradient(160deg,rgba(16,32,27,.92),rgba(4,8,7,.96))",
    shadow:
      "0 1px 2px rgba(0,0,0,.6),0 18px 40px -20px rgba(0,0,0,.92),0 50px 90px -38px rgba(0,0,0,1),0 0 0 1px rgba(120,200,170,.14),inset 0 1px 0 rgba(255,255,255,.08)",
    title: "rgba(63,233,180,.65)",
  },
  copper: {
    bg: "radial-gradient(130% 150% at 12% -12%,rgba(255,200,150,.12),transparent 55%),linear-gradient(160deg,rgba(27,20,13,.94),rgba(7,5,4,.97))",
    shadow:
      "0 1px 2px rgba(0,0,0,.6),0 20px 44px -22px rgba(0,0,0,.94),0 55px 100px -40px rgba(0,0,0,1),0 0 0 1px rgba(229,161,101,.28),0 0 44px rgba(229,161,101,.08),inset 0 1px 0 rgba(255,255,255,.08)",
    title: "rgba(229,161,101,.75)",
  },
};

const HIGHLIGHT_SHADOW =
  "0 1px 2px rgba(0,0,0,.6),0 20px 44px -20px rgba(0,0,0,.92),0 50px 90px -32px rgba(0,0,0,1),0 0 0 1px rgba(63,233,180,.5),0 0 44px rgba(63,233,180,.28),inset 0 1px 0 rgba(255,255,255,.1)";

// Envoltorio compartido de las tarjetas del Panel principal: sin icono junto
// al título (solo texto en mono, con acento de color), degradado en dos capas
// (realce superior + base) y sombra por capas para que se sienta con cuerpo,
// no plana. El borde se enciende en verde cuando el pulso de la barra de
// dictado la ilumina, y se eleva con resorte lento al pasar el cursor — cada
// tarjeta es una puerta.
export function SinapsisCard({ cardId, title, headerRight, accent = "jade", highlighted, className, children }: SinapsisCardProps) {
  const a = ACCENT_STYLE[accent];

  return (
    <div
      data-sinapsis-card={cardId}
      className={cn(
        "sinapsis-rise-in sinapsis-card-lift group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] px-6 py-[22px] cursor-pointer",
        className,
      )}
      style={{ background: a.bg, boxShadow: highlighted ? HIGHLIGHT_SHADOW : a.shadow }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: "0 0 0 1px rgba(63,233,180,.45), 0 0 40px rgba(63,233,180,.2)" }}
      />

      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <span
          className="truncate text-[9.5px] tracking-[0.28em]"
          style={{ fontFamily: "var(--sn-mono)", color: a.title }}
        >
          {title.toUpperCase()}
        </span>
        {headerRight && (
          <span className="shrink-0 text-[10px] text-white/35" style={{ fontFamily: "var(--sn-mono)" }}>
            {headerRight}
          </span>
        )}
      </div>
      <div className="mt-3.5 min-h-0 flex-1">{children}</div>
    </div>
  );
}
