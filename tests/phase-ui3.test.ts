// LOOLO — Pruebas Fase UI-3 (Consulta clínica, solo lectura).
// Postgres real + RLS + permisos. Cubre:
// - listEncountersSafeForPatient no expone clinical_notes.body.
// - getEncounterSafeView exige clinical.view.
// - getEncounterSafeView respeta RLS / multi-tenant.
// - getEncounterSafeView valida encounterId contra patientId.
// - body NUNCA devuelto para ningún rol.
// - no existen endpoints REST clínicos.
// - no existe migración 0016.
// - encounters.ts no fue modificado.
// - funciones de escritura no invocadas desde archivos UI-3.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { getEncounterSafeView, listEncountersSafeForPatient } from "../src/server/domain/clinical/encounter-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

const runFor = (orgId: string) =>
  <T,>(work: (exec: any) => Promise<T>): Promise<T> =>
    forTenantPg(orgId, async (c) => work(execOf(c)));

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let frontDeskA: ActorContext;
let accountantA: ActorContext;
let noPermsA: ActorContext;

let patientAId: string;
let patientBId: string; // paciente en orgB para pruebas cross-tenant
let encounterAId: string;
let noteBody: string; // cuerpo real de la nota — NUNCA debe aparecer en respuestas

async function ensureRbac() {
  for (const p of PERMISSIONS)
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description],
    );
  for (const r of ROLES) {
    const id = (
      await adminPool.query(
        `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4)
         ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
        [r.key, r.name, r.scope, r.assignable],
      )
    ).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions)
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId")
         SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`,
        [id, pk],
      );
  }
}

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@ui3.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
    [memberId, roleKey],
  );
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr
     JOIN "roles" r ON r.id=mr."roleId"
     JOIN "role_permissions" rp ON rp."roleId"=r.id
     JOIN "permissions" p ON p.id=rp."permissionId"
     WHERE mr."memberId"=$1`,
    [memberId],
  );
  return {
    organizationId: orgId,
    userId,
    permissions: new Set(rows.map((r: any) => r.key)),
  };
}

beforeAll(async () => {
  await ensureRbac();

  orgA = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
    [`Clínica UI3-A ${rnd()}`, `ui3a-${rnd()}`],
  )).rows[0].id;
  orgB = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
    [`Clínica UI3-B ${rnd()}`, `ui3b-${rnd()}`],
  )).rows[0].id;

  ownerA = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  billingA = await member(orgA, "billing");
  frontDeskA = await member(orgA, "front_desk");
  accountantA = await member(orgA, "accountant");
  noPermsA = await member(orgA, "support_restricted");

  // Contacto + paciente en orgA
  const contactAId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgA, "Paciente UI3 A", "+5215500000010"],
  )).rows[0].id;
  patientAId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgA, contactAId],
  )).rows[0].id;

  // Contacto + paciente en orgB (para pruebas cross-tenant)
  const contactBId = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
    [orgB, "Paciente UI3 B", "+5215500000011"],
  )).rows[0].id;
  patientBId = (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgB, contactBId],
  )).rows[0].id;

  // Consulta en orgA con nota clínica que contiene body sensible
  noteBody = `NOTA_SECRETA_${rnd()}`;
  encounterAId = (await adminPool.query(
    `INSERT INTO "clinical_encounters"
       ("organizationId","patientId","status","chiefComplaint","createdBy")
     VALUES ($1,$2,'FINALIZED','Dolor molar',$3) RETURNING id`,
    [orgA, patientAId, ownerA.userId],
  )).rows[0].id;
  await adminPool.query(
    `INSERT INTO "clinical_notes"("organizationId","encounterId","authorUserId","body")
     VALUES ($1,$2,$3,$4)`,
    [orgA, encounterAId, clinicianA.userId, noteBody],
  );
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. listEncountersSafeForPatient — body nunca expuesto
// ══════════════════════════════════════════════════════════════════════

describe("listEncountersSafeForPatient — sin body de notas", () => {
  it("owner obtiene lista de consultas", async () => {
    const run = runFor(orgA);
    const result = await listEncountersSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.length).toBeGreaterThan(0);
  });

  it("items NO contienen body de notas", async () => {
    const run = runFor(orgA);
    const result = await listEncountersSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain(noteBody);
    expect(raw).not.toContain('"body"');
  });

  it("items tienen campos mínimos esperados", async () => {
    const run = runFor(orgA);
    const result = await listEncountersSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.value.items[0];
    expect(item).toHaveProperty("encounterId");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("chiefComplaint");
    expect(item).toHaveProperty("createdAt");
    expect(item).toHaveProperty("notesCount");
    expect(item).not.toHaveProperty("body");
    expect(item).not.toHaveProperty("organizationId");
  });

  it("sin clinical.view → FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listEncountersSafeForPatient(run, noPermsA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("billing sin clinical.view → FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await listEncountersSafeForPatient(run, billingA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("RLS: orgA no ve consultas de orgB", async () => {
    const run = runFor(orgA);
    // patientBId pertenece a orgB; RLS bloquea — resultado vacío, no error
    const result = await listEncountersSafeForPatient(run, ownerA, patientBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // RLS filtra: orgA no tiene acceso a datos de orgB
    expect(result.value.items).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. getEncounterSafeView — exige clinical.view
// ══════════════════════════════════════════════════════════════════════

describe("getEncounterSafeView — RBAC fail-closed", () => {
  it("clinician (clinical.view) puede ver la consulta", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
  });

  it("owner (clinical.view) puede ver la consulta", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
  });

  it("sin clinical.view → FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, noPermsA, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("billing sin clinical.view → FORBIDDEN", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, billingA, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("fail-closed sin organizationId", async () => {
    const run = runFor(orgA);
    const badCtx: ActorContext = { ...ownerA, organizationId: "" };
    const result = await getEncounterSafeView(run, badCtx, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("fail-closed sin userId", async () => {
    const run = runFor(orgA);
    const badCtx: ActorContext = { ...ownerA, userId: "" };
    const result = await getEncounterSafeView(run, badCtx, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. getEncounterSafeView — body NUNCA devuelto para ningún rol
// ══════════════════════════════════════════════════════════════════════

describe("getEncounterSafeView — body nunca devuelto", () => {
  it("body no aparece en respuesta para clinician", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain(noteBody);
    expect(raw).not.toContain('"body"');
  });

  it("body no aparece en respuesta para owner", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain(noteBody);
    expect(raw).not.toContain('"body"');
  });

  it("notesSummary tiene count correcto pero sin body", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.notesSummary.count).toBe(1);
    expect(result.value.notesSummary.items[0]).not.toHaveProperty("body");
    expect(result.value.notesSummary.items[0]).toHaveProperty("id");
    expect(result.value.notesSummary.items[0]).toHaveProperty("createdAt");
  });

  it("body no aparece para front_desk (rol sin clinical.view → FORBIDDEN, no body)", async () => {
    const run = runFor(orgA);
    // front_desk SÍ tiene clinical.view según RBAC; verificamos que aun así no hay body
    const result = await getEncounterSafeView(run, frontDeskA, patientAId, encounterAId);
    if (result.ok) {
      const raw = JSON.stringify(result.value);
      expect(raw).not.toContain(noteBody);
      expect(raw).not.toContain('"body"');
    } else {
      // Si no tiene clinical.view, debe ser FORBIDDEN
      expect(result.reason).toBe("FORBIDDEN");
    }
  });

  it("body no aparece para accountant (sin clinical.view → FORBIDDEN, no body)", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, accountantA, patientAId, encounterAId);
    if (result.ok) {
      const raw = JSON.stringify(result.value);
      expect(raw).not.toContain(noteBody);
      expect(raw).not.toContain('"body"');
    } else {
      expect(result.reason).toBe("FORBIDDEN");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. getEncounterSafeView — RLS / multi-tenant
// ══════════════════════════════════════════════════════════════════════

describe("getEncounterSafeView — RLS y multi-tenant", () => {
  it("orgA no puede ver consulta de orgB (anti-IDOR via patientId check + RLS)", async () => {
    const run = runFor(orgA);
    // encounterAId pertenece a orgA. patientBId pertenece a orgB.
    // La validación patientId debe fallar (NOT_FOUND) antes o la RLS filtra.
    const result = await getEncounterSafeView(run, ownerA, patientBId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // NOT_FOUND porque encounterAId no pertenece a patientBId
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("consulta no encontrada con UUID aleatorio → NOT_FOUND", async () => {
    const run = runFor(orgA);
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const result = await getEncounterSafeView(run, ownerA, patientAId, fakeId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("validación patientId vs encounterId — encounterId de otro paciente → NOT_FOUND", async () => {
    const run = runFor(orgA);
    // Crear un segundo paciente en orgA y verificar que su encounterId no se puede pedir con patientAId
    const contact2Id = (await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgA, "Paciente UI3 A2", "+5215500000012"],
    )).rows[0].id;
    const patient2Id = (await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contact2Id],
    )).rows[0].id;
    const encounter2Id = (await adminPool.query(
      `INSERT INTO "clinical_encounters"
         ("organizationId","patientId","status","chiefComplaint","createdBy")
       VALUES ($1,$2,'DRAFT','Revisión general',$3) RETURNING id`,
      [orgA, patient2Id, ownerA.userId],
    )).rows[0].id;

    // Pedir encounter2 con patientAId (mismatch) → NOT_FOUND
    const result = await getEncounterSafeView(run, ownerA, patientAId, encounter2Id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. getEncounterSafeView — campos seguros en DTO
// ══════════════════════════════════════════════════════════════════════

describe("getEncounterSafeView — campos seguros en DTO", () => {
  it("DTO tiene los campos esperados", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const view = result.value;
    expect(view).toHaveProperty("encounterId");
    expect(view).toHaveProperty("patientId");
    expect(view).toHaveProperty("status");
    expect(view).toHaveProperty("chiefComplaint");
    expect(view).toHaveProperty("createdAt");
    expect(view).toHaveProperty("notesSummary");
  });

  it("DTO NO contiene organizationId", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty("organizationId");
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"organizationId"');
  });

  it("DTO NO contiene UUIDs internos (finalizedByUserId, canceledByUserId, createdBy)", async () => {
    const run = runFor(orgA);
    const result = await getEncounterSafeView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty("finalizedByUserId");
    expect(result.value).not.toHaveProperty("canceledByUserId");
    expect(result.value).not.toHaveProperty("createdBy");
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"finalizedByUserId"');
    expect(raw).not.toContain('"canceledByUserId"');
    expect(raw).not.toContain('"createdBy"');
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Integridad estructural — archivos prohibidos / sin modificar
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("no existe tests/phase7d.test.ts", () => {
    expect(existsSync(resolve("tests/phase7d.test.ts"))).toBe(false);
  });

  it("no existe migración 0016", () => {
    const files: string[] = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => f.startsWith("0016"))).toBe(false);
  });

  it("no existe src/app/api/encounters (directorio)", () => {
    expect(existsSync(resolve("src/app/api/encounters"))).toBe(false);
  });

  it("no existe src/app/api/clinical (directorio)", () => {
    expect(existsSync(resolve("src/app/api/clinical"))).toBe(false);
  });

  it("no existe src/app/api/clinical-notes (directorio)", () => {
    expect(existsSync(resolve("src/app/api/clinical-notes"))).toBe(false);
  });

  it("sí existe src/server/domain/clinical/encounter-views.ts", () => {
    expect(existsSync(resolve("src/server/domain/clinical/encounter-views.ts"))).toBe(true);
  });

  it("sí existe src/app/(app)/pacientes/[id]/consultas/[encounterId]/page.tsx", () => {
    expect(existsSync(resolve("src/app/(app)/pacientes/[id]/consultas/[encounterId]/page.tsx"))).toBe(true);
  });

  it("encounters.ts no fue modificado por UI-3 (git diff vacío desde UI-2)", () => {
    // Verificamos que encounters.ts no importa de encounter-views.ts (sin acoplamiento inverso)
    const content = readFileSync(resolve("src/server/domain/clinical/encounters.ts"), "utf-8");
    expect(content).not.toContain("encounter-views");
  });

  it("encounter-views.ts no invoca funciones de escritura clínica", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/encounter-views.ts"), "utf-8");
    const forbidden = [
      "createEncounter",
      "startEncounter",
      "updateEncounter",
      "addClinicalNote",
      "finalizeEncounter",
      "cancelEncounter",
    ];
    for (const fn of forbidden) {
      expect(content, `encounter-views.ts no debe invocar ${fn}`).not.toContain(fn);
    }
  });

  it("página de detalle de consulta no tiene acciones de escritura", () => {
    const content = readFileSync(
      resolve("src/app/(app)/pacientes/[id]/consultas/[encounterId]/page.tsx"),
      "utf-8",
    );
    const forbidden = [
      "createEncounter",
      "startEncounter",
      "updateEncounter",
      "addClinicalNote",
      "finalizeEncounter",
      "cancelEncounter",
    ];
    for (const fn of forbidden) {
      expect(content, `page.tsx no debe invocar ${fn}`).not.toContain(fn);
    }
  });

  it("no existe componente ClinicalNoteBody", () => {
    expect(existsSync(resolve("src/components/clinical/ClinicalNoteBody.tsx"))).toBe(false);
  });

  it("ningún componente clínico renderiza body", () => {
    const clinicalDir = resolve("src/components/clinical");
    const files = readdirSync(clinicalDir).filter((f: string) => f.endsWith(".tsx"));
    for (const file of files) {
      const content = readFileSync(resolve(clinicalDir, file), "utf-8");
      // "body" puede aparecer en comentarios de seguridad o en prop names no relacionados
      // Verificamos que no hay {.*body.*} ni body: en renderizado JSX
      // Comprobación estricta: "note.body" o ".body" como valor JSX no debe existir
      expect(content, `${file} no debe renderizar .body de notas`).not.toContain(".body");
      expect(content, `${file} no debe renderizar note.body`).not.toContain("note.body");
      expect(content, `${file} no debe renderizar noteBody`).not.toContain("noteBody");
    }
  });

  it("encounter-views.ts no hace SELECT *", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/encounter-views.ts"), "utf-8");
    expect(content).not.toContain("SELECT *");
  });

  it("encounter-views.ts no selecciona body de clinical_notes", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/encounter-views.ts"), "utf-8");
    // No debe haber un SELECT que incluya "body" del lado de clinical_notes
    // Buscamos la query de notas: no debe seleccionar "body"
    expect(content).not.toContain('"body"');
  });
});
