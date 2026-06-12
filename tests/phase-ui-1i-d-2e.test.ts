// NELZZON — Pruebas Fase 1I-D-2E (densidad visual premium de la ficha del
// paciente). Estructurales sobre el código fuente:
// - Cabecera (avatar, nombre, mini-métricas, "Atención de hoy") más compacta.
// - Perfil clínico usa una retícula interna de 3 columnas (alertas | alergias
//   y medicamentos | nota de seguridad) en vez de filas apiladas, sin perder
//   información (ver también phase-ui-1i-d-2d.test.ts).
// - El diagrama del odontograma ya no se centra con mx-auto dentro del
//   contenedor con scroll, para evitar que se vea "cortado" al cargar.
// No se toca DB, permisos, server actions, cálculos financieros, lógica
// clínica ni datos (todo el contenido sigue presente, solo se compacta).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const fvoPath = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const fvoContent = readFileSync(fvoPath, "utf-8");

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-D-2E — Densidad visual premium", () => {
  it("la cabecera reduce avatar, tipografía del nombre y padding general", () => {
    expect(viewContent).toContain("size-10");
    expect(viewContent).not.toContain("size-14");
    expect(viewContent).toContain("text-xl font-bold");
    expect(viewContent).not.toContain("text-2xl font-bold");
    expect(viewContent).toContain('p-3 md:p-4');
  });

  it("MiniStat usa padding compacto tipo chip", () => {
    const idx = viewContent.indexOf("function MiniStat");
    const block = viewContent.slice(idx, idx + 400);
    expect(block).toContain("px-2.5 py-1.5");
  });

  it('"Atención de hoy" reduce el aire vertical respecto a 1I-D-2C/2D', () => {
    const idx = viewContent.indexOf(">Atención de hoy<");
    expect(idx).toBeGreaterThan(-1);
    const before = viewContent.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain("pt-3 border-t");
  });

  it("PatientClinicalProfileSection usa una retícula interna de 3 columnas (alertas | alergias y medicamentos | nota de seguridad)", () => {
    expect(fvoContent).toContain("grid grid-cols-1 lg:grid-cols-3 gap-3");
    const gridIdx = fvoContent.indexOf("grid grid-cols-1 lg:grid-cols-3 gap-3");
    const block = fvoContent.slice(gridIdx, gridIdx + 3000);
    expect(block).toContain("Alertas médicas");
    expect(block).toContain("Alergias conocidas");
    expect(block).toContain("Medicamentos actuales");
    expect(block).toContain("Notas de seguridad");
    expect(block).toContain("visibleAlerts");
    expect(block).toContain("clinicalProfile.knownAllergies");
    expect(block).toContain("clinicalProfile.currentMedications");
    expect(block).toContain("clinicalProfile.safetyNotes");
    expect(block).toContain("line-clamp-2");
  });

  it("el perfil clínico compacto no elimina alertas, alergias, medicamentos ni notas — solo reordena en columnas", () => {
    expect(fvoContent).toContain("Sin alertas registradas");
    expect(fvoContent).toContain("Ninguna registrada");
    expect(fvoContent).toContain("Ninguno registrado");
    expect(fvoContent).toContain("Sin notas registradas");
    expect(fvoContent).toContain("hasMoreDetail");
    expect(fvoContent).toContain("Ver perfil completo");
  });

  it("el diagrama dental no se centra incondicionalmente dentro del contenedor con scroll (ver phase-ui-1i-d-2g.test.ts para el centrado en desktop)", () => {
    const idx = odontogramContent.indexOf("overflow-x-auto pb-2");
    expect(idx).toBeGreaterThan(-1);
    const block = odontogramContent.slice(idx, idx + 200);
    expect(block).not.toMatch(/(?<!lg:)mx-auto/);
    expect(block).toContain("w-max");
  });

  it("las tarjetas de Diagrama dental y Hallazgos activos usan padding más compacto", () => {
    expect(odontogramContent).toContain("px-3 py-2.5 border-b");
    expect(odontogramContent).toContain("px-3 py-3");
    expect(odontogramContent).toContain('title="Diagrama dental"');
    expect(odontogramContent).toContain('title="Hallazgos activos"');
  });

  it("no se elimina información clínica ni se toca DB/permisos/server actions", () => {
    for (const content of [viewContent, fvoContent, odontogramContent]) {
      expect(content).not.toContain("makeTenantRunner");
      expect(content).not.toContain("requireOrganization");
      expect(content).not.toContain("n.body");
      expect(content).not.toContain("note.body");
    }
  });
});
