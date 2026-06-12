// NELZZON — Pruebas Fase 1J-C (UI de "Próxima cita" real en la Ficha Viva del
// paciente). Estructurales sobre el código fuente de PatientLiveRecordView:
// - La mini-métrica "Próxima cita" muestra fecha/hora reales y, si las hay,
//   profesional/sillón y estado, con un CTA (nunca IDs crudos en pantalla).
// - "Atención de hoy" resalta la cita del día cuando existe, sin perder los
//   campos previos (Última cita, conversaciones, tareas, última actividad).
// - Se respeta resources.view: si el resolver no entrega professionalName/
//   chairName, la línea de recurso simplemente no se muestra.
// No se toca DB, permisos, server actions ni dominio.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewPath = resolve("src/components/patients/PatientLiveRecordView.tsx");
const viewContent = readFileSync(viewPath, "utf-8");

describe("1J-C — Próxima cita real en la Ficha Viva", () => {
  it("define los helpers de formateo requeridos, sin librerías nuevas", () => {
    expect(viewContent).toContain("function formatAppointmentDate(");
    expect(viewContent).toContain("function formatAppointmentTime(");
    expect(viewContent).toContain("function isSameLocalDay(");
    expect(viewContent).toContain("function formatResourceLine(");
    expect(viewContent).not.toMatch(/from "date-fns"|from "dayjs"|from "luxon"/);
  });

  it('la mini-métrica "Próxima cita" usa fecha/hora reales y CTA hacia agenda', () => {
    const idx = viewContent.indexOf('label="Próxima cita"');
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 1500);

    // Valor: fecha+hora reales (o "Hoy" si la cita es hoy), nunca el ISO crudo.
    expect(block).toContain("formatAppointmentDate(nextAppt.startAt)");
    expect(block).toContain("formatAppointmentTime(nextAppt.startAt)");
    expect(block).toContain("nextApptIsToday");

    // Fallback claro cuando no hay cita.
    expect(block).toContain('"Sin cita"');

    // Estado legible (reutiliza APPT_STATUS_LABELS) y recurso (profesional/sillón).
    expect(block).toContain("APPT_STATUS_LABELS[nextAppt.status]");
    expect(block).toContain("nextApptResourceLine");

    // CTA: a la cita concreta si existe, a /agenda?patientId=<id> si no (1K-C).
    expect(block).toContain("`/agenda?appointmentId=${nextAppt.id}`");
    expect(block).toContain('"Ver cita →"');
    expect(block).toContain("`/agenda?patientId=${patientId}`");
    expect(block).toContain('"Agendar →"');
  });

  it('"Atención de hoy" resalta la cita del día sin perder los campos previos', () => {
    const idx = viewContent.indexOf(">Atención de hoy<");
    expect(idx).toBeGreaterThan(-1);
    const clinicaIdx = viewContent.indexOf('title="Clínica"');
    const block = viewContent.slice(idx, clinicaIdx);

    // Nuevo: línea "Cita de hoy" condicional.
    expect(block).toContain("nextAppt && nextApptIsToday");
    expect(block).toContain("Cita de hoy:");

    // Se conservan los campos previos requeridos por 1I-D-2.
    expect(block).toContain("Última cita:");
    expect(block).toContain("Conversaciones abiertas:");
    expect(block).toContain("Tareas abiertas:");
    expect(block).toContain("Última actividad:");
    expect(block).toContain('href="/agenda"');
  });

  it("nunca expone IDs crudos ni el literal null como texto visible", () => {
    // El id de la cita solo se usa para construir la URL del CTA, no se imprime.
    expect(viewContent).not.toMatch(/\{nextAppt\.id\}(?!`)/);
    expect(viewContent).not.toMatch(/\{nextAppt\.professionalResourceId\}/);
    expect(viewContent).not.toMatch(/\{nextAppt\.chairResourceId\}/);

    // formatResourceLine filtra valores ausentes antes de unirlos.
    expect(viewContent).toContain("filter((v): v is string => !!v)");
  });

  it("formatResourceLine respeta resources.view: sin nombres, no agrega texto extra", () => {
    const idx = viewContent.indexOf("function formatResourceLine(");
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 300);
    expect(block).toContain('parts.length > 0 ? parts.join(" · ") : null');
  });
});
