// NELZZON — Pruebas Fase 1K-E (evitar citas huérfanas / mostrar paciente en
// agenda). Estructurales por readFileSync, siguiendo el patrón de
// tests/phase-1k-c.test.ts:
// - src/server/domain/agenda/patient-context.ts: lectura tenant-safe (RLS +
//   patients.view) que resuelve { patientId, contactId, fullName } a partir
//   de patients.id, fail-closed (NOT_FOUND/FORBIDDEN), sin datos clínicos.
// - /agenda resuelve ese contexto cuando llega ?patientId= y lo pasa a
//   AgendaView -> AppointmentForm.
// - AppointmentForm: sin patientId -> mensaje "abre la ficha..."; con
//   patientId inválido/sin acceso -> "Paciente no encontrado o sin acceso.";
//   con paciente resuelto -> muestra "Paciente: <nombre>", envía
//   patientId+contactId reales, y tras éxito muestra link a la ficha.
// - Ningún camino permite llamar createAppointmentAction sin patientId real.
// No se toca DB, dominio de agenda (createAppointment), migraciones ni VPS.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTEXT_PATH = resolve("src/server/domain/agenda/patient-context.ts");
const PAGE_PATH = resolve("src/app/(app)/agenda/page.tsx");
const VIEW_PATH = resolve("src/components/agenda/AgendaView.tsx");
const FORM_PATH = resolve("src/components/agenda/AppointmentForm.tsx");
const APPOINTMENTS_DOMAIN_PATH = resolve("src/server/domain/agenda/appointments.ts");

const contextContent = readFileSync(CONTEXT_PATH, "utf-8");
const pageContent = readFileSync(PAGE_PATH, "utf-8");
const viewContent = readFileSync(VIEW_PATH, "utf-8");
const formContent = readFileSync(FORM_PATH, "utf-8");
const appointmentsDomainContent = readFileSync(APPOINTMENTS_DOMAIN_PATH, "utf-8");

describe("1K-E — integridad de archivos", () => {
  it("no existe migración 0021 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 21)).toBe(false);
  });

  it("src/server/domain/agenda/patient-context.ts existe", () => {
    expect(existsSync(CONTEXT_PATH)).toBe(true);
  });
});

describe("1K-E — patient-context.ts: lectura mínima, tenant-safe, fail-closed", () => {
  it("exporta getAgendaPatientContext(run, ctx, patientId)", () => {
    expect(contextContent).toContain("export async function getAgendaPatientContext(");
  });

  it("requiere patients.view antes de leer", () => {
    expect(contextContent).toContain('can(ctx.permissions, "patients.view")');
  });

  it("devuelve patientId, contactId y fullName, sin datos clínicos/financieros", () => {
    expect(contextContent).toMatch(/interface AgendaPatientContext[\s\S]*?patientId:\s*string/);
    expect(contextContent).toMatch(/interface AgendaPatientContext[\s\S]*?contactId:\s*string/);
    expect(contextContent).toMatch(/interface AgendaPatientContext[\s\S]*?fullName:\s*string \| null/);
    const forbidden = ["odontogram", "finding", "treatment", "quote", "payment", "balance", "diagnos"];
    for (const term of forbidden) {
      expect(contextContent.toLowerCase(), `patient-context.ts no debe mencionar ${term}`).not.toContain(term);
    }
  });

  it("falla cerrado: NOT_FOUND si no existe/archivado/sin acceso", () => {
    expect(contextContent).toContain('fail("NOT_FOUND"');
    expect(contextContent).toContain("ARCHIVED");
  });

  it("no escribe nada (sin INSERT/UPDATE/DELETE)", () => {
    expect(contextContent).not.toMatch(/exec\(\s*`(INSERT|UPDATE|DELETE)/i);
  });
});

describe("1K-E — /agenda/page.tsx: resuelve el paciente cuando viene patientId", () => {
  it("importa y llama a getAgendaPatientContext solo si hay patientId", () => {
    expect(pageContent).toContain('from "@/server/domain/agenda/patient-context"');
    expect(pageContent).toContain("getAgendaPatientContext(run, ctx, patientId)");
    expect(pageContent).toMatch(/patientId\s*\?\s*getAgendaPatientContext/);
  });

  it("pasa patient resuelto (o null) a AgendaView", () => {
    const idx = pageContent.indexOf("<AgendaView");
    expect(idx).toBeGreaterThan(-1);
    const block = pageContent.slice(idx, idx + 300);
    expect(block).toContain("patient={patient}");
  });
});

describe("1K-E — AgendaView: propaga patient a AppointmentForm", () => {
  it("declara patient: AgendaPatientContext | null en Props", () => {
    expect(viewContent).toContain('from "@/server/domain/agenda/patient-context"');
    const idx = viewContent.indexOf("interface Props");
    expect(idx).toBeGreaterThan(-1);
    const block = viewContent.slice(idx, idx + 300);
    expect(block).toContain("patient: AgendaPatientContext | null");
  });

  it("pasa patient a <AppointmentForm>", () => {
    expect(viewContent).toMatch(/<AppointmentForm[\s\S]*?patient=\{patient\}/);
  });
});

describe("1K-E — AppointmentForm: sin citas huérfanas", () => {
  it("sin patientId: muestra mensaje y no renderiza el formulario de guardado", () => {
    expect(formContent).toMatch(/if\s*\(!patientId\)\s*\{/);
    expect(formContent).toContain('primero abre la ficha de un paciente y usa');
  });

  it("con patientId pero sin patient resuelto: muestra 'Paciente no encontrado o sin acceso.'", () => {
    expect(formContent).toMatch(/if\s*\(!patient\)\s*\{/);
    expect(formContent).toContain("Paciente no encontrado o sin acceso.");
  });

  it("con paciente resuelto: muestra 'Paciente: <nombre>' sin IDs crudos", () => {
    expect(formContent).toContain("patient.fullName");
    expect(formContent).not.toMatch(/\{patient\.patientId\}(?!`)/);
    expect(formContent).not.toMatch(/\{patient\.contactId\}/);
  });

  it("createAppointmentAction solo se llama con patientId/contactId del paciente resuelto", () => {
    expect(formContent).toContain("patientId: resolvedPatient.patientId");
    expect(formContent).toContain("contactId: resolvedPatient.contactId");
    // El único bloque ejecutable que llama a la acción está después de los
    // early-returns que garantizan patient !== null.
    const earlyReturnIdx = formContent.indexOf("if (!patient)");
    const callIdx = formContent.indexOf("createAppointmentAction({");
    expect(earlyReturnIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(earlyReturnIdx);
  });

  it("tras éxito muestra link 'Volver a ficha del paciente →' hacia /pacientes/<patientId>", () => {
    expect(formContent).toContain("Volver a ficha del paciente");
    expect(formContent).toMatch(/href=\{`\/pacientes\/\$\{(resolvedPatient|patient)\.patientId\}`\}/);
  });
});

describe("1K-E — alcance: no toca createAppointment del dominio ni migraciones", () => {
  it("createAppointment del dominio sigue intacto (firma sin cambios)", () => {
    expect(appointmentsDomainContent).toContain("export async function createAppointment(exec: Exec, ctx: ActorContext, raw: unknown)");
  });

  it("patient-context.ts no reimplementa lógica de creación de citas", () => {
    expect(contextContent).not.toContain("INSERT INTO \"appointments\"");
    expect(contextContent).not.toContain("createAppointment");
  });
});
