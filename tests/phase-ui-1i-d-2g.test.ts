// NELZZON — Pruebas Fase 1I-D-2G (centrar odontograma en desktop).
// Estructurales sobre el código fuente:
// - El wrapper interno del diagrama dental se centra en desktop (lg:mx-auto)
//   cuando hay espacio disponible, sin perder el scroll horizontal en
//   mobile/tablet (overflow-x-auto se conserva, sin centrado forzado fuera
//   de desktop).
// - No se vuelve a una retícula lateral con "Hallazgos activos": sigue
//   debajo del diagrama, a ancho completo (ver phase-ui-1i-d-2f.test.ts).
// No se toca DB, permisos, server actions, lógica clínica, dientes,
// hallazgos, estados ni acciones.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-D-2G — Centrar odontograma en desktop", () => {
  it("el wrapper del diagrama se centra en desktop con lg:mx-auto, manteniendo overflow-x-auto", () => {
    const idx = odontogramContent.indexOf("overflow-x-auto");
    expect(idx).toBeGreaterThan(-1);
    const block = odontogramContent.slice(idx, idx + 150);
    expect(block).toContain("w-max lg:mx-auto");
  });

  it('no se vuelve a una retícula lateral con "Hallazgos activos"', () => {
    expect(odontogramContent).not.toContain("grid-cols-[7fr_5fr]");
    const diagramaIdx = odontogramContent.indexOf('title="Diagrama dental"');
    const hallazgosIdx = odontogramContent.indexOf('title="Hallazgos activos"');
    expect(diagramaIdx).toBeGreaterThan(-1);
    expect(diagramaIdx).toBeLessThan(hallazgosIdx);
  });

  it("no se toca DB, permisos ni server actions", () => {
    expect(odontogramContent).not.toContain("makeTenantRunner");
    expect(odontogramContent).not.toContain("requireOrganization");
  });
});
