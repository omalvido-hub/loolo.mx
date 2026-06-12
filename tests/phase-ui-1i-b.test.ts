// NELZZON — Pruebas Fase 1I-B (reorganización visual de la ficha del paciente).
// Estructurales sobre el código fuente (mismo patrón que phase-ui-1h-c.test.ts):
// - "Historial clínico" (FVO) renombrado a "Consultas clínicas", sin colisión
//   con PatientTimeline.
// - Layout responsive de 2 columnas en el panel clínico principal.
// - Componente de desplegable PatientDisclosureSection presente y usado para
//   "Detalle operativo", "Datos del paciente" y "Bitácora de eventos".
// - "Detalle operativo" agrupa Planes, Presupuestos/Cobros y Documentos.
// - "Datos del paciente" agrupa identidad y secciones FVO.
// - No se elimina texto/labels clave ni se accede a .body de notas clínicas.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const pagePath = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const pageContent = readFileSync(pagePath, "utf-8");

const timelinePath = resolve("src/components/patients/PatientTimeline.tsx");
const timelineContent = readFileSync(timelinePath, "utf-8");

const disclosurePath = resolve("src/components/patients/PatientDisclosureSection.tsx");
const disclosureContent = readFileSync(disclosurePath, "utf-8");

describe("1I-B — Reorganización visual de la ficha del paciente", () => {
  it('renombra la sección de resumen de consultas a "Consultas clínicas"', () => {
    expect(viewContent).toContain('title="Consultas clínicas"');
    expect(viewContent).not.toContain('title="Historial clínico"');
  });

  it('PatientTimeline conserva "Historial" sin colisión de título', () => {
    expect(timelineContent).toContain("Historial");
  });

  it("panel clínico principal usa grid responsive de 1/2 columnas", () => {
    expect(viewContent).toContain("grid-cols-1 md:grid-cols-2");
  });

  it("existe el componente presentacional PatientDisclosureSection (details/summary)", () => {
    expect(disclosureContent).toContain("<details");
    expect(disclosureContent).toContain("<summary");
    expect(disclosureContent).toContain("export function PatientDisclosureSection");
  });

  it('"Datos del paciente" es una tarjeta madre desplegable con identidad y secciones FVO', () => {
    expect(viewContent).toContain("PatientDisclosureSection");
    expect(viewContent).toContain('title="Datos del paciente"');
    expect(viewContent).toContain("Identidad y contacto");
    expect(viewContent).toContain("<PatientFVOSectionsClient");
  });

  it('"Auditoría" queda en su propio desplegable, fuera del flujo clínico principal', () => {
    expect(viewContent).toContain('title="Auditoría"');
    const bitacoraIdx = viewContent.indexOf('title="Auditoría"');
    const sectionBefore = viewContent.lastIndexOf("PatientDisclosureSection", bitacoraIdx);
    expect(sectionBefore).toBeGreaterThan(-1);
    expect(sectionBefore).toBeLessThan(bitacoraIdx);
  });

  it('"Tratamiento y pagos" agrupa Planes, Presupuestos/Cobros y Documentos en page.tsx (vía operationDetail con tabs)', () => {
    expect(pageContent).toContain("<PatientOperationTabs");
    expect(pageContent).toContain(">Planes de tratamiento<");
    expect(pageContent).toContain(">Presupuestos y cobros<");
    expect(pageContent).toContain(">Documentos del paciente<");
    expect(pageContent).toContain("<TreatmentPlansSectionClient");
    expect(pageContent).toContain("<QuotesSectionClient");
    expect(pageContent).toContain("<PatientDocumentsSection");
    expect(pageContent).toContain("operationDetail={operationDetail}");
  });

  it("PatientTimeline se pasa como historyTimeline a PatientLiveRecordView", () => {
    expect(pageContent).toContain("<PatientTimeline");
    expect(pageContent).toContain("historyTimeline={historyTimeline}");
  });

  it("no se elimina información clave (resumen de Tratamiento y pagos, agenda, perfil clínico)", () => {
    expect(viewContent).toContain('title="Tratamiento y pagos"');
    expect(viewContent).toContain('href="/agenda"');
    expect(viewContent).toContain("<PatientClinicalProfileSection");
  });

  it("no accede a .body de notas clínicas en los archivos tocados", () => {
    for (const content of [viewContent, pageContent, disclosureContent]) {
      expect(content).not.toContain("n.body");
      expect(content).not.toContain("note.body");
      expect(content).not.toContain("notesSummary");
    }
  });
});
