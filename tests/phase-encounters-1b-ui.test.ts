// NELZZON — Pruebas NELZZON-ENCOUNTERS-1B-UI (UI núcleo de consultas clínicas).
// Verificación estática por readFileSync (igual que UI-7B-A): los componentes
// cliente no se ejecutan en Vitest (requieren runtime Next.js + sesión).
// Cubre:
// - EncounterList: creación de consulta + guía "continuar" sin duplicar.
// - EncounterDetailView: iniciar/editar/nota/finalizar/cancelar, estados bloqueados.
// - Hilo de permisos: page.tsx (paciente y detalle) calculan y pasan flags canX.
// - No se tocó dominio, vistas de lectura, server actions ni migraciones.

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENCOUNTER_LIST_PATH = resolve("src/components/clinical/EncounterList.tsx");
const ENCOUNTER_DETAIL_PATH = resolve("src/components/clinical/EncounterDetailView.tsx");
const PATIENT_PAGE_PATH = resolve("src/app/(app)/pacientes/[id]/page.tsx");
const ENCOUNTER_PAGE_PATH = resolve("src/app/(app)/pacientes/[id]/consultas/[encounterId]/page.tsx");
const LIVE_RECORD_VIEW_PATH = resolve("src/components/patients/PatientLiveRecordView.tsx");
const ENCOUNTERS_DOMAIN_PATH = resolve("src/server/domain/clinical/encounters.ts");
const ENCOUNTER_VIEWS_PATH = resolve("src/server/domain/clinical/encounter-views.ts");
const ENCOUNTERS_ACTIONS_PATH = resolve("src/server/actions/encounters.ts");

// ══════════════════════════════════════════════════════════════════════════════
// 1. Integridad — archivos de la fase y límites de alcance
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1B-UI — integridad y límites de alcance", () => {
  it("no existe migración 0023 ni superior (snapshot: 0019 es la última legítima conocida; 0020 es de 1I-D-3 — cobertura/aseguradora)", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => parseInt(f.slice(0, 4)) >= 23)).toBe(false);
  });

  it("los archivos de la fase existen", () => {
    expect(existsSync(ENCOUNTER_LIST_PATH)).toBe(true);
    expect(existsSync(ENCOUNTER_DETAIL_PATH)).toBe(true);
  });

  it("encounters.ts (dominio) no contiene marcadores de esta fase de UI", () => {
    const content = readFileSync(ENCOUNTERS_DOMAIN_PATH, "utf-8");
    expect(content).not.toContain("ENCOUNTERS-1B-UI");
  });

  it("encounter-views.ts (lectura) no fue modificado en esta fase", () => {
    const content = readFileSync(ENCOUNTER_VIEWS_PATH, "utf-8");
    expect(content).not.toContain("ENCOUNTERS-1B-UI");
  });

  it("encounters.ts (server actions) no fue modificado en esta fase", () => {
    const content = readFileSync(ENCOUNTERS_ACTIONS_PATH, "utf-8");
    expect(content).not.toContain("ENCOUNTERS-1B-UI");
    expect(content).toContain("NELZZON-ENCOUNTERS-1A-ACTIONS");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. EncounterList — creación de consulta + guía "continuar" (anti-duplicado)
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1B-UI — EncounterList: nueva consulta sin duplicar", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(ENCOUNTER_LIST_PATH, "utf-8");
  });

  it("es un Client Component", () => {
    expect(content.split("\n")[0].trim()).toBe('"use client";');
  });

  it("importa createEncounterAction del wrapper de server actions", () => {
    expect(content).toContain("createEncounterAction");
    expect(content).toContain('from "@/server/actions/encounters"');
  });

  it("acepta prop canCreate opcional", () => {
    expect(content).toContain("canCreate?");
  });

  it("deriva la consulta activa de DRAFT/IN_PROGRESS (sin pedir otra cosa al servidor)", () => {
    expect(content).toContain('"DRAFT"');
    expect(content).toContain('"IN_PROGRESS"');
    expect(content).toMatch(/items\.find/);
  });

  it("muestra 'Consulta en curso → continuar' cuando ya existe una activa", () => {
    expect(content).toContain("Consulta en curso");
    expect(content).toContain("continuar");
  });

  it("muestra 'Nueva consulta' y exige motivo no vacío antes de crear", () => {
    expect(content).toContain("Nueva consulta");
    expect(content).toContain("Escribe el motivo de la consulta");
  });

  it("navega a la consulta recién creada (sin duplicar formularios)", () => {
    expect(content).toMatch(/router\.push\(`\/pacientes\/\$\{patientId\}\/consultas\/\$\{result\.data\.encounterId\}`\)/);
  });

  it("no contiene SQL ni llamadas exec directas", () => {
    expect(content).not.toMatch(/\bexec\s*\(/);
    expect(content).not.toMatch(/\bINSERT\b/);
    expect(content).not.toMatch(/\bSELECT\b/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. EncounterDetailView — ciclo de vida, edición, notas append-only
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1B-UI — EncounterDetailView: ciclo de vida interactivo", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(ENCOUNTER_DETAIL_PATH, "utf-8");
  });

  it("es un Client Component", () => {
    expect(content.split("\n")[0].trim()).toBe('"use client";');
  });

  it("importa las 5 acciones de escritura del wrapper de server actions", () => {
    expect(content).toContain('from "@/server/actions/encounters"');
    expect(content).toContain("startEncounterAction");
    expect(content).toContain("updateEncounterAction");
    expect(content).toContain("addClinicalNoteAction");
    expect(content).toContain("finalizeEncounterAction");
    expect(content).toContain("cancelEncounterAction");
  });

  it("acepta los 4 flags de permiso de escritura clínica", () => {
    expect(content).toContain("canEdit");
    expect(content).toContain("canAddNote");
    expect(content).toContain("canFinalize");
    expect(content).toContain("canCancel");
  });

  it("define EDITABLE_STATUSES como DRAFT/IN_PROGRESS (refleja la guarda del dominio)", () => {
    expect(content).toMatch(/EDITABLE_STATUSES\s*=\s*new Set\(\["DRAFT",\s*"IN_PROGRESS"\]\)/);
  });

  it("muestra botón 'Iniciar consulta' solo para DRAFT", () => {
    expect(content).toContain("Iniciar consulta");
    expect(content).toMatch(/view\.status === "DRAFT" && canEdit/);
  });

  it("pide confirmación inline antes de finalizar o cancelar (sin modal)", () => {
    expect(content).toContain("confirmAction");
    expect(content).toContain("Finalizar consulta");
    expect(content).toContain("Cancelar consulta");
    expect(content).toContain("Sí, finalizar");
    expect(content).toContain("Sí, cancelar");
    expect(content).not.toContain("Dialog");
    expect(content).not.toContain("Modal");
  });

  it("muestra aviso de bloqueo permanente para FINALIZED y CANCELED", () => {
    expect(content).toContain("finalizada");
    expect(content).toContain("cancelada");
    expect(content).toContain("bloqueados de forma permanente");
    expect(content).toContain("registro clínico inmutable");
  });

  it("permite editar contenido clínico solo si isEditableStatus && canEdit", () => {
    expect(content).toMatch(/isEditableStatus && canEdit/);
    expect(content).toContain("Editar contenido");
    expect(content).toContain("Guardar cambios");
  });

  it("agregar nota: append-only, con aviso explícito de inmutabilidad y límite de 5000", () => {
    expect(content).toContain("Agregar nota");
    expect(content).toContain("NOTE_MAX");
    expect(content).toContain("5000");
    expect(content).toContain("no se pueden editar ni eliminar");
    expect(content).toMatch(/isEditableStatus && canAddNote/);
  });

  it("usa router.refresh() tras cada acción exitosa (re-sincroniza con el servidor)", () => {
    const matches = content.match(/router\.refresh\(\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("no contiene SQL ni llamadas exec directas", () => {
    expect(content).not.toMatch(/\bexec\s*\(/);
    expect(content).not.toMatch(/\bINSERT\b/);
    expect(content).not.toMatch(/\bUPDATE\b/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Hilo de permisos — page.tsx calcula y pasa los flags correctos
// ══════════════════════════════════════════════════════════════════════════════

describe("ENCOUNTERS-1B-UI — hilo de permisos en las páginas", () => {
  it("pacientes/[id]/page.tsx calcula canCreateEncounter con clinical.create y lo pasa a PatientLiveRecordView", () => {
    const content = readFileSync(PATIENT_PAGE_PATH, "utf-8");
    expect(content).toMatch(/canCreateEncounter\s*=\s*can\(ctx\.permissions,\s*"clinical\.create"\)/);
    expect(content).toContain("canCreateEncounter={canCreateEncounter}");
  });

  it("PatientLiveRecordView reenvía canCreateEncounter a EncounterList como canCreate", () => {
    const content = readFileSync(LIVE_RECORD_VIEW_PATH, "utf-8");
    expect(content).toContain("canCreateEncounter?: boolean");
    expect(content).toContain("canCreate={canCreateEncounter}");
  });

  it("consultas/[encounterId]/page.tsx calcula los 4 permisos clínicos de escritura y los pasa a EncounterDetailView", () => {
    const content = readFileSync(ENCOUNTER_PAGE_PATH, "utf-8");
    expect(content).toMatch(/canEditEncounter\s*=\s*can\(ctx\.permissions,\s*"clinical\.edit"\)/);
    expect(content).toMatch(/canAddNote\s*=\s*can\(ctx\.permissions,\s*"clinical_notes\.add"\)/);
    expect(content).toMatch(/canFinalize\s*=\s*can\(ctx\.permissions,\s*"clinical\.finalize"\)/);
    expect(content).toMatch(/canCancel\s*=\s*can\(ctx\.permissions,\s*"clinical\.cancel"\)/);
    expect(content).toContain("canEdit={canEditEncounter}");
    expect(content).toContain("canAddNote={canAddNote}");
    expect(content).toContain("canFinalize={canFinalize}");
    expect(content).toContain("canCancel={canCancel}");
  });
});
