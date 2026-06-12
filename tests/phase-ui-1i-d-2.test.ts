// NELZZON — Pruebas Fase 1I-D-2 (rediseño visual completo de la ficha del
// paciente, "prueba del niño"). Estructurales sobre el código fuente:
// - Cabecera compacta: PatientStatusBar y PatientCareChain dejan de usarse
//   visualmente (los archivos se conservan sin uso en el repo),
//   reemplazados por una sola franja de resumen (próxima cita, consulta
//   activa, plan, saldo, hallazgos).
// - "Atención de hoy" es una franja compacta (no tarjeta gigante) con
//   última cita, conversaciones, tareas, última actividad y link a agenda.
// - "Clínica" mantiene 2 columnas: izquierda = perfil clínico + consultas;
//   derecha = odontograma (que ya incluye "Hallazgos activos" como tarjeta
//   propia, separada del diagrama).
// - "Tratamiento y pagos" usa PatientOperationTabs (tabs internas: Planes de
//   tratamiento, Presupuestos y cobros, Documentos), con el resumen siempre
//   visible.
// - "Datos del paciente" no duplica el rótulo "General".
// - Historial y Auditoría sin cambios funcionales.
// No se toca DB, permisos, server actions, cálculos financieros ni lógica
// clínica.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

const pagePath = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const pageContent = readFileSync(pagePath, "utf-8");

const tabsPath = resolve("src/components/patients/PatientOperationTabs.tsx");
const tabsContent = readFileSync(tabsPath, "utf-8");

const odontogramPath = resolve("src/components/odontogram/OdontogramMasterSection.tsx");
const odontogramContent = readFileSync(odontogramPath, "utf-8");

describe("1I-D-2 — Rediseño visual completo (prueba del niño)", () => {
  it("PatientStatusBar y PatientCareChain ya no se usan visualmente, pero los archivos se conservan sin uso", () => {
    expect(viewContent).not.toContain("PatientStatusBar");
    expect(viewContent).not.toContain("PatientCareChain");
    expect(existsSync(resolve("src/components/patients/PatientStatusBar.tsx"))).toBe(true);
    expect(existsSync(resolve("src/components/patients/PatientCareChain.tsx"))).toBe(true);
  });

  it("la cabecera tiene una franja de resumen compacta con próxima cita, consulta activa, plan y saldo", () => {
    expect(viewContent).toContain("Próxima cita:");
    expect(viewContent).toContain("Consulta activa:");
    expect(viewContent).toContain("Plan:");
    expect(viewContent).toContain("Saldo:");
    expect(viewContent).toContain("activeEncounter");
  });

  it('"Atención de hoy" es una franja compacta, no una SectionCard grande', () => {
    const idx = viewContent.indexOf('title="Atención de hoy"');
    expect(idx).toBeGreaterThan(-1);
    const clinicaIdx = viewContent.indexOf('title="Clínica"');
    const block = viewContent.slice(idx, clinicaIdx);
    expect(block).toContain("Última cita:");
    expect(block).toContain("Conversaciones abiertas:");
    expect(block).toContain("Tareas abiertas:");
    expect(block).toContain("Última actividad:");
    expect(block).toContain('href="/agenda"');
    // No debe quedar como SectionCard con título propio "Agenda"
    expect(block).not.toContain('title="Agenda"');
  });

  it('"Clínica" mantiene 2 columnas: perfil clínico + consultas a la izquierda, odontograma a la derecha', () => {
    expect(viewContent).toContain('title="Clínica"');
    expect(viewContent).toContain("grid-cols-1 md:grid-cols-2");
    const clinicaIdx = viewContent.indexOf('title="Clínica"');
    const tratamientoIdx = viewContent.indexOf('title="Tratamiento y pagos"');
    const block = viewContent.slice(clinicaIdx, tratamientoIdx);
    expect(block).toContain("<PatientClinicalProfileSection");
    expect(block).toContain('title="Consultas clínicas"');
    expect(block).toContain("odontogramSection");
  });

  it('OdontogramMasterSection separa "Hallazgos activos" del diagrama (cada uno su propia tarjeta)', () => {
    expect(odontogramContent).toContain('title="Diagrama dental"');
    expect(odontogramContent).toContain('title="Hallazgos activos"');
    expect(odontogramContent).toContain("<FindingsPanel");
  });

  it('"Tratamiento y pagos" usa PatientOperationTabs para el detalle, con resumen siempre visible', () => {
    expect(viewContent).toContain('title="Tratamiento y pagos"');
    expect(viewContent).toContain('label="Plan activo"');
    expect(viewContent).toContain('label="Saldo"');
    expect(viewContent).toContain("{operationDetail}");

    expect(pageContent).toContain("<PatientOperationTabs");
    expect(pageContent).toContain("tratamientos={");
    expect(pageContent).toContain("presupuestos={");
    expect(pageContent).toContain("documentos={");
  });

  it("PatientOperationTabs mantiene las 3 tabs montadas (oculto con CSS, sin perder estado)", () => {
    expect(tabsContent).toContain('"use client"');
    expect(tabsContent).toContain("Tratamientos");
    expect(tabsContent).toContain("Presupuestos y cobros");
    expect(tabsContent).toContain("Documentos");
    expect(tabsContent).toContain("useState");
    expect(tabsContent).toContain('"hidden"');
  });

  it('"Datos del paciente" no duplica el rótulo "General"', () => {
    const idx = viewContent.indexOf('title="Datos del paciente"');
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 2500);
    const generalMatches = block.match(/>General</g) ?? [];
    expect(generalMatches.length).toBeLessThanOrEqual(1);
    expect(block).toContain("Identidad y contacto");
  });

  it("Historial y Auditoría siguen presentes sin cambios funcionales", () => {
    expect(viewContent).toContain("{historyTimeline}");
    expect(viewContent).toContain('title="Auditoría"');
    const idx = viewContent.indexOf('title="Auditoría"');
    const block = viewContent.slice(idx, idx + 400);
    expect(block).toContain('tone="muted"');
  });

  it("no toca DB, permisos, server actions ni cálculos financieros", () => {
    for (const content of [viewContent, tabsContent]) {
      expect(content).not.toContain("makeTenantRunner");
      expect(content).not.toContain("n.body");
      expect(content).not.toContain("note.body");
    }
  });
});
