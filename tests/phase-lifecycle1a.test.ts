// NELZZON — Pruebas Lifecycle-1A (ciclo de vida de hallazgos de odontograma). Postgres real.
// Cubre: voidFinding, treatFinding, resolveFinding.
// Reglas: append-only, RBAC, aislamiento de tenant, eventos sin lifecycleReason,
// FindingAlreadySupersededError, filtro VOIDED en master view.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { can } from "../src/server/domain/identity/permissions.js";
import { createEncounter } from "../src/server/domain/clinical/encounters.js";
import {
  recordFinding, voidFinding, treatFinding, resolveFinding,
  FindingNotFoundError, FindingAlreadySupersededError, OrgRefError,
} from "../src/server/domain/clinical/odontogram.js";
import { getOdontogramMasterView } from "../src/server/domain/clinical/odontogram-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let ownerCtxA: ActorContext;
let clinicianCtxA: ActorContext;
let frontCtxA: ActorContext;
let patA: string;

async function ensureRbac() {
  for (const p of PERMISSIONS)
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description],
    );
  for (const r of ROLES) {
    const id = (
      await adminPool.query(
        `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
        [r.key, r.name, r.scope, r.assignable],
      )
    ).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions)
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId") SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`,
        [id, pk],
      );
  }
}

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@lc1a.test`],
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
    `SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId"
     WHERE mr."memberId"=$1`,
    [memberId],
  );
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r) => r.key)) };
}

async function mkPatient(orgId: string) {
  const c = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'LC1A-P') RETURNING id`,
      [orgId],
    )
  ).rows[0].id;
  return (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId") VALUES ($1,$2) RETURNING id`,
      [orgId, c],
    )
  ).rows[0].id;
}

const runA = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(orgA, async (c) => work(execOf(c)));

const mkEncA = (patientId = patA) =>
  runA((e) => createEncounter(e, clinicianCtxA, { patientId, chiefComplaint: "rev-lc1a" }));

beforeAll(async () => {
  await ensureRbac();
  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('LC1A-A','lc1a-a-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('LC1A-B','lc1a-b-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  ownerCtxA = await member(orgA, "owner");
  clinicianCtxA = await member(orgA, "clinician");
  frontCtxA = await member(orgA, "front_desk");
  patA = await mkPatient(orgA);
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. voidFinding — validación y RBAC
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — voidFinding: validación", () => {
  it("lifecycleReason vacío → error de validación (motivo obligatorio)", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 11, findingType: "MISSING", toothStatus: "ABSENT",
      }),
    );
    await expect(
      runA((e) => voidFinding(e, ownerCtxA, { findingId, lifecycleReason: "" })),
    ).rejects.toThrow(/Validación 5B/);
  });

  it("findingId inexistente → FindingNotFoundError", async () => {
    await expect(
      runA((e) =>
        voidFinding(e, ownerCtxA, {
          findingId: "00000000-0000-0000-0000-000000000000",
          lifecycleReason: "Prueba de hallazgo inexistente",
        }),
      ),
    ).rejects.toBeInstanceOf(FindingNotFoundError);
  });

  it("front_desk NO puede anular (sin odontogram.void) → PermissionDeniedError", async () => {
    expect(can(frontCtxA.permissions, "odontogram.void")).toBe(false);
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 12, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );
    await expect(
      runA((e) => voidFinding(e, frontCtxA, { findingId, lifecycleReason: "Anulo" })),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("clinician SÍ puede anular (tiene odontogram.void)", async () => {
    expect(can(clinicianCtxA.permissions, "odontogram.void")).toBe(true);
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 13, findingType: "MISSING", toothStatus: "ABSENT",
      }),
    );
    const result = await runA((e) =>
      voidFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Error de registro" }),
    );
    expect(result.findingId).toBeTruthy();
    expect(result.findingId).not.toBe(findingId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Master view: hallazgos VOIDED no aparecen
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — voidFinding: filtro en master view", () => {
  it("hallazgo VOIDED no aparece en el odontograma vigente", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 14, findingType: "IMPLANT", toothStatus: "PRESENT",
      }),
    );

    // Anular el hallazgo
    await runA((e) =>
      voidFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Registrado en pieza incorrecta" }),
    );

    // Verificar que ya no aparece en el master view
    const run = makeTenantRunner(orgA);
    const view = await getOdontogramMasterView(run, clinicianCtxA, patA);
    if (!view.ok) throw new Error(view.reason);
    const tooth14 = view.value.findingsPanel.filter((f: any) => f.toothFdi === 14 && f.findingType === "IMPLANT");
    expect(tooth14.length).toBe(0);
  });

  it("hallazgo TREATED sí aparece en el odontograma vigente (con lifecycleStatus correcto)", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 15, surface: "OCCLUSAL",
        findingType: "CARIES", toothStatus: "PRESENT",
      }),
    );

    await runA((e) =>
      treatFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Obturación completada" }),
    );

    const run = makeTenantRunner(orgA);
    const view = await getOdontogramMasterView(run, clinicianCtxA, patA);
    if (!view.ok) throw new Error(view.reason);
    const panel = view.value.findingsPanel.filter((f: any) => f.toothFdi === 15 && f.surface === "OCCLUSAL");
    expect(panel.length).toBe(1);
    expect(panel[0].lifecycleStatus).toBe("TREATED");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. treatFinding
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — treatFinding", () => {
  it("sin lifecycleReason ni linkedTreatmentItemId → error de validación", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 16, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );
    await expect(
      runA((e) => treatFinding(e, clinicianCtxA, { findingId })),
    ).rejects.toThrow(/Validación 5B/);
  });

  it("marca TREATED con lifecycleReason", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 17, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );
    const result = await runA((e) =>
      treatFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Corona cementada" }),
    );
    expect(result.findingId).toBeTruthy();

    // Verificar que la fila nueva tiene lifecycleStatus=TREATED
    const row: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus","supersedesFindingId" FROM "odontogram_findings" WHERE "id"=$1`, [result.findingId]),
    );
    expect(row[0].lifecycleStatus).toBe("TREATED");
    expect(row[0].supersedesFindingId).toBe(findingId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. resolveFinding
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — resolveFinding", () => {
  it("crea fila RESOLVED que supersede la original", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 21, findingType: "MOBILITY", toothStatus: "PRESENT",
      }),
    );
    const result = await runA((e) =>
      resolveFinding(e, clinicianCtxA, { findingId, targetStatus: "RESOLVED" }),
    );
    expect(result.findingId).toBeTruthy();

    const row: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus","supersedesFindingId" FROM "odontogram_findings" WHERE "id"=$1`, [result.findingId]),
    );
    expect(row[0].lifecycleStatus).toBe("RESOLVED");
    expect(row[0].supersedesFindingId).toBe(findingId);
  });

  it("crea fila CONTROLLED", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 22, findingType: "MOBILITY", toothStatus: "PRESENT",
      }),
    );
    const result = await runA((e) =>
      resolveFinding(e, clinicianCtxA, { findingId, targetStatus: "CONTROLLED" }),
    );
    const row: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus" FROM "odontogram_findings" WHERE "id"=$1`, [result.findingId]),
    );
    expect(row[0].lifecycleStatus).toBe("CONTROLLED");
  });

  it("crea fila OBSERVATION", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 23, findingType: "FRACTURE", toothStatus: "PRESENT",
      }),
    );
    const result = await runA((e) =>
      resolveFinding(e, clinicianCtxA, { findingId, targetStatus: "OBSERVATION" }),
    );
    const row: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus" FROM "odontogram_findings" WHERE "id"=$1`, [result.findingId]),
    );
    expect(row[0].lifecycleStatus).toBe("OBSERVATION");
  });

  it("targetStatus inválido (VOIDED vía resolveFinding) → error de validación", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 24, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );
    await expect(
      runA((e) => resolveFinding(e, clinicianCtxA, { findingId, targetStatus: "VOIDED" as any })),
    ).rejects.toThrow(/Validación 5B/);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. FindingAlreadySupersededError
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — FindingAlreadySupersededError", () => {
  it("no se puede anular un hallazgo ya supersedido (no es el extremo vigente)", async () => {
    const { encounterId } = await mkEncA();
    const first = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 25, surface: "OCCLUSAL",
        findingType: "CARIES", toothStatus: "PRESENT",
      }),
    );
    // Anular first → crea second
    await runA((e) =>
      voidFinding(e, clinicianCtxA, { findingId: first.findingId, lifecycleReason: "Error test" }),
    );
    // Intentar anular first de nuevo → ya fue supersedido
    await expect(
      runA((e) =>
        voidFinding(e, clinicianCtxA, { findingId: first.findingId, lifecycleReason: "Re-anular" }),
      ),
    ).rejects.toBeInstanceOf(FindingAlreadySupersededError);
  });

  it("no se puede tratar un hallazgo ya supersedido", async () => {
    const { encounterId } = await mkEncA();
    const first = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 26, surface: "MESIAL",
        findingType: "CARIES", toothStatus: "PRESENT",
      }),
    );
    await runA((e) =>
      treatFinding(e, clinicianCtxA, { findingId: first.findingId, lifecycleReason: "Tratado" }),
    );
    await expect(
      runA((e) =>
        resolveFinding(e, clinicianCtxA, { findingId: first.findingId, targetStatus: "RESOLVED" }),
      ),
    ).rejects.toBeInstanceOf(FindingAlreadySupersededError);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Append-only sigue vigente para las filas de lifecycle
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — append-only preservado", () => {
  it("fila original preservada (no modificada)", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 27, findingType: "ENDODONTICS", toothStatus: "PRESENT",
      }),
    );

    const before: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus","supersedesFindingId" FROM "odontogram_findings" WHERE "id"=$1`, [findingId]),
    );
    expect(before[0].lifecycleStatus).toBe("ACTIVE");
    expect(before[0].supersedesFindingId).toBeNull();

    await runA((e) =>
      treatFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Endodoncia completada" }),
    );

    // La fila original NO debe haber cambiado (append-only)
    const after: any[] = await runA((e) =>
      e(`SELECT "lifecycleStatus","supersedesFindingId" FROM "odontogram_findings" WHERE "id"=$1`, [findingId]),
    );
    expect(after[0].lifecycleStatus).toBe("ACTIVE");
    expect(after[0].supersedesFindingId).toBeNull();
  });

  it("UPDATE/DELETE sobre fila de lifecycle rechazados por grants", async () => {
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 28, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );
    const { findingId: voidedId } = await runA((e) =>
      voidFinding(e, clinicianCtxA, { findingId, lifecycleReason: "Prueba append-only lifecycle" }),
    );
    await expect(
      runA((e) => e(`UPDATE "odontogram_findings" SET "lifecycleStatus"='ACTIVE' WHERE "id"=$1`, [voidedId])),
    ).rejects.toBeTruthy();
    await expect(
      runA((e) => e(`DELETE FROM "odontogram_findings" WHERE "id"=$1`, [voidedId])),
    ).rejects.toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. Eventos: NO contienen lifecycleReason
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — eventos sin lifecycleReason", () => {
  it("evento odontogram.finding_voided no contiene lifecycleReason", async () => {
    const motivo = `motivo-secreto-void-${rnd()}`;
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 31, findingType: "IMPLANT", toothStatus: "PRESENT",
      }),
    );
    await runA((e) => voidFinding(e, clinicianCtxA, { findingId, lifecycleReason: motivo }));

    const evs: any[] = await runA((e) =>
      e(`SELECT payload FROM "events" WHERE type='odontogram.finding_voided'`, []),
    );
    expect(evs.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(evs)).not.toContain(motivo);
    expect(JSON.stringify(evs)).not.toContain("lifecycleReason");
  });

  it("evento odontogram.finding_treated no contiene lifecycleReason", async () => {
    const motivo = `motivo-secreto-treat-${rnd()}`;
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 32, surface: "OCCLUSAL",
        findingType: "CARIES", toothStatus: "PRESENT",
      }),
    );
    await runA((e) => treatFinding(e, clinicianCtxA, { findingId, lifecycleReason: motivo }));

    const evs: any[] = await runA((e) =>
      e(`SELECT payload FROM "events" WHERE type='odontogram.finding_treated'`, []),
    );
    expect(evs.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(evs)).not.toContain(motivo);
  });

  it("evento odontogram.finding_resolved contiene targetStatus pero no lifecycleReason", async () => {
    const motivo = `motivo-secreto-resolve-${rnd()}`;
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 33, findingType: "MOBILITY", toothStatus: "PRESENT",
      }),
    );
    await runA((e) =>
      resolveFinding(e, clinicianCtxA, { findingId, targetStatus: "RESOLVED", lifecycleReason: motivo }),
    );

    const evs: any[] = await runA((e) =>
      e(`SELECT payload FROM "events" WHERE type='odontogram.finding_resolved'`, []),
    );
    expect(evs.length).toBeGreaterThanOrEqual(1);
    const raw = JSON.stringify(evs);
    expect(raw).not.toContain(motivo);
    expect(raw).toContain("RESOLVED");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. Aislamiento de tenant
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — aislamiento de tenant", () => {
  it("no se puede anular hallazgo de otra organización (fail-closed)", async () => {
    // Creamos un paciente en orgA y un hallazgo
    const { encounterId } = await mkEncA();
    const { findingId } = await runA((e) =>
      recordFinding(e, clinicianCtxA, {
        patientId: patA, encounterId, toothFdi: 41, findingType: "CROWN", toothStatus: "PRESENT",
      }),
    );

    // Intentar anularlo desde orgB → no debe encontrarlo (RLS oculta la fila)
    const ownerCtxB = await member(orgB, "owner");
    await expect(
      forTenantPg(orgB, async (c) =>
        voidFinding(execOf(c), ownerCtxB, {
          findingId,
          lifecycleReason: "Intento cross-tenant",
        }),
      ),
    ).rejects.toBeInstanceOf(FindingNotFoundError);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. RBAC: odontogram.void en catálogo y roles
// ══════════════════════════════════════════════════════════════════════

describe("Lifecycle-1A — RBAC: odontogram.void", () => {
  it("odontogram.void está en el catálogo de PERMISSIONS", () => {
    const p = PERMISSIONS.find((p) => p.key === "odontogram.void");
    expect(p).toBeTruthy();
  });

  it("owner tiene odontogram.void", () => {
    expect(can(ownerCtxA.permissions, "odontogram.void")).toBe(true);
  });

  it("clinician tiene odontogram.void", () => {
    expect(can(clinicianCtxA.permissions, "odontogram.void")).toBe(true);
  });

  it("front_desk NO tiene odontogram.void", () => {
    expect(can(frontCtxA.permissions, "odontogram.void")).toBe(false);
  });
});
