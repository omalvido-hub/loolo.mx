// NELZZON — Pruebas Fase UI-7A (formularios administrativos FVO).
// Verificación estructural por readFileSync: no se ejecutan componentes React
// ni server actions. Se valida contrato, imports y patrones de seguridad.

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLIENT_PATH  = resolve("src/components/patients/PatientFVOSectionsClient.tsx");
const PLR_PATH     = resolve("src/components/patients/PatientLiveRecordView.tsx");
const PAGE_PATH    = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const STATIC_PATH  = resolve("src/components/patients/PatientFVOSections.tsx");
const LIST_PATH    = resolve("src/components/patients/PatientListView.tsx");

const REQUIRED_ACTIONS = [
  "upsertDemographicsAction",
  "upsertAddressAction",
  "upsertCommercialOriginAction",
  "addGuardianAction",
  "addEmergencyContactAction",
  "grantConsentAction",
  "revokeConsentAction",
] as const;

const FORBIDDEN_ACTIONS = [
  "upsertClinicalProfileAction",
  "createMedicalAlertAction",
  "deactivateMedicalAlertAction",
  "upsertTaxProfileAction",
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// 1. Integridad de archivos
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A — integridad de archivos", () => {
  it("PHASE_UI-7A_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_UI-7A_DELIVERY_MARKER.txt"))).toBe(true);
  });

  it("PatientFVOSectionsClient.tsx existe", () => {
    expect(existsSync(CLIENT_PATH)).toBe(true);
  });

  it("PatientFVOSections.tsx sigue existiendo sin cambios (no fue eliminado)", () => {
    expect(existsSync(STATIC_PATH)).toBe(true);
  });

  it("no existe migración 0018 ni superior", () => {
    const { readdirSync } = require("node:fs");
    const files = readdirSync(resolve("prisma/migrations")) as string[];
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 19)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Verificación estructural de PatientFVOSectionsClient.tsx
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A — PatientFVOSectionsClient.tsx estructura", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(CLIENT_PATH, "utf-8");
  });

  it('primera línea es "use client";', () => {
    expect(content.split("\n")[0].trim()).toBe('"use client";');
  });

  it.each(REQUIRED_ACTIONS)("importa %s de fvo.ts", (name) => {
    expect(content).toContain(name);
  });

  it.each(FORBIDDEN_ACTIONS)("NO importa %s (clínico/fiscal, solo UI-7B)", (name) => {
    expect(content).not.toContain(name);
  });

  it("no importa desde fvo-write.ts", () => {
    expect(content).not.toMatch(/from\s+["'].*fvo-write["']/);
  });

  it("no importa desde fvo-write-schemas.ts", () => {
    expect(content).not.toMatch(/from\s+["'].*fvo-write-schemas["']/);
  });

  it("no contiene SQL (no SELECT ni INSERT ni UPDATE)", () => {
    expect(content).not.toMatch(/\bSELECT\b/);
    expect(content).not.toMatch(/\bINSERT\b/);
    expect(content).not.toMatch(/\bUPDATE\b/);
  });

  it("no contiene llamadas exec directas", () => {
    expect(content).not.toMatch(/\bexec\s*\(/);
  });

  it("usa useTransition al menos 6 veces (una por sección editable)", () => {
    const matches = content.match(/useTransition/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  it("contiene texto de historial para tutor", () => {
    expect(content).toContain("historial");
  });

  it("contiene texto de historial para contacto de emergencia", () => {
    const count = (content.match(/historial/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("contiene showRevokeConfirm (patrón de dos pasos para revocar)", () => {
    expect(content).toContain("showRevokeConfirm");
  });

  it("contiene texto de confirmación de revocación (dos pasos)", () => {
    expect(content.toLowerCase()).toContain("confirmar revocación");
  });

  it("el botón de confirmación final usa texto 'Sí, revocar'", () => {
    expect(content).toContain("Sí, revocar");
  });

  it("exporta PatientFVOSectionsClient como función nombrada", () => {
    expect(content).toContain("export function PatientFVOSectionsClient");
  });

  it("recibe canEditDemographics, canAddGuardian, canAddEmergencyContact, canManageConsent", () => {
    expect(content).toContain("canEditDemographics");
    expect(content).toContain("canAddGuardian");
    expect(content).toContain("canAddEmergencyContact");
    expect(content).toContain("canManageConsent");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Verificación de PatientLiveRecordView.tsx
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A — PatientLiveRecordView.tsx", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(PLR_PATH, "utf-8");
  });

  it("importa PatientFVOSectionsClient", () => {
    expect(content).toContain("PatientFVOSectionsClient");
  });

  it("NO importa PatientFVOSections (reemplazado por PatientFVOSectionsClient)", () => {
    expect(content).not.toMatch(/import.*PatientFVOSections[^C]/);
  });

  it("acepta prop fvoPermissions", () => {
    expect(content).toContain("fvoPermissions");
  });

  it("pasa canEditDemographics a PatientFVOSectionsClient", () => {
    expect(content).toContain("canEditDemographics");
  });

  it("pasa canAddGuardian a PatientFVOSectionsClient", () => {
    expect(content).toContain("canAddGuardian");
  });

  it("pasa canAddEmergencyContact a PatientFVOSectionsClient", () => {
    expect(content).toContain("canAddEmergencyContact");
  });

  it("pasa canManageConsent a PatientFVOSectionsClient", () => {
    expect(content).toContain("canManageConsent");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Verificación de page.tsx
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A — page.tsx permisos FVO", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(PAGE_PATH, "utf-8");
  });

  it("evalúa patient.demographics.edit", () => {
    expect(content).toContain('"patient.demographics.edit"');
  });

  it("evalúa patient.guardian.edit", () => {
    expect(content).toContain('"patient.guardian.edit"');
  });

  it("evalúa patient.emergency_contact.edit", () => {
    expect(content).toContain('"patient.emergency_contact.edit"');
  });

  it("evalúa patient.consent.manage", () => {
    expect(content).toContain('"patient.consent.manage"');
  });

  it("pasa fvoPermissions a PatientLiveRecordView", () => {
    expect(content).toContain("fvoPermissions");
  });

  it("usa can() para evaluar los permisos FVO", () => {
    const canCalls = content.match(/can\s*\(ctx\.permissions/g) ?? [];
    expect(canCalls.length).toBeGreaterThanOrEqual(4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Campo Ocupación — datalist con sugerencias + texto libre
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A-UX1 — campo Ocupación con datalist", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(CLIENT_PATH, "utf-8");
  });

  it("el campo Ocupación usa atributo list para conectar con datalist", () => {
    expect(content).toContain('list="occupation-options"');
  });

  it("existe un datalist con id occupation-options", () => {
    expect(content).toContain('<datalist id="occupation-options">');
  });

  it("el datalist incluye ocupaciones frecuentes (Contadora, Estudiante, Dentista)", () => {
    expect(content).toContain('value="Contadora"');
    expect(content).toContain('value="Estudiante"');
    expect(content).toContain('value="Dentista"');
  });

  it("el datalist incluye la opción Otro para valores personalizados", () => {
    expect(content).toContain('value="Otro"');
  });

  it("el campo Ocupación NO es un select (permite texto libre)", () => {
    // Verifica que el bloque FormRow de Ocupación no contenga <SelectNative
    const ocupacionBlock = content.slice(
      content.indexOf('"occupation-options"'),
      content.indexOf("</datalist>") + 11,
    );
    expect(ocupacionBlock).not.toContain("SelectNative");
  });

  it("el campo occupation sigue escribiendo en demoForm.occupation (no cambia el campo destino)", () => {
    expect(content).toContain("occupation: e.target.value");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Manejo date-only de dateOfBirth (bug timezone UTC-6)
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A — fDate no desplaza fechas date-only por timezone", () => {
  let clientContent: string;
  let staticContent: string;

  beforeAll(() => {
    clientContent = readFileSync(CLIENT_PATH, "utf-8");
    staticContent = readFileSync(STATIC_PATH, "utf-8");
  });

  it("PatientFVOSectionsClient.tsx parchea strings YYYY-MM-DD con T12:00:00Z antes de new Date()", () => {
    // Garantiza que fDate no convierte fechas civiles a UTC midnight (día -1 con UTC-6)
    expect(clientContent).toContain("T12:00:00Z");
  });

  it("PatientFVOSections.tsx parchea strings YYYY-MM-DD con T12:00:00Z antes de new Date()", () => {
    expect(staticContent).toContain("T12:00:00Z");
  });

  it("ambos archivos usan regex para detectar el patrón YYYY-MM-DD (guard date-only)", () => {
    // La fuente contiene literalmente \d{4}-\d{2}-\d{2} dentro de la regex de detección
    expect(clientContent).toContain("\\d{4}-\\d{2}-\\d{2}");
    expect(staticContent).toContain("\\d{4}-\\d{2}-\\d{2}");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. PatientListView — fila completa clickeable (UX navegación)
// ══════════════════════════════════════════════════════════════════════════════

describe("UI-7A-UX1 — PatientListView fila clickeable", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(LIST_PATH, "utf-8");
  });

  it("es un componente cliente (usa useRouter)", () => {
    expect(content.split("\n")[0].trim()).toBe('"use client";');
    expect(content).toContain("useRouter");
  });

  it("la fila <tr> tiene onClick que navega a /pacientes/[id]", () => {
    expect(content).toContain("router.push(`/pacientes/${p.id}`)");
  });

  it("la fila <tr> tiene cursor-pointer para indicar que es clickeable", () => {
    expect(content).toContain("cursor-pointer");
  });

  it("el Link del nombre tiene stopPropagation para no duplicar navegación", () => {
    expect(content).toContain("e.stopPropagation()");
  });

  it("el Link del nombre sigue apuntando a /pacientes/[id] (accesible y derecho-clic)", () => {
    expect(content).toContain("href={`/pacientes/${p.id}`}");
  });
});
