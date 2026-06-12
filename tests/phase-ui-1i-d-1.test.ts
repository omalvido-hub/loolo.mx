// NELZZON — Pruebas Fase 1I-D-1 (prueba del niño / renombres y separación mental
// de la ficha del paciente). Estructurales sobre el código fuente:
// - Nueva sección "Atención de hoy" agrupa Agenda y Tareas abiertas.
// - "Panel clínico principal" → "Clínica" (enfocada solo en lo clínico).
// - "Operación" → "Tratamiento y pagos".
// - "Historial clínico" → "Historial" (PatientTimeline).
// - "Bitácora de eventos" → "Auditoría".
// - "Contactos" → "Responsables y emergencia" (PatientFVOSectionsClient).
// No se toca DB, permisos, cálculos financieros ni lógica clínica.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const timelinePath = resolve("src/components/patients/PatientTimeline.tsx");
const timelineContent = readFileSync(timelinePath, "utf-8");

const fvoPath = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const fvoContent = readFileSync(fvoPath, "utf-8");

describe("1I-D-1 — Prueba del niño: renombres y separación mental", () => {
  it('existe la sección "Atención de hoy" con agenda y tareas (1I-D-2: franja compacta)', () => {
    expect(viewContent).toContain('title="Atención de hoy"');
    const idx = viewContent.indexOf('title="Atención de hoy"');
    const block = viewContent.slice(idx, idx + 2000);
    expect(block).toContain("Tareas abiertas");
    expect(block).toContain('href="/agenda"');
  });

  it('"Atención de hoy" aparece antes de "Clínica"', () => {
    const atencionIdx = viewContent.indexOf('title="Atención de hoy"');
    const clinicaIdx = viewContent.indexOf('title="Clínica"');
    expect(atencionIdx).toBeGreaterThan(-1);
    expect(clinicaIdx).toBeGreaterThan(-1);
    expect(atencionIdx).toBeLessThan(clinicaIdx);
  });

  it('"Panel clínico principal" se renombra a "Clínica" y ya no contiene Agenda/Tareas', () => {
    expect(viewContent).not.toContain('title="Panel clínico principal"');
    expect(viewContent).toContain('title="Clínica"');

    const clinicaIdx = viewContent.indexOf('title="Clínica"');
    const tratamientoIdx = viewContent.indexOf('title="Tratamiento y pagos"');
    const clinicaBlock = viewContent.slice(clinicaIdx, tratamientoIdx);
    expect(clinicaBlock).not.toContain('title="Agenda"');
    expect(clinicaBlock).not.toContain('title="Tareas abiertas"');
    expect(clinicaBlock).toContain("<PatientClinicalProfileSection");
    expect(clinicaBlock).toContain('title="Consultas clínicas"');
    expect(clinicaBlock).toContain("odontogramSection");
  });

  it('"Operación" se renombra a "Tratamiento y pagos" y conserva su resumen compacto', () => {
    expect(viewContent).not.toContain('title="Operación"');
    expect(viewContent).toContain('title="Tratamiento y pagos"');
    expect(viewContent).toContain('label="Plan activo"');
    expect(viewContent).toContain('label="Ítems vivos / aceptados"');
    expect(viewContent).toContain('label="Presupuesto aceptado"');
    expect(viewContent).toContain('label="Pagado"');
    expect(viewContent).toContain('label="Saldo"');
    expect(viewContent).toContain('label="Documentos"');
    expect(viewContent).toContain("{operationDetail}");
  });

  it('"Bitácora de eventos" se renombra a "Auditoría", sigue muted y cerrada por default', () => {
    expect(viewContent).not.toContain('title="Bitácora de eventos"');
    expect(viewContent).toContain('title="Auditoría"');
    const idx = viewContent.indexOf('title="Auditoría"');
    const block = viewContent.slice(idx, idx + 400);
    expect(block).toContain('tone="muted"');
    expect(block).not.toContain("defaultOpen");
  });

  it('PatientTimeline renombra el título "Historial clínico" a "Historial"', () => {
    expect(timelineContent).not.toContain(">Historial clínico<");
    expect(timelineContent).toContain(">Historial<");
    expect(timelineContent).toContain("VISIBLE_ENTRIES = 5");
    expect(timelineContent).toContain("Ver historial completo");
  });

  it('PatientFVOSectionsClient renombra el grupo "Contactos" a "Responsables y emergencia"', () => {
    expect(fvoContent).not.toContain("<GroupLabel>Contactos</GroupLabel>");
    expect(fvoContent).toContain("<GroupLabel>Responsables y emergencia</GroupLabel>");
    // El grupo cubre tanto Tutor/Responsable como Contacto de emergencia.
    const idx = fvoContent.indexOf("<GroupLabel>Responsables y emergencia</GroupLabel>");
    const block = fvoContent.slice(idx, idx + 4000);
    expect(block).toContain('title="Tutor / Responsable"');
    expect(block).toContain('title="Contacto de emergencia"');
  });

  it("no toca DB, permisos, server actions ni cálculos financieros", () => {
    for (const content of [viewContent, timelineContent, fvoContent]) {
      expect(content).not.toContain("makeTenantRunner");
      expect(content).not.toContain("requireOrganization");
      expect(content).not.toContain("n.body");
      expect(content).not.toContain("note.body");
    }
  });
});
