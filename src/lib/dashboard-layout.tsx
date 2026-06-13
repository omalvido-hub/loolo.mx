"use client";

// NELZZON — Acomodo del Dashboard (FASE 1M-F). Estado 100% cliente: sin DB,
// sin server actions. Guarda en localStorage (nelzzon.dashboardLayout.v1) el
// orden y el tamaño de cada tarjeta KPI del Dashboard. Mostrar/ocultar sigue
// viviendo en module-identity.tsx (campo "hidden" ya existente) — aquí solo
// se agrega orden y tamaño, que se aplican en DashboardKpiGrid.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardCardSize = "chico" | "mediano" | "grande" | "ancho";

export const DASHBOARD_CARD_SIZES: { key: DashboardCardSize; label: string; hint: string }[] = [
  { key: "chico", label: "Chico", hint: "Ocupa poco espacio" },
  { key: "mediano", label: "Mediano", hint: "Tamaño normal" },
  { key: "grande", label: "Grande", hint: "Más espacio para destacar" },
  { key: "ancho", label: "Ancho", hint: "Ocupa todo el ancho" },
];

/** Los 8 KPIs del Dashboard — mismos id que MODULE_IDENTITY_REGISTRY. */
export const DASHBOARD_CARD_IDS = [
  "kpi-citas",
  "kpi-cobrado",
  "kpi-porcobrar",
  "kpi-presupuestos",
  "kpi-tratamientos",
  "kpi-ingresos",
  "kpi-punto-equilibrio",
  "kpi-meta-mensual",
] as const;

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number];

/** Nombres simples — para la pantalla "Acomoda tu dashboard". */
export const DASHBOARD_CARD_LABELS: Record<DashboardCardId, string> = {
  "kpi-citas": "Citas de hoy",
  "kpi-cobrado": "Cobrado este mes",
  "kpi-porcobrar": "Por cobrar",
  "kpi-presupuestos": "Presupuestos pendientes",
  "kpi-tratamientos": "Tratamientos activos",
  "kpi-ingresos": "Ingresos del mes",
  "kpi-punto-equilibrio": "Punto de equilibrio",
  "kpi-meta-mensual": "Meta mensual",
};

export interface DashboardLayoutState {
  order: string[];
  sizes: Record<string, DashboardCardSize>;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutState = {
  order: [...DASHBOARD_CARD_IDS],
  sizes: {
    "kpi-citas": "grande",
    "kpi-cobrado": "chico",
    "kpi-porcobrar": "mediano",
    "kpi-presupuestos": "mediano",
    "kpi-tratamientos": "grande",
    "kpi-ingresos": "chico",
    "kpi-punto-equilibrio": "mediano",
    "kpi-meta-mensual": "mediano",
  },
};

export const DASHBOARD_LAYOUT_STORAGE_KEY = "nelzzon.dashboardLayout.v1";

interface DashboardLayoutContextValue {
  layout: DashboardLayoutState;
  /** Mueve una tarjeta una posición arriba/abajo en el orden. */
  moveCard: (id: string, direction: "up" | "down") => void;
  /** Cambia el tamaño (chico/mediano/grande/ancho) de una tarjeta. */
  setCardSize: (id: string, size: DashboardCardSize) => void;
  /** Tamaño efectivo de una tarjeta (con valor por defecto si no hay override). */
  getCardSize: (id: string) => DashboardCardSize;
  /** Vuelve al orden y tamaños de fábrica. */
  resetLayout: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

function readStoredLayout(): DashboardLayoutState {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_LAYOUT;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    const order = Array.isArray(parsed.order) && parsed.order.length > 0 ? parsed.order : DEFAULT_DASHBOARD_LAYOUT.order;
    const sizes = typeof parsed.sizes === "object" && parsed.sizes !== null ? parsed.sizes : {};
    // Asegura que toda tarjeta conocida aparezca en el orden, aunque sea nueva.
    const known = new Set(order);
    const merged = [...order, ...DEFAULT_DASHBOARD_LAYOUT.order.filter((id) => !known.has(id))];
    return { order: merged, sizes: { ...DEFAULT_DASHBOARD_LAYOUT.sizes, ...sizes } };
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<DashboardLayoutState>(DEFAULT_DASHBOARD_LAYOUT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLayout(readStoredLayout());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // localStorage no disponible — el acomodo sigue activo en esta sesión.
    }
  }, [layout, hydrated]);

  function moveCard(id: string, direction: "up" | "down") {
    setLayout((prev) => {
      const index = prev.order.indexOf(id);
      if (index === -1) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.order.length) return prev;
      const order = [...prev.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...prev, order };
    });
  }

  function setCardSize(id: string, size: DashboardCardSize) {
    setLayout((prev) => ({ ...prev, sizes: { ...prev.sizes, [id]: size } }));
  }

  function getCardSize(id: string): DashboardCardSize {
    return layout.sizes[id] ?? DEFAULT_DASHBOARD_LAYOUT.sizes[id] ?? "mediano";
  }

  function resetLayout() {
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
  }

  const value: DashboardLayoutContextValue = {
    layout,
    moveCard,
    setCardSize,
    getCardSize,
    resetLayout,
  };

  return <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>;
}

export function useDashboardLayout(): DashboardLayoutContextValue {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error("useDashboardLayout debe usarse dentro de DashboardLayoutProvider");
  return ctx;
}
