// LOOLO — Pruebas fase UI-7A-UX2 (traducción de labels técnicos).
// Verificación estática por readFileSync: confirma que los estados/tipos
// técnicos ya no se muestran crudos en la UI de ficha del paciente.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLR_PATH    = resolve("src/components/patients/PatientLiveRecordView.tsx");
const CLIENT_PATH = resolve("src/components/patients/PatientFVOSectionsClient.tsx");

// ─────────────────────────────────────────────────────────────────────────────
// 1. PatientLiveRecordView.tsx — mapas de traducción presentes
// ─────────────────────────────────────────────────────────────────────────────

describe("UI-7A-UX2 — PatientLiveRecordView.tsx labels traducidos", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(PLR_PATH, "utf-8");
  });

  // Estado de consulta
  it("tiene ENCOUNTER_STATUS_LABELS con FINALIZED → Finalizada", () => {
    expect(content).toContain("ENCOUNTER_STATUS_LABELS");
    expect(content).toContain('FINALIZED: "Finalizada"');
  });

  it("usa ENCOUNTER_STATUS_LABELS para lastEncounterStatus (no lo muestra crudo)", () => {
    expect(content).toContain("ENCOUNTER_STATUS_LABELS[clinical.lastEncounterStatus]");
    expect(content).not.toMatch(/value=\{clinical\.lastEncounterStatus\}/);
  });

  // Estado de pieza dental
  it("tiene TOOTH_STATUS_LABELS con PRESENT → Presente", () => {
    expect(content).toContain("TOOTH_STATUS_LABELS");
    expect(content).toContain('PRESENT: "Presente"');
  });

  it("tiene TOOTH_STATUS_LABELS con EXTRACTED → Extraído", () => {
    expect(content).toContain('EXTRACTED: "Extraído"');
  });

  it("usa TOOTH_STATUS_LABELS en odontogramSummary (no muestra status crudo como label)", () => {
    expect(content).toContain("TOOTH_STATUS_LABELS[status]");
    expect(content).not.toMatch(/label=\{status\}/);
  });

  // Estado de ítems de tratamiento
  it("tiene TREATMENT_ITEM_STATUS_LABELS con PROPOSED → propuestos", () => {
    expect(content).toContain("TREATMENT_ITEM_STATUS_LABELS");
    expect(content).toContain('PROPOSED: "propuestos"');
  });

  it("usa TREATMENT_ITEM_STATUS_LABELS en itemsByStatus (no muestra status.toLowerCase() crudo)", () => {
    expect(content).toContain("TREATMENT_ITEM_STATUS_LABELS[status]");
    expect(content).not.toContain("`Ítems ${status.toLowerCase()}`");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PatientFVOSectionsClient.tsx — alertType traducido
// ─────────────────────────────────────────────────────────────────────────────

describe("UI-7A-UX2 — PatientFVOSectionsClient.tsx alertType traducido", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(CLIENT_PATH, "utf-8");
  });

  it("tiene ALERT_TYPE_LABELS con CONDITION → Condición", () => {
    expect(content).toContain("ALERT_TYPE_LABELS");
    expect(content).toContain('CONDITION: "Condición"');
  });

  it("tiene ALERT_TYPE_LABELS con MEDICATION → Medicamento", () => {
    expect(content).toContain('MEDICATION: "Medicamento"');
  });

  it("tiene ALERT_TYPE_LABELS con ALLERGY → Alergia", () => {
    expect(content).toContain('ALLERGY: "Alergia"');
  });

  it("usa ALERT_TYPE_LABELS para alert.alertType (no lo muestra crudo)", () => {
    expect(content).toContain("ALERT_TYPE_LABELS[alert.alertType]");
    expect(content).not.toMatch(/>\{alert\.alertType\}</);
  });
});
