// NELZZON — Pruebas Fase 1I-D-2D (compactar zona Clínica / Perfil clínico).
// Estructurales sobre el código fuente:
// - "Clínica" se reordena en 3 bloques full-width: perfil clínico resumido,
//   odontograma (diagrama + hallazgos en retícula interna) y consultas
//   clínicas (ver también phase-ui-1i-d-2.test.ts).
// - PatientClinicalProfileSection (perfil clínico) se compacta por default:
//   máximo MAX_VISIBLE_ALERTS alertas (priorizando activas/severidad alta),
//   alergias y medicamentos como chips, nota de seguridad con line-clamp-2,
//   y "Ver perfil completo" para alertas adicionales + antecedentes.
// No se toca DB, permisos, server actions, cálculos financieros ni datos
// clínicos (todo el contenido sigue presente, solo se reordena/compacta).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const fvoPath = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const fvoContent = readFileSync(fvoPath, "utf-8");

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-D-2D — Compactar zona Clínica / Perfil clínico", () => {
  it('"Consultas clínicas" usa una retícula de 2 columnas para sus filas (compacto, sin hueco)', () => {
    const idx = viewContent.indexOf('title="Consultas clínicas"');
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 1200);
    expect(block).toContain("grid grid-cols-1 sm:grid-cols-2");
    expect(block).toContain("Total consultas");
    expect(block).toContain("Última consulta");
    expect(block).toContain("Estado última consulta");
    expect(block).toContain("Notas clínicas");
    expect(block).toContain("Última nota");
    expect(block).toContain("Ver todas las consultas");
  });

  it("PatientClinicalProfileSection compacta alertas médicas (máximo MAX_VISIBLE_ALERTS por default)", () => {
    expect(fvoContent).toContain("MAX_VISIBLE_ALERTS = 3");
    expect(fvoContent).toContain("visibleAlerts");
    expect(fvoContent).toContain("restAlerts");
    expect(fvoContent).toContain("ALERT_SEVERITY_RANK");
  });

  it("alertas activas y de mayor severidad se priorizan en las visibles por default", () => {
    const idx = fvoContent.indexOf("sortedAlerts");
    expect(idx).toBeGreaterThan(-1);
    const block = fvoContent.slice(idx, idx + 400);
    expect(block).toContain("a.active !== b.active");
    expect(block).toContain("ALERT_SEVERITY_RANK");
  });

  it('nota de seguridad usa line-clamp-2 por default, sin eliminar el contenido', () => {
    expect(fvoContent).toContain("clinicalProfile.safetyNotes");
    const idx = fvoContent.indexOf("Notas de seguridad");
    const block = fvoContent.slice(idx, idx + 300);
    expect(block).toContain("line-clamp-2");
    expect(block).toContain("{clinicalProfile.safetyNotes}");
  });

  it('alertas adicionales y antecedentes quedan bajo "Ver perfil completo", sin perder datos', () => {
    expect(fvoContent).toContain("Ver perfil completo");
    // La primera aparición es el comentario; la segunda es el <summary> real.
    const idx = fvoContent.indexOf("Ver perfil completo", fvoContent.indexOf("Ver perfil completo") + 1);
    const block = fvoContent.slice(idx, idx + 1200);
    expect(block).toContain("restAlerts");
    expect(block).toContain("clinicalProfile.relevantHistory");
    expect(block).toContain("Antecedentes");
  });

  it("alergias y medicamentos siguen mostrándose como chips, sin cambios de datos", () => {
    expect(fvoContent).toContain("Alergias conocidas");
    expect(fvoContent).toContain("Medicamentos actuales");
    expect(fvoContent).toContain("clinicalProfile.knownAllergies");
    expect(fvoContent).toContain("clinicalProfile.currentMedications");
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
