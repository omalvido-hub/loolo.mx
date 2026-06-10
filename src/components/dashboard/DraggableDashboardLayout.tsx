"use client";

// Reordenamiento básico de tarjetas del dashboard mediante HTML5 drag & drop
// nativo (sin librerías). El orden se guarda en localStorage por storageKey;
// si localStorage no existe o falla, se usa siempre el orden por defecto.
// En pantallas pequeñas el arrastre se desactiva: las tarjetas se muestran
// en su orden por defecto, en una sola columna.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardCardHandle } from "./DashboardCardHandle";

interface DraggableDashboardLayoutProps {
  storageKey: string;
  defaultOrder: string[];
  items: Record<string, React.ReactNode>;
  className?: string;
  itemClassName?: (id: string) => string | undefined;
}

function loadOrder(storageKey: string, defaultOrder: string[]): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultOrder;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === defaultOrder.length &&
      parsed.every((id) => typeof id === "string" && defaultOrder.includes(id)) &&
      new Set(parsed).size === defaultOrder.length
    ) {
      return parsed as string[];
    }
  } catch {
    // localStorage no disponible o datos inválidos: se usa el orden por defecto.
  }
  return defaultOrder;
}

function saveOrder(storageKey: string, order: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(order));
  } catch {
    // Si localStorage falla, simplemente no se persiste el nuevo orden.
  }
}

export function DraggableDashboardLayout({
  storageKey,
  defaultOrder,
  items,
  className,
  itemClassName,
}: DraggableDashboardLayoutProps) {
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [mounted, setMounted] = useState(false);
  const [canDrag, setCanDrag] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    setOrder(loadOrder(storageKey, defaultOrder));
    setMounted(true);

    const mq = window.matchMedia("(min-width: 1024px)");
    setCanDrag(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCanDrag(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function handleDrop(targetId: string) {
    setOrder((prev) => {
      if (!draggedId || draggedId === targetId) return prev;
      const from = prev.indexOf(draggedId);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      saveOrder(storageKey, next);
      return next;
    });
    setDraggedId(null);
    setOverId(null);
  }

  const known = order.filter((id) => id in items);
  const missing = Object.keys(items).filter((id) => !known.includes(id));
  const finalOrder = [...known, ...missing];

  return (
    <div className={className}>
      {finalOrder.map((id) => (
        <div
          key={id}
          draggable={mounted && canDrag}
          onDragStart={(e) => {
            setDraggedId(id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (!draggedId) return;
            e.preventDefault();
            if (overId !== id) setOverId(id);
          }}
          onDragLeave={() => {
            setOverId((cur) => (cur === id ? null : cur));
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(id);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setOverId(null);
          }}
          className={cn(
            "group/drag relative transition-all",
            itemClassName?.(id),
            draggedId === id && "opacity-50",
            overId === id && draggedId && draggedId !== id && "ring-2 ring-primary/40 rounded-2xl"
          )}
        >
          {mounted && canDrag && <DashboardCardHandle />}
          {items[id]}
        </div>
      ))}
    </div>
  );
}
