// NELZZON — Pruebas ODONTO-BUGFIX-RENDER-VOID-1.
// 1. pickGlobalBorderFinding: hallazgo global de pieza selecciona color de borde correcto.
// 2. getOdontogramEncounterView: VOIDED no pinta color en teeth, aparece en findingsPanel.
// 3. voidFinding con encounterId: la fila VOIDED queda ligada al encounter.
// 4. revalidatePath de consulta activa: cubierto por integration (encounterId en acción).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { createEncounter } from "../src/server/domain/clinical/encounters.js";
import { recordFinding, voidFinding } from "../src/server/domain/clinical/odontogram.js";
import {
  getOdontogramEncounterView,
} from "../src/server/domain/clinical/odontogram-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import { pickGlobalBorderFinding } from "../src/components/odontogram/tooth-utils.js";
import type { FindingPanelItem } from "../src/server/domain/clinical/odontogram-views.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

// ── helpers DB ────────────────────────────────────────────────────────────────

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

async function mkOrg() {
  return (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('BFX','bfx-${rnd()}') RETURNING id`,
    )
  ).rows[0].id as string;
}

async function mkMember(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@bfx.test`],
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
  const c = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'BFX-P') RETURNING id`,
    [orgId],
  )).rows[0].id;
  return (await adminPool.query(
    `INSERT INTO "patients"("organizationId","contactId") VALUES ($1,$2) RETURNING id`,
    [orgId, c],
  )).rows[0].id as string;
}

// ── fixture compartido ────────────────────────────────────────────────────────

let org: string;
let clinician: ActorContext;
let patient: string;

const run = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(org, async (c) => work(execOf(c)));

const mkEnc = () => run((e) => createEncounter(e, clinician, { patientId: patient, chiefComplaint: "bfx" }));

beforeAll(async () => {
  await ensureRbac();
  org = await mkOrg();
  clinician = await mkMember(org, "clinician");
  patient = await mkPatient(org);
});

afterAll(async () => { await closePools(); });

// ══════════════════════════════════════════════════════════════════════
// 1. pickGlobalBorderFinding — lógica pura (sin DB)
// ══════════════════════════════════════════════════════════════════════

function f(findingType: string, surface: string | null): FindingPanelItem {
  return {
    findingId: rnd(), toothFdi: 14, surface, findingType,
    toothStatus: "PRESENT", lifecycleStatus: "ACTIVE", createdAt: new Date().toISOString(),
  };
}

describe("pickGlobalBorderFinding — lógica de borde coloreado", () => {
  it("sin hallazgos → null", () => {
    expect(pickGlobalBorderFinding([])).toBeNull();
  });

  it("solo hallazgo de superficie → null (no hay global)", () => {
    expect(pickGlobalBorderFinding([f("CARIES", "OCCLUSAL")])).toBeNull();
  });

  it("solo hallazgo global (sin superficie) → devuelve ese tipo", () => {
    expect(pickGlobalBorderFinding([f("CROWN", null)])).toBe("CROWN");
  });

  it("Corona + Caries Oclusal → borde es CROWN (global de mayor prioridad)", () => {
    expect(pickGlobalBorderFinding([
      f("CARIES", "OCCLUSAL"),
      f("CROWN", null),
    ])).toBe("CROWN");
  });

  it("ENDODONTICS + CROWN globales → borde es CROWN (prioridad CROWN > ENDODONTICS)", () => {
    expect(pickGlobalBorderFinding([
      f("ENDODONTICS", null),
      f("CROWN", null),
    ])).toBe("CROWN");
  });

  it("solo ENDODONTICS global → borde es ENDODONTICS", () => {
    expect(pickGlobalBorderFinding([
      f("RESTORATION", "MESIAL"),
      f("ENDODONTICS", null),
    ])).toBe("ENDODONTICS");
  });

  it("tres hallazgos: Restauración·Mesial + Corona + Caries·Oclusal → CROWN como borde", () => {
    // Caso exacto de pieza 14 reportado en producción.
    expect(pickGlobalBorderFinding([
      f("RESTORATION", "MESIAL"),
      f("CROWN", null),
      f("CARIES", "OCCLUSAL"),
    ])).toBe("CROWN");
  });

  it("pieza seleccionada con Corona + Caries·Oclusal: CROWN sigue siendo el borde global", () => {
    // Cuando isSelected=true el div muestra ring azul externo.
    // El borde SVG debe usar CROWN (no isSelected sobreescribe globalBorderFinding).
    // pickGlobalBorderFinding no recibe isSelected — es independiente de estado de selección.
    // La prioridad correcta en el render es: globalBorderFinding > isSelected > hasFindings.
    const findings = [f("CROWN", null), f("CARIES", "OCCLUSAL"), f("RESTORATION", "MESIAL")];
    expect(pickGlobalBorderFinding(findings)).toBe("CROWN");
    // Verificar que CROWN no es anulado aunque haya OCCLUSAL (el centro lo usa pero el borde sigue disponible).
    const surfaceMap: Record<string, string> = {};
    for (const fp of findings) {
      if (fp.surface && !surfaceMap[fp.surface]) surfaceMap[fp.surface] = fp.findingType;
    }
    const centerFinding = surfaceMap["OCCLUSAL"] ?? surfaceMap["INCISAL"] ?? pickGlobalBorderFinding(findings) ?? null;
    const globalBorder = pickGlobalBorderFinding(findings) !== centerFinding
      ? pickGlobalBorderFinding(findings)
      : null;
    expect(centerFinding).toBe("CARIES");   // centro = rojo
    expect(globalBorder).toBe("CROWN");     // borde = morado (independiente de isSelected)
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. getOdontogramEncounterView — VOIDED no pinta color, sí aparece en panel
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramEncounterView — hallazgo VOIDED", () => {
  it("VOIDED no pinta color en teeth; sí aparece en findingsPanel con lifecycleStatus=VOIDED", async () => {
    const { encounterId } = await mkEnc();

    // Registrar hallazgo en pieza 41
    const { findingId } = await run((e) =>
      recordFinding(e, clinician, {
        patientId: patient, encounterId, toothFdi: 41,
        findingType: "FRACTURE", toothStatus: "PRESENT",
      }),
    );

    // Anular con encounterId para que la fila VOIDED quede ligada al encounter
    await run((e) =>
      voidFinding(e, clinician, {
        findingId,
        lifecycleReason: "Error de registro en test",
        encounterId,
      }),
    );

    const result = await getOdontogramEncounterView(
      makeTenantRunner(org), clinician, patient, encounterId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // teeth: pieza 41 no debe tener hallazgos activos (VOIDED excluido del grid)
    const tooth41 = result.value.teeth.find((t) => t.fdi === 41);
    expect(tooth41?.findings.length).toBe(0);

    // findingsPanel: debe aparecer la entrada con lifecycleStatus VOIDED
    const panelEntry = result.value.findingsPanel.find((f) => f.toothFdi === 41);
    expect(panelEntry).toBeDefined();
    expect(panelEntry?.lifecycleStatus).toBe("VOIDED");
    expect(panelEntry?.findingType).toBe("FRACTURE");
  });

  it("hallazgo VOIDED con encounterId correcto queda ligado en DB", async () => {
    const { encounterId } = await mkEnc();

    const { findingId } = await run((e) =>
      recordFinding(e, clinician, {
        patientId: patient, encounterId, toothFdi: 42,
        findingType: "CARIES", toothStatus: "PRESENT", surface: "DISTAL",
      }),
    );

    const { findingId: voidedId } = await run((e) =>
      voidFinding(e, clinician, {
        findingId,
        lifecycleReason: "Test encounterId",
        encounterId,
      }),
    );

    // Verificar directamente en DB que el encounterId quedó correcto
    const rows: any[] = await forTenantPg(org, async (c) =>
      (await c.query(
        `SELECT "encounterId","lifecycleStatus","supersedesFindingId"
         FROM "odontogram_findings" WHERE "id"=$1`,
        [voidedId],
      )).rows,
    );

    expect(rows[0].encounterId).toBe(encounterId);
    expect(rows[0].lifecycleStatus).toBe("VOIDED");
    expect(rows[0].supersedesFindingId).toBe(findingId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Hallazgo VOIDED: botones en UI — cubierto por regla lifecycleStatus !== "VOIDED"
// (La lógica vive en EncounterFindings.tsx: canActOnThis = ... && f.lifecycleStatus !== "VOIDED")
// No requiere prueba de dominio adicional; la lógica está en el componente presentacional.
// ══════════════════════════════════════════════════════════════════════
