"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollableListProps {
  className?: string;
  children: React.ReactNode;
}

// Contenedor con scroll interno para las tarjetas tipo lista (ESPERAN TU
// FIRMA, AHORA). El indicador de "hay más abajo" solo se muestra cuando el
// contenido de verdad desborda y no se ha llegado al final — nunca decorativo.
export function ScrollableList({ className, children }: ScrollableListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const overflow = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      setHasMore(overflow && !atBottom);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={ref} className={cn("h-full min-h-0 space-y-2 overflow-y-auto pr-1", className)}>
        {children}
      </div>
      {hasMore && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-0.5 pt-4"
          style={{ background: "linear-gradient(rgba(7,10,9,0),rgba(7,10,9,.92))" }}
        >
          <ChevronDown className="size-3.5 text-white/40" />
        </div>
      )}
    </div>
  );
}
