"use client";

// Presentacional puro. Tabs internas para el detalle de "Tratamiento y pagos":
// Tratamientos, Presupuestos y cobros, Documentos. No muta, no llama server
// actions directamente — solo organiza visualmente el contenido recibido.
// Todas las tabs permanecen montadas (oculto con CSS) para no perder estado
// de formularios al cambiar de tab.

import { useState } from "react";

const TABS = [
  { key: "tratamientos", label: "Tratamientos" },
  { key: "presupuestos", label: "Presupuestos y cobros" },
  { key: "documentos", label: "Documentos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  tratamientos: React.ReactNode;
  presupuestos: React.ReactNode;
  documentos: React.ReactNode;
}

export function PatientOperationTabs({ tratamientos, presupuestos, documentos }: Props) {
  const [active, setActive] = useState<TabKey>("tratamientos");
  const content: Record<TabKey, React.ReactNode> = { tratamientos, presupuestos, documentos };

  return (
    <div>
      <div className="flex gap-1 border-b" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div key={tab.key} className={active === tab.key ? "pt-4" : "hidden"}>
          {content[tab.key]}
        </div>
      ))}
    </div>
  );
}
