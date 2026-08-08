// NELZZON — Pruebas Fase 1K-C (UI para agendar cita real en /agenda).
// Estructurales por readFileSync, siguiendo el patrón de tests/phase-1k-b.test.ts
// y tests/phase-1j-c.test.ts:
// - /agenda lee searchParams.patientId y calcula canCreateAppointment con can().
// - AgendaView recibe patientId/canCreateAppointment y renderiza AppointmentForm
//   condicionado al permiso, sin invocar acciones de escritura directamente.
// - AppointmentForm es cliente, llama a createAppointmentAction, construye
//   startAt/endAt con offset fijo -06:00 (sin librerías nuevas), nunca muestra
//   IDs crudos de recursos (solo .name) y maneja éxito/error de forma legible.
// - La ficha del paciente manda el CTA "Sin cita" a /agenda?patientId=<id>.
// No se toca DB, dominio de agenda ni la server action.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGE_PATH = resolve("src/app/(app)/agenda/page.tsx");
const VIEW_PATH = resolve("src/components/agenda/AgendaView.tsx");
const FORM_PATH = resolve("src/components/agenda/AppointmentForm.tsx");
const PATIENT_VIEW_PATH = resolve("src/components/patients/PatientLiveRecordView.tsx");

const pageContent = readFileSync(PAGE_PATH, "utf-8");
const viewContent = readFileSync(VIEW_PATH, "utf-8");
const formContent = readFileSync(FORM_PATH, "utf-8");
const patientViewContent = readFileSync(PATIENT_VIEW_PATH, "utf-8");

describe("1K-C — integridad de archivos", () => {
  it("no existe migración 0023 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 23)).toBe(false);
  });

  it("src/components/agenda/AppointmentForm.tsx existe", () => {
    expect(existsSync(FORM_PATH)).toBe(true);
  });
});

describe("1K-C — /agenda/page.tsx: patientId + permiso de creación", () => {
  it("declara searchParams.patientId", () => {
    expect(pageContent).toMatch(/patientId\?:\s*string/);
  });

  it("calcula canCreateAppointment con can() y el permiso appointments.create", () => {
    expect(pageContent).toMatch(/from\s+"@\/server\/domain\/identity\/permissions"/);
    expect(pageContent).toContain('can(ctx.permissions, "appointments.create")');
  });

  it("pasa patientId y canCreateAppointment a AgendaView", () => {
    const idx = pageContent.indexOf("<AgendaView");
    expect(idx).toBeGreaterThan(-1);
    const block = pageContent.slice(idx, idx + 300);
    expect(block).toContain("patientId={patientId}");
    expect(block).toContain("canCreateAppointment={canCreateAppointment}");
  });

  it("no invoca acciones de escritura directamente", () => {
    const forbidden = [
      "createAppointmentAction",
      "createAppointment(",
      "confirmAppointment",
      "rescheduleAppointment",
      "cancelAppointment",
      "markNoShow",
      "completeAppointment",
    ];
    for (const fn of forbidden) {
      expect(pageContent, `page.tsx no debe invocar ${fn}`).not.toContain(fn);
    }
  });
});

describe("1K-C — AgendaView: renderiza AppointmentForm condicionado al permiso", () => {
  it("importa AppointmentForm", () => {
    expect(viewContent).toMatch(/from\s+"\.\/AppointmentForm"/);
  });

  it("declara patientId y canCreateAppointment en Props", () => {
    const idx = viewContent.indexOf("interface Props");
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 250);
    expect(block).toContain("patientId?: string");
    expect(block).toContain("canCreateAppointment: boolean");
  });

  it("renderiza <AppointmentForm> solo si canCreateAppointment es true", () => {
    expect(viewContent).toMatch(/canCreateAppointment\s*&&[\s\S]*?<AppointmentForm/);
  });

  it("AgendaView no invoca acciones de escritura directamente", () => {
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

describe("1K-C — AppointmentForm: formulario cliente seguro", () => {
  it('es un componente cliente ("use client")', () => {
    expect(formContent.split("\n")[0].trim()).toBe('"use client";');
  });

  it("importa y llama a createAppointmentAction del server action de 1K-B", () => {
    expect(formContent).toMatch(/import\s*\{[^}]*createAppointmentAction[^}]*\}\s*from\s*"@\/server\/actions\/agenda"/);
    expect(formContent).toContain("createAppointmentAction({");
  });

  it("construye startAt/endAt con offset fijo -06:00, sin librerías nuevas de fechas", () => {
    expect(formContent).toContain("-06:00");
    expect(formContent).not.toMatch(/from "date-fns"|from "dayjs"|from "luxon"/);
  });

  it("incluye campos fecha, hora, duración (30/45/60) y motivo", () => {
    expect(formContent).toContain('type="date"');
    expect(formContent).toContain('type="time"');
    expect(formContent).toContain("[30, 45, 60]");
    expect(formContent).toContain('id="appt-reason"');
  });

  it("recursos: separa profesional/sillón por kind y nunca expone IDs crudos en pantalla", () => {
    expect(formContent).toContain('r.kind === "PROFESSIONAL"');
    expect(formContent).toContain('r.kind === "CHAIR"');
    // Las opciones del select solo muestran r.name, nunca r.id como texto.
    expect(formContent).toMatch(/<option key=\{r\.id\} value=\{r\.id\}>\{r\.name\}<\/option>/);
  });

  it("permite agendar sin recurso: los selects son opcionales (Sin asignar)", () => {
    expect(formContent).toContain(">Sin asignar<");
    expect(formContent).toContain("professionalResourceId: professionalResourceId || undefined");
    expect(formContent).toContain("chairResourceId: chairResourceId || undefined");
  });

  it("incluye patientId/contactId del paciente resuelto al enviar (1K-E)", () => {
    expect(formContent).toContain("patientId: resolvedPatient.patientId");
    expect(formContent).toContain("contactId: resolvedPatient.contactId");
  });

  it("maneja éxito y error de forma legible, sin stack traces ni errores crudos", () => {
    expect(formContent).toContain("result.ok");
    expect(formContent).toContain("result.error");
    expect(formContent).not.toMatch(/error\.(message|stack)/);
    expect(formContent).not.toContain("console.error");
  });

  it("refresca tras éxito", () => {
    expect(formContent).toMatch(/router\.refresh\(\)/);
  });
});

describe("1K-C — Ficha del paciente: CTA 'Sin cita' manda a /agenda?patientId=<id>", () => {
  it('CTA sin próxima cita usa `/agenda?patientId=${patientId}`', () => {
    const idx = patientViewContent.indexOf('label="Próxima cita"');
    expect(idx).toBeGreaterThan(-1);
    const block = patientViewContent.slice(idx, idx + 1500);
    expect(block).toContain("`/agenda?appointmentId=${nextAppt.id}`");
    expect(block).toContain("`/agenda?patientId=${patientId}`");
  });

  it("no rompe el caso con cita: sigue mandando a /agenda?appointmentId=<id>", () => {
    const idx = patientViewContent.indexOf('label="Próxima cita"');
    const block = patientViewContent.slice(idx, idx + 1500);
    expect(block).toContain('"Ver cita →"');
  });
});

describe("1K-C — alcance: no toca dominio, server action ni migraciones", () => {
  it("no modifica el dominio de agenda (sigue existiendo intacto)", () => {
    expect(existsSync(resolve("src/server/domain/agenda/appointments.ts"))).toBe(true);
  });

  it("AppointmentForm no reimplementa reglas de negocio (sin SQL propio)", () => {
    expect(formContent).not.toMatch(/exec\(\s*`(SELECT|INSERT|UPDATE|DELETE)/i);
  });
});
