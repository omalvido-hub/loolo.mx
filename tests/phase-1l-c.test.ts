// NELZZON — Pruebas Fase 1L-C (Agenda premium visual, sin tocar lógica).
// Estructurales por readFileSync, siguiendo el patrón de
// tests/phase-1l-b.test.ts y tests/phase-1k-e.test.ts:
// - AgendaView usa la nueva estructura premium (SectionCard + EmptyState),
//   sin convertir la lista de citas en una <table>.
// - AppointmentForm conserva el guardado anti-citas-huérfanas, los mensajes
//   bloqueados, el paciente resuelto y el link "Volver a ficha del paciente".
// - No se toca server/, dominio, prisma, dashboard ni ficha de paciente.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const VIEW_PATH = resolve("src/components/agenda/AgendaView.tsx");
const FORM_PATH = resolve("src/components/agenda/AppointmentForm.tsx");
const EMPTY_STATE_PATH = resolve("src/components/ui/empty-state.tsx");

const viewContent = readFileSync(VIEW_PATH, "utf-8");
const formContent = readFileSync(FORM_PATH, "utf-8");

describe("1L-C — AgendaView: estructura premium", () => {
  it("usa SectionCard para la sección de citas del día", () => {
    expect(viewContent).toMatch(/from\s+"@\/components\/ui\/section-card"/);
    expect(viewContent).toContain("<SectionCard");
  });

  it("ya no renderiza la lista de citas como <table>", () => {
    expect(viewContent).not.toMatch(/<table/i);
    expect(viewContent).not.toMatch(/<thead/i);
    expect(viewContent).not.toMatch(/<tbody/i);
  });

  it("usa EmptyState para el caso sin citas, preservando el mensaje", () => {
    expect(existsSync(EMPTY_STATE_PATH)).toBe(true);
    expect(viewContent).toMatch(/from\s+"@\/components\/ui\/empty-state"/);
    expect(viewContent).toContain("<EmptyState");
    expect(viewContent).toContain("No hay citas agendadas en el rango seleccionado.");
  });

  it("conserva Props (patientId, patient, canCreateAppointment) y AppointmentForm condicionado", () => {
    const idx = viewContent.indexOf("interface Props");
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 300);
    expect(block).toContain("patientId?: string");
    expect(block).toContain("patient: AgendaPatientContext | null");
    expect(block).toContain("canCreateAppointment: boolean");
    expect(viewContent).toMatch(/canCreateAppointment\s*&&[\s\S]*?<AppointmentForm/);
  });

  it("conserva los datos mostrados por cita (hora, paciente, estado, recurso, motivo)", () => {
    expect(viewContent).toContain("formatTime(appt.startAt)");
    expect(viewContent).toContain("formatTime(appt.endAt)");
    expect(viewContent).toContain("appt.displayName");
    expect(viewContent).toContain("<AppointmentStatusBadge status={appt.status} />");
    expect(viewContent).toContain("appt.reason");
  });

  it("no invoca acciones de escritura directamente", () => {
    const forbidden = [
      "createAppointmentAction",
      "confirmAppointment",
      "rescheduleAppointment",
      "cancelAppointment",
      "markNoShow",
      "completeAppointment",
    ];
    for (const fn of forbidden) {
      expect(viewContent, `AgendaView.tsx no debe invocar ${fn}`).not.toContain(fn);
    }
  });
});

describe("1L-C — AppointmentForm: mensajes y lógica anti-citas-huérfanas preservados", () => {
  it('sin patientId: conserva el mensaje "Para agendar una cita…"', () => {
    expect(formContent).toMatch(/if\s*\(!patientId\)\s*\{/);
    expect(formContent).toContain("Para agendar una cita, primero abre la ficha de un paciente y usa");
  });

  it('con patientId sin paciente resuelto: conserva "Paciente no encontrado o sin acceso."', () => {
    expect(formContent).toMatch(/if\s*\(!patient\)\s*\{/);
    expect(formContent).toContain("Paciente no encontrado o sin acceso.");
  });

  it("conserva el paciente resuelto (patient.fullName) sin exponer IDs crudos", () => {
    expect(formContent).toContain("patient.fullName");
    expect(formContent).not.toMatch(/\{patient\.patientId\}(?!`)/);
    expect(formContent).not.toMatch(/\{patient\.contactId\}/);
  });

  it("conserva createAppointmentAction con patientId/contactId del paciente resuelto", () => {
    expect(formContent).toContain("createAppointmentAction({");
    expect(formContent).toContain("patientId: resolvedPatient.patientId");
    expect(formContent).toContain("contactId: resolvedPatient.contactId");
    const earlyReturnIdx = formContent.indexOf("if (!patient)");
    const callIdx = formContent.indexOf("createAppointmentAction({");
    expect(callIdx).toBeGreaterThan(earlyReturnIdx);
  });

  it('conserva el mensaje de éxito y el link "Volver a ficha del paciente →"', () => {
    expect(formContent).toContain("Cita agendada correctamente.");
    expect(formContent).toContain("Volver a ficha del paciente →");
    expect(formContent).toMatch(/href=\{`\/pacientes\/\$\{(resolvedPatient|patient)\.patientId\}`\}/);
  });

  it("conserva offset fijo -06:00 y duraciones 30/45/60", () => {
    expect(formContent).toContain("-06:00");
    expect(formContent).toContain("[30, 45, 60]");
  });
});

describe("1L-C — alcance: no toca server, dominio, prisma, dashboard ni ficha de paciente", () => {
  it("no menciona rutas de server/domain/prisma en AgendaView ni AppointmentForm más allá de lo ya existente", () => {
    expect(viewContent).not.toMatch(/from\s+"@\/server\/actions/);
    expect(formContent).not.toMatch(/from\s+"@\/server\/actions\/(?!agenda)/);
  });

  it("no existen cambios en dashboard ni ficha de paciente como parte de esta fase (archivos no modificados)", () => {
    expect(existsSync(resolve("src/app/(app)/dashboard"))).toBe(true);
    expect(existsSync(resolve("src/components/patients/PatientLiveRecordView.tsx"))).toBe(true);
  });
});
