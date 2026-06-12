// NELZZON — Pruebas Fase 1I-C (compactar jerarquía de la ficha del paciente).
// Estructurales sobre el código fuente (mismo patrón que phase-ui-1i-b.test.ts):
// - "Operación" es una tarjeta madre con resumen (plan activo, ítems vivos/
//   aceptados, presupuesto aceptado, pagado, saldo, documentos) y detalle
//   bajo demanda (operationDetail).
// - "Datos del paciente" usa PatientFVOSectionsClient en variant="compact",
//   organizado por subsecciones (General, Domicilio, Contactos, Fiscal,
//   Consentimiento, Origen).
// - "Historial clínico" muestra solo los últimos 5 eventos por default, con
//   "Ver historial completo" para el resto, sin tocar buildTimeline.
// - "Bitácora de eventos" queda con tone="muted" (secundaria).
// - Texto técnico/debug ("Secciones visibles: ...") eliminado.
// - Leyenda del odontograma colapsada por default.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const pagePath = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const pageContent = readFileSync(pagePath, "utf-8");

const timelinePath = resolve("src/components/patients/PatientTimeline.tsx");
const timelineContent = readFileSync(timelinePath, "utf-8");

const fvoPath = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const fvoContent = readFileSync(fvoPath, "utf-8");

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-C — Compactar jerarquía de la ficha del paciente", () => {
  it('"Tratamiento y pagos" es una tarjeta madre con resumen y detalle bajo demanda', () => {
    expect(viewContent).toContain('title="Tratamiento y pagos"');
    expect(viewContent).toContain('label="Plan activo"');
    expect(viewContent).toContain('label="Ítems vivos / aceptados"');
    expect(viewContent).toContain('label="Presupuesto aceptado"');
    expect(viewContent).toContain('label="Pagado"');
    expect(viewContent).toContain('label="Saldo"');
    expect(viewContent).toContain('label="Documentos"');
    expect(viewContent).toContain("{operationDetail}");
  });

  it("ya no duplica resumen de plan/presupuesto en el panel clínico principal", () => {
    expect(viewContent).not.toContain('title="Resumen de plan de tratamiento"');
    expect(viewContent).not.toContain('title="Resumen de presupuestos y cobros"');
  });

  it('page.tsx pasa operationDetail con "Planes de tratamiento", "Presupuestos y cobros" y "Documentos del paciente"', () => {
    expect(pageContent).toContain("operationDetail={operationDetail}");
    expect(pageContent).toContain(">Planes de tratamiento<");
    expect(pageContent).toContain(">Presupuestos y cobros<");
    expect(pageContent).toContain(">Documentos del paciente<");
  });

  it('"Datos del paciente" usa PatientFVOSectionsClient en variant="compact"', () => {
    expect(viewContent).toContain('variant="compact"');
  });

  it("PatientFVOSectionsClient soporta variant compact con SectionCard y GroupLabel", () => {
    expect(fvoContent).toContain('variant?: "default" | "compact"');
    expect(fvoContent).toContain("function GroupLabel");
    expect(fvoContent).toContain("<GroupLabel>General</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Domicilio</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Responsables y emergencia</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Fiscal</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Consentimiento</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Origen</GroupLabel>");
  });

  it("no rompe botones de Editar/Agregar/Revocar ni server actions de FVO", () => {
    expect(fvoContent).toContain("Editar");
    expect(fvoContent).toContain("Agregar tutor");
    expect(fvoContent).toContain("Agregar contacto");
    expect(fvoContent).toContain("Revocar consentimiento");
    expect(fvoContent).toContain("Otorgar consentimiento");
  });

  it('"Historial clínico" muestra solo los últimos 5 eventos con opción "Ver historial completo"', () => {
    expect(timelineContent).toContain("VISIBLE_ENTRIES = 5");
    expect(timelineContent).toContain("Ver historial completo");
    expect(timelineContent).toContain("entries.slice(0, VISIBLE_ENTRIES)");
    expect(timelineContent).toContain("entries.slice(VISIBLE_ENTRIES)");
    // buildTimeline no se modifica
    expect(timelineContent).toContain("function buildTimeline(");
    expect(timelineContent).toContain("for (const it of p.items)");
  });

  it('"Auditoría" queda con tono secundario (muted), cerrada por default', () => {
    const idx = viewContent.indexOf('title="Auditoría"');
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 400);
    expect(block).toContain('tone="muted"');
    expect(block).not.toContain("defaultOpen");
  });

  it('PatientDisclosureSection soporta tone="muted"', () => {
    const disclosurePath = resolve("src/components/patients/PatientDisclosureSection.tsx");
    const disclosureContent = readFileSync(disclosurePath, "utf-8");
    expect(disclosureContent).toContain('tone?: "default" | "muted"');
  });

  it('elimina texto técnico/debug "Secciones visibles" y _meta del render', () => {
    expect(viewContent).not.toContain("Secciones visibles");
    expect(viewContent).not.toContain("_meta");
  });

  it("leyenda del odontograma queda colapsada por default", () => {
    expect(odontogramContent).toContain("<details");
    expect(odontogramContent).toContain("Ver leyenda");
    expect(odontogramContent).toContain("<OdontogramLegend />");
  });

  it("no accede a .body de notas clínicas en los archivos tocados", () => {
    for (const content of [viewContent, pageContent, timelineContent, fvoContent, odontogramContent]) {
      expect(content).not.toContain("n.body");
      expect(content).not.toContain("note.body");
      expect(content).not.toContain("notesSummary");
    }
  });
});
