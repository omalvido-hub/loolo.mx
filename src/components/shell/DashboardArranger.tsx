"use client";

// FASE 1M-F — "Acomoda tu dashboard": mover, cambiar tamaño, ocultar/mostrar y
// resetear las tarjetas KPI del Dashboard. Orden y tamaño viven en
// dashboard-layout.tsx (localStorage); ocultar/mostrar reutiliza
// useModuleIdentities (campo "hidden", ya existente desde FASE 1M-C). Sin
// backend, se aplica de inmediato en el Dashboard real.

import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDashboardLayout,
  DASHBOARD_CARD_SIZES,
  DASHBOARD_CARD_LABELS,
  type DashboardCardId,
  type DashboardCardSize,
} from "@/lib/dashboard-layout";
import { useModuleIdentities } from "@/lib/module-identity";

export function DashboardArranger() {
  const { layout, moveCard, setCardSize, getCardSize, resetLayout } = useDashboardLayout();
  const { getIdentity, setIdentity } = useModuleIdentities();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Acomoda tu dashboard</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Mueve tarjetas, cambia su tamaño y oculta lo que no uses. Se aplica de inmediato en tu Dashboard.
        </p>
      </div>

      <div className="space-y-2">
        {layout.order.map((id, index) => {
          const cardId = id as DashboardCardId;
          const label = DASHBOARD_CARD_LABELS[cardId] ?? cardId;
          const hidden = getIdentity(cardId).hidden;
          const size = getCardSize(cardId);

          return (
            <div key={cardId} className="rounded-xl border bg-background/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("min-w-0 truncate text-xs font-medium", hidden && "text-muted-foreground line-through")}>
                  {label}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCard(cardId, "up")}
                    disabled={index === 0}
                    aria-label={`Mover ${label} arriba`}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(cardId, "down")}
                    disabled={index === layout.order.length - 1}
                    aria-label={`Mover ${label} abajo`}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentity(cardId, { hidden: !hidden })}
                    aria-pressed={hidden}
                    aria-label={hidden ? `Mostrar ${label}` : `Ocultar ${label}`}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {DASHBOARD_CARD_SIZES.map((opt) => {
                  const active = size === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      title={opt.hint}
                      aria-pressed={active}
                      onClick={() => setCardSize(cardId, opt.key as DashboardCardSize)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        active ? "border-brand-accent/40 bg-brand-accent-soft text-brand-accent" : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-3">
        <p className="text-[11px] leading-snug text-muted-foreground">
          El orden y el tamaño se guardan en este navegador.
        </p>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar acomodo
        </button>
      </div>
    </div>
  );
}
