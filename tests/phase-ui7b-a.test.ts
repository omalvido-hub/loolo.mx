// LOOLO — Pruebas fase UI-7B-A (odontograma interactivo visual, sin escritura).
// Verificación estática por readFileSync. No crea escritura, no server actions, sin migración.
// Cubre:
// - ToothGlyph acepta isSelected, onClick, overflowCount.
// - ToothDetailPanel existe, muestra FDI, nombre y "Sin hallazgos en esta pieza".
// - OdontogramChartInteractive es Client Component con estado selectedFdi.
// - tooth-names.ts tiene los 32 FDI permanentes con nombre completo.
// - Dominio clínico core no fue modificado.
// - No existe server action nueva de odontograma.

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ══════════════════════════════════════════════════════════════════════
// 1. ToothGlyph — props interactivos
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — ToothGlyph: interactividad", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(resolve("src/components/odontogram/ToothGlyph.tsx"), "utf-8");
  });

  it("acepta prop isSelected en la interfaz", () => {
    expect(content).toContain("isSelected");
    expect(content).toContain("isSelected?");
  });

  it("acepta prop onClick en la interfaz", () => {
    expect(content).toContain("onClick?");
  });

  it("muestra cursor-pointer cuando onClick está presente", () => {
    expect(content).toContain("cursor-pointer");
  });

  it("cambia el stroke del SVG cuando isSelected es true", () => {
    expect(content).toContain("isSelected ?");
    expect(content).toContain("#3b82f6");
  });

  it("acepta prop overflowCount en la interfaz", () => {
    expect(content).toContain("overflowCount?");
  });

  it("renderiza badge +N cuando overflowCount > 0", () => {
    expect(content).toContain("overflowCount");
    expect(content).toContain("+{");
    expect(content).toContain("extraCount > 0");
  });

  it("no accede a .note ni .recordedByUserId", () => {
    expect(content).not.toContain(".note");
    expect(content).not.toContain(".recordedByUserId");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. ToothDetailPanel — existencia y contenido
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — ToothDetailPanel: panel de detalle", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(resolve("src/components/odontogram/ToothDetailPanel.tsx"), "utf-8");
  });

  it("existe ToothDetailPanel.tsx", () => {
    expect(existsSync(resolve("src/components/odontogram/ToothDetailPanel.tsx"))).toBe(true);
  });

  it("es un Client Component (use client)", () => {
    expect(content).toContain('"use client"');
  });

  it("muestra el número FDI de la pieza", () => {
    expect(content).toContain("{fdi}");
  });

  it("muestra el nombre completo del diente (propiedad .full de tooth-names)", () => {
    expect(content).toContain("name.full");
    expect(content).toContain("getToothName");
  });

  it("importa getToothName desde tooth-names", () => {
    expect(content).toContain("tooth-names");
  });

  it("muestra 'Sin hallazgos en esta pieza' cuando no hay hallazgos", () => {
    expect(content).toContain("Sin hallazgos en esta pieza");
  });

  it("tiene botón Agregar hallazgo deshabilitado", () => {
    expect(content).toContain("disabled");
    expect(content).toContain("Agregar hallazgo");
  });

  it("menciona 'consulta activa' en el aviso del botón", () => {
    expect(content).toContain("consulta activa");
  });

  it("tiene botón de cierre (onClose)", () => {
    expect(content).toContain("onClose");
  });

  it("no accede a .note ni .recordedByUserId", () => {
    expect(content).not.toContain(".note");
    expect(content).not.toContain(".recordedByUserId");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. OdontogramChartInteractive — Client Component con estado
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — OdontogramChartInteractive: componente interactivo", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(
      resolve("src/components/odontogram/OdontogramChartInteractive.tsx"),
      "utf-8",
    );
  });

  it("existe OdontogramChartInteractive.tsx", () => {
    expect(existsSync(resolve("src/components/odontogram/OdontogramChartInteractive.tsx"))).toBe(true);
  });

  it("es un Client Component (use client)", () => {
    expect(content).toContain('"use client"');
  });

  it("mantiene estado local selectedFdi con useState", () => {
    expect(content).toContain("selectedFdi");
    expect(content).toContain("useState");
  });

  it("usa ToothGlyph con onClick e isSelected", () => {
    expect(content).toContain("onClick");
    expect(content).toContain("isSelected");
  });

  it("usa ToothDetailPanel", () => {
    expect(content).toContain("ToothDetailPanel");
  });

  it("cierra el panel al hacer clic en la misma pieza (toggle)", () => {
    expect(content).toContain("prev === fdi");
    expect(content).toContain("null");
  });

  it("pasa el overflowCount calculado a cada pieza", () => {
    expect(content).toContain("overflowCount");
    expect(content).toContain("MAX_VISIBLE_FINDINGS");
  });

  it("no accede a .note ni .recordedByUserId", () => {
    expect(content).not.toContain(".note");
    expect(content).not.toContain(".recordedByUserId");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. tooth-names.ts — mapa FDI completo
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — tooth-names: mapa de nombres dentales", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(resolve("src/components/odontogram/tooth-names.ts"), "utf-8");
  });

  it("existe tooth-names.ts", () => {
    expect(existsSync(resolve("src/components/odontogram/tooth-names.ts"))).toBe(true);
  });

  it("exporta getToothName", () => {
    expect(content).toContain("export function getToothName");
  });

  it("exporta TOOTH_NAMES", () => {
    expect(content).toContain("export const TOOTH_NAMES");
  });

  it("tiene tipo ToothName con short, full, quadrant", () => {
    expect(content).toContain("short:");
    expect(content).toContain("full:");
    expect(content).toContain("quadrant:");
  });

  it("cubre los 4 cuadrantes FDI", () => {
    expect(content).toContain("Superior derecho");
    expect(content).toContain("Superior izquierdo");
    expect(content).toContain("Inferior izquierdo");
    expect(content).toContain("Inferior derecho");
  });

  it("incluye Incisivo central, Canino, Molar", () => {
    expect(content).toContain("Incisivo central");
    expect(content).toContain("Canino");
    expect(content).toContain("Primer molar");
    expect(content).toContain("Tercer molar");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. OdontogramMasterSection usa el chart interactivo
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — OdontogramMasterSection: usa chart interactivo", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(
      resolve("src/components/odontogram/OdontogramMasterSection.tsx"),
      "utf-8",
    );
  });

  it("importa OdontogramChartInteractive (no OdontogramChart directo)", () => {
    expect(content).toContain("OdontogramChartInteractive");
  });

  it("no importa OdontogramChart directamente", () => {
    expect(content).not.toContain('from "./OdontogramChart"');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Integridad: sin escritura ni cambios en dominio clínico core
// ══════════════════════════════════════════════════════════════════════

describe("UI-7B-A — integridad: sin escritura, dominio clínico intacto", () => {
  it("odontogram.ts no fue modificado por UI-7B-A", () => {
    const c = readFileSync(resolve("src/server/domain/clinical/odontogram.ts"), "utf-8");
    expect(c).not.toContain("selectedFdi");
    expect(c).not.toContain("ToothDetailPanel");
    expect(c).not.toContain("OdontogramChartInteractive");
  });

  it("odontogram-views.ts no fue modificado por UI-7B-A", () => {
    const c = readFileSync(resolve("src/server/domain/clinical/odontogram-views.ts"), "utf-8");
    expect(c).not.toContain("selectedFdi");
    expect(c).not.toContain("ToothDetailPanel");
  });

  it("odontogram-schemas.ts no fue modificado por UI-7B-A", () => {
    const c = readFileSync(resolve("src/server/domain/clinical/odontogram-schemas.ts"), "utf-8");
    expect(c).not.toContain("selectedFdi");
    expect(c).not.toContain("ToothDetailPanel");
  });

  it("odontogram-resolver.ts no fue modificado por UI-7B-A", () => {
    const c = readFileSync(resolve("src/server/domain/clinical/odontogram-resolver.ts"), "utf-8");
    expect(c).not.toContain("selectedFdi");
    expect(c).not.toContain("ToothDetailPanel");
  });

  it("no existe server action odontogram-write.ts", () => {
    expect(existsSync(resolve("src/server/actions/odontogram-write.ts"))).toBe(false);
    expect(existsSync(resolve("src/app/actions/odontogram-write.ts"))).toBe(false);
  });

  it("no existe ruta API de escritura de odontograma", () => {
    expect(existsSync(resolve("src/app/api/odontogram/write"))).toBe(false);
    expect(existsSync(resolve("src/app/api/odontogram/record"))).toBe(false);
  });

  it("no existe migración de UI-7B-A", () => {
    expect(existsSync(resolve("prisma/migrations/0018_phase_ui7b_a.sql"))).toBe(false);
    expect(existsSync(resolve("prisma/migrations/0019_phase_ui7b_a.sql"))).toBe(false);
  });

  it("ningún componente nuevo de odontogram expone .note ni .recordedByUserId", () => {
    const newFiles = [
      "src/components/odontogram/OdontogramChartInteractive.tsx",
      "src/components/odontogram/ToothDetailPanel.tsx",
      "src/components/odontogram/tooth-names.ts",
    ];
    for (const f of newFiles) {
      const c = readFileSync(resolve(f), "utf-8");
      expect(c, `${f} no debe exponer .note`).not.toContain(".note");
      expect(c, `${f} no debe exponer .recordedByUserId`).not.toContain(".recordedByUserId");
    }
  });
});
