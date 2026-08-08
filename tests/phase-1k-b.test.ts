// NELZZON — Pruebas Fase 1K-B (server action segura para crear citas).
// Las server actions no son ejecutables en Vitest (requieren runtime Next.js
// con sesión real). Las pruebas verifican estructura y contrato del archivo
// por readFileSync, siguiendo el patrón de tests/phase-fvo1d.test.ts:
// - "use server" en primera línea.
// - createAppointmentAction existe e importa createAppointment del dominio
//   (sin duplicar reglas de negocio).
// - Mapeo de errores conocidos (OverlapError, NotAvailableError, OrgRefError,
//   TransitionError, PermissionDeniedError, validación) a mensajes legibles.
// - revalidatePath("/agenda") siempre, y /pacientes/[patientId] si aplica.
// - No toca schema/migraciones/UI de agenda ni de ficha de paciente.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ACTIONS_PATH = resolve("src/server/actions/agenda.ts");
const actionsContent = readFileSync(ACTIONS_PATH, "utf-8");

describe("1K-B — integridad de archivos", () => {
  it("no existe migración 0023 ni superior (sin migraciones nuevas en esta fase)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 23)).toBe(false);
  });

  it("src/server/actions/agenda.ts existe", () => {
    expect(existsSync(ACTIONS_PATH)).toBe(true);
  });
});

describe("1K-B — server action createAppointmentAction", () => {
  it('comienza con "use server"', () => {
    expect(actionsContent.split("\n")[0].trim()).toBe('"use server";');
  });

  it("define y exporta createAppointmentAction", () => {
    expect(actionsContent).toContain("export async function createAppointmentAction(");
  });

  it("importa createAppointment del dominio de agenda, sin duplicar lógica de negocio", () => {
    expect(actionsContent).toMatch(/import\s*\{[^}]*createAppointment[^}]*\}\s*from\s*"@\/server\/domain\/agenda\/appointments"/);
    expect(actionsContent).toContain("createAppointment(exec, ctx, input)");
    // No reimplementa validación/disponibilidad/solapamiento: sin SQL propio.
    expect(actionsContent).not.toMatch(/exec\(\s*`(SELECT|INSERT|UPDATE|DELETE)/i);
  });

  it("obtiene ActorContext de sesión real y usa TenantRunner", () => {
    expect(actionsContent).toContain("requireOrganization");
    expect(actionsContent).toContain("getActorContext");
    expect(actionsContent).toContain("makeTenantRunner");
  });

  it("mapea errores conocidos del dominio a mensajes legibles", () => {
    expect(actionsContent).toMatch(/OverlapError[\s\S]*?"El horario se cruza con otra cita\."/);
    expect(actionsContent).toMatch(/NotAvailableError[\s\S]*?"El horario no está disponible\."/);
    expect(actionsContent).toMatch(/OrgRefError[\s\S]*?"La cita tiene referencias inválidas para esta organización\."/);
    expect(actionsContent).toContain("TransitionError");
    expect(actionsContent).toContain("PermissionDeniedError");
  });

  it('mapea errores de validación a "Revisa los datos de la cita." y desconocidos a "No se pudo crear la cita."', () => {
    expect(actionsContent).toContain('"Revisa los datos de la cita."');
    expect(actionsContent).toContain('"No se pudo crear la cita."');
  });

  it("no expone detalles internos: nunca devuelve e.message ni e.stack directamente", () => {
    expect(actionsContent).not.toMatch(/error:\s*e\.(message|stack)/);
    expect(actionsContent).not.toContain("e.stack");
    expect(actionsContent).not.toContain("console.log");
    expect(actionsContent).not.toContain("console.error");
  });

  it('revalida "/agenda" siempre que se crea una cita', () => {
    expect(actionsContent).toContain('revalidatePath("/agenda")');
  });

  it("revalida /pacientes/[patientId] cuando el input trae patientId", () => {
    expect(actionsContent).toMatch(/revalidatePath\(`\/pacientes\/\$\{patientId\}`\)/);
    expect(actionsContent).toContain("input as { patientId?: unknown }");
  });

  it("devuelve el shape { ok: true, data: { appointmentId } } o { ok: false, error }", () => {
    expect(actionsContent).toMatch(/ok:\s*true,\s*data:\s*\{\s*appointmentId\s*\}/);
    expect(actionsContent).toMatch(/ok:\s*false,\s*error:/);
  });
});

describe("1K-B — alcance: no toca dominio ni UI de agenda/paciente", () => {
  it("no modifica el dominio de agenda (no es archivo permitido)", () => {
    expect(existsSync(resolve("src/server/domain/agenda/appointments.ts"))).toBe(true);
    // Esta prueba solo documenta que el dominio sigue existiendo intacto;
    // la auditoría de cambios reales se hace vía git status/diff fuera de Vitest.
  });

  it("agenda.ts no importa ni referencia componentes de UI", () => {
    expect(actionsContent).not.toMatch(/from ["']@\/components\//);
    expect(actionsContent).not.toContain("PatientLiveRecordView");
    expect(actionsContent).not.toContain("AgendaView");
  });
});
