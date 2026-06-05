// LOOLO — Pruebas de estabilidad demo (UI-7A-STABILIZE).
// Verificación estática por readFileSync: asegura que seed-demo-user.ts
// asigna el rol owner de forma idempotente sin UUIDs hardcodeados,
// y que PatientListView ya tiene navegación a /pacientes/[id].

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SEED_DEMO_PATH       = resolve("scripts/seed-demo-user.ts");
const PATIENT_LIST_PATH    = resolve("src/components/patients/PatientListView.tsx");

// ─────────────────────────────────────────────────────────────────────────────
// 1. seed-demo-user.ts — idempotencia sin UUIDs hardcodeados
// ─────────────────────────────────────────────────────────────────────────────

describe("stabilize-demo — seed-demo-user.ts idempotencia", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(SEED_DEMO_PATH, "utf-8");
  });

  it("el archivo existe", () => {
    expect(existsSync(SEED_DEMO_PATH)).toBe(true);
  });

  it("asigna membership_roles derivando roleId por key='owner' (SELECT/JOIN, no hardcodeado)", () => {
    expect(content).toContain("key='owner'");
    expect(content).toContain("membership_roles");
  });

  it("no contiene UUID hardcodeado (patrón 8-4-4-4-12 hex en strings)", () => {
    // Detecta cualquier literal UUID entre comillas simples o dobles o backtick
    const uuidLiteral = /[`'""][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[`'""]/i;
    expect(uuidLiteral.test(content)).toBe(false);
  });

  it("deriva memberId desde organization_memberships por INSERT RETURNING (no hardcodeado)", () => {
    expect(content).toContain("organization_memberships");
    expect(content).toContain("RETURNING");
  });

  it("usa DELETE + INSERT para membership_roles (idempotente ante reseed de tests)", () => {
    // Garantiza que el patrón es DELETE ... WHERE memberId + INSERT SELECT ... key='owner'
    // (resistente a fase2a que re-crea roles con UUIDs distintos vía CASCADE)
    expect(content).toContain('DELETE FROM membership_roles WHERE "memberId"=$1');
    expect(content).toContain('INSERT INTO membership_roles("memberId","roleId")');
  });

  it("ensureCatalog usa ON CONFLICT para roles (idempotente)", () => {
    expect(content).toContain("ON CONFLICT");
    expect(content).toContain("ROLES");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PatientListView.tsx — navegación a /pacientes/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("stabilize-demo — PatientListView.tsx navegación", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(PATIENT_LIST_PATH, "utf-8");
  });

  it("el archivo existe", () => {
    expect(existsSync(PATIENT_LIST_PATH)).toBe(true);
  });

  it("importa Link desde next/link", () => {
    expect(content).toContain('import Link from "next/link"');
  });

  it("el nombre del paciente enlaza a /pacientes/[id]", () => {
    expect(content).toContain("/pacientes/${p.id}");
  });

  it("usa el componente Link (no <a> directa) para la navegación", () => {
    // Link de next/link garantiza navegación SPA sin recarga completa
    expect(content).toContain("<Link");
    expect(content).not.toMatch(/<a\s+href=.*pacientes/);
  });
});
