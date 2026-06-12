// NELZZON — Pruebas Fase 1I-D-2F (odontograma completo visible en desktop).
// Estructurales sobre el código fuente:
// - "Diagrama dental" ya no comparte una retícula 7/5 con "Hallazgos activos";
//   ocupa el ancho completo de la sección, para mostrar ambos arcos sin
//   scroll horizontal en desktop.
// - "Hallazgos activos" queda debajo del diagrama, también a ancho completo,
//   sin perder el límite de 5 visibles ni "Ver todos los hallazgos".
// - El contenedor con scroll horizontal se conserva para mobile/tablet.
// No se toca DB, permisos, server actions, lógica clínica, dientes,
// hallazgos, estados ni acciones.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-D-2F — Odontograma completo visible en desktop", () => {
  it('"Diagrama dental" ya no usa la retícula 7/5 con "Hallazgos activos"', () => {
    expect(odontogramContent).not.toContain("grid-cols-[7fr_5fr]");
  });

  it('"Diagrama dental" aparece antes de "Hallazgos activos", ambos a ancho completo', () => {
    const diagramaIdx = odontogramContent.indexOf('title="Diagrama dental"');
    const hallazgosIdx = odontogramContent.indexOf('title="Hallazgos activos"');
    expect(diagramaIdx).toBeGreaterThan(-1);
    expect(hallazgosIdx).toBeGreaterThan(-1);
    expect(diagramaIdx).toBeLessThan(hallazgosIdx);
  });

  it("se conserva el scroll horizontal para mobile/tablet sin centrar el contenido", () => {
    expect(odontogramContent).toContain("overflow-x-auto");
    const idx = odontogramContent.indexOf("overflow-x-auto");
    const block = odontogramContent.slice(idx, idx + 150);
    expect(block).not.toContain("mx-auto");
  });

  it('"Hallazgos activos" mantiene máximo 5 visibles y "Ver todos los hallazgos"', () => {
    expect(odontogramContent).toContain("VISIBLE_FINDINGS = 5");
    expect(odontogramContent).toContain("findingsPanel.slice(0, VISIBLE_FINDINGS)");
    expect(odontogramContent).toContain("findingsPanel.slice(VISIBLE_FINDINGS)");
    expect(odontogramContent).toContain("Ver todos los hallazgos");
  });

  it("la leyenda sigue colapsada dentro de la tarjeta del diagrama", () => {
    expect(odontogramContent).not.toContain('title="Leyenda"');
    expect(odontogramContent).toContain("Ver leyenda");
    expect(odontogramContent).toContain("<OdontogramLegend />");
  });

  it("no se toca DB, permisos ni server actions", () => {
    expect(odontogramContent).not.toContain("makeTenantRunner");
    expect(odontogramContent).not.toContain("requireOrganization");
  });
});
