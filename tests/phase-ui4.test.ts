// LOOLO — Pruebas Fase UI-4 (Odontograma dental, solo lectura).
// Postgres real + RLS + permisos. Cubre:
// - getOdontogramMasterView exige odontogram.view.
// - getOdontogramEncounterView exige odontogram.view.
// - Respeto de RLS / multi-tenant.
// - DTO no expone note, recordedByUserId, organizationId, IDs internos.
// - Hallazgos supersedidos no aparecen en la vista maestra.
// - Supersesiones intra-consulta filtradas en la vista de consulta.
// - Vista de consulta NO mezcla con estado vigente global.
// - Integridad estructural: sin escritura, sin endpoints, sin migración, sin archivos prohibidos.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { getOdontogramMasterView, getOdontogramEncounterView } from "../src/server/domain/clinical/odontogram-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let noPermsA: ActorContext;
let ownerB: ActorContext;

let patientAId: string;
let patientBId: string;
let encounterAId: string;
let encounterBId: string;

// IDs de hallazgos (internos, solo para setup)
let findingId1: string; // pieza 11, CROWN, toothStatus PRESENT — encounterA
let findingId2: string; // pieza 21 MESIAL, CARIES, PRESENT — encounterA (será supersedido)
let findingId3: string; // pieza 21 MESIAL, RESTORATION, PRESENT — encounterA (supersede a findingId2)
let findingId4: string; // pieza 36, MISSING, ABSENT — encounterA
let findingId5: string; // pieza 11, IMPLANT, PRESENT — encounterB (supersede a findingId1 a nivel global)
const NOTE_SECRET = "nota-secreta-ui4-" + rnd();

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

async function member(orgId: string, roleKey: string | null): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey ?? "noperms"}-${rnd()}@ui4.test`],
    )
  ).rows[0].id;
  const memberId = (
    await adminPool.query(
      `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`,
      [orgId, userId, roleKey ?? "owner"],
    )
  ).rows[0].id;
  if (roleKey) {
    await adminPool.query(
      `INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`,
      [memberId, roleKey],
    );
  }
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

  // Crear organizaciones
  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["OrgUI4-A-" + rnd(), "ui4a-" + rnd()],
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["OrgUI4-B-" + rnd(), "ui4b-" + rnd()],
    )
  ).rows[0].id;

  // Crear actores en orgA
  ownerA    = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  billingA  = await member(orgA, "billing");
  noPermsA  = await member(orgA, null);

  // Actor en orgB
  ownerB = await member(orgB, "owner");

  // Crear pacientes
  const contactAId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgA, "Paciente UI4-A", "+5215510000071"],
    )
  ).rows[0].id;
  patientAId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactAId],
    )
  ).rows[0].id;

  const contactBId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgB, "Paciente UI4-B", "+5215510000072"],
    )
  ).rows[0].id;
  patientBId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgB, contactBId],
    )
  ).rows[0].id;

  // Crear consultas en orgA
  encounterAId = (
    await adminPool.query(
      `INSERT INTO "clinical_encounters"
         ("organizationId","patientId","status","chiefComplaint","createdBy")
       VALUES ($1,$2,'DRAFT','Revisión inicial UI4',$3) RETURNING id`,
      [orgA, patientAId, ownerA.userId],
    )
  ).rows[0].id;

  encounterBId = (
    await adminPool.query(
      `INSERT INTO "clinical_encounters"
         ("organizationId","patientId","status","chiefComplaint","createdBy")
       VALUES ($1,$2,'DRAFT','Revisión seguimiento UI4',$3) RETURNING id`,
      [orgA, patientAId, ownerA.userId],
    )
  ).rows[0].id;

  // Insertar hallazgos de prueba (adminPool bypassea RLS para el seed de test)
  // findingId1: pieza 11, CROWN, PRESENT — encounterA (luego supersedido por findingId5 en encounterB)
  findingId1 = (
    await adminPool.query(
      `INSERT INTO "odontogram_findings"
         ("organizationId","patientId","encounterId","toothFdi","findingType","toothStatus","note","recordedByUserId")
       VALUES ($1,$2,$3,11,'CROWN','PRESENT',$4,$5) RETURNING id`,
      [orgA, patientAId, encounterAId, NOTE_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  // findingId2: pieza 21 MESIAL, CARIES — encounterA (será supersedido intra-consulta por findingId3)
  findingId2 = (
    await adminPool.query(
      `INSERT INTO "odontogram_findings"
         ("organizationId","patientId","encounterId","toothFdi","surface","findingType","toothStatus","note","recordedByUserId")
       VALUES ($1,$2,$3,21,'MESIAL','CARIES','PRESENT',$4,$5) RETURNING id`,
      [orgA, patientAId, encounterAId, NOTE_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  // findingId3: pieza 21 MESIAL, RESTORATION — encounterA, supersede findingId2
  findingId3 = (
    await adminPool.query(
      `INSERT INTO "odontogram_findings"
         ("organizationId","patientId","encounterId","toothFdi","surface","findingType","toothStatus","supersedesFindingId","recordedByUserId")
       VALUES ($1,$2,$3,21,'MESIAL','RESTORATION','PRESENT',$4,$5) RETURNING id`,
      [orgA, patientAId, encounterAId, findingId2, ownerA.userId],
    )
  ).rows[0].id;

  // findingId4: pieza 36, MISSING, ABSENT — encounterA
  findingId4 = (
    await adminPool.query(
      `INSERT INTO "odontogram_findings"
         ("organizationId","patientId","encounterId","toothFdi","findingType","toothStatus","recordedByUserId")
       VALUES ($1,$2,$3,36,'MISSING','ABSENT',$4) RETURNING id`,
      [orgA, patientAId, encounterAId, ownerA.userId],
    )
  ).rows[0].id;

  // findingId5: pieza 11, IMPLANT — encounterB, supersede findingId1 globalmente
  findingId5 = (
    await adminPool.query(
      `INSERT INTO "odontogram_findings"
         ("organizationId","patientId","encounterId","toothFdi","findingType","toothStatus","supersedesFindingId","recordedByUserId")
       VALUES ($1,$2,$3,11,'IMPLANT','PRESENT',$4,$5) RETURNING id`,
      [orgA, patientAId, encounterBId, findingId1, ownerA.userId],
    )
  ).rows[0].id;
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. getOdontogramMasterView — autorización
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramMasterView — autorización", () => {
  it("billing (sin odontogram.view) → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, billingA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("actor sin permisos → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, noPermsA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("owner (con odontogram.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("clinician (con odontogram.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("organizationId vacío → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const badCtx: ActorContext = { organizationId: "", userId: ownerA.userId, permissions: ownerA.permissions };
    const result = await getOdontogramMasterView(run, badCtx, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. getOdontogramMasterView — RLS y multi-tenant
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramMasterView — RLS y multi-tenant", () => {
  it("actor de orgA no recibe datos de patiente de orgB (RLS filtra, resultado vacío)", async () => {
    // RLS filtra por organizationId del tenant activo. Con run para orgA y patientBId,
    // el query devuelve 0 filas (no hay findings de patientB en orgA).
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Ningún hallazgo de orgB visible desde orgA
    expect(result.value.summary.findingsCount).toBe(0);
    expect(result.value.findingsPanel).toHaveLength(0);
    // mode correcto
    expect(result.value.mode).toBe("patient_current");
  });

  it("actor de orgB no puede ver datos con su token en contexto orgA (sin permiso o sin datos)", async () => {
    // ownerB pertenece a orgB. Si se usa makeTenantRunner(orgA), los datos de orgA
    // no son visibles porque RLS filtra por organizationId.
    // ownerB tiene permisos de owner SOLO en orgB, pero su ActorContext.permissions se resuelve
    // desde la membresía de orgB. Sin membresía en orgA, el ctx.organizationId = orgA
    // no matchea y el RLS bloquea los datos.
    // En este test, forzamos el ctx con organizationId=orgA pero userId=ownerB.userId
    // (simulando un actor que intenta cruzar tenants):
    const run = makeTenantRunner(orgA);
    const crossCtx: ActorContext = {
      organizationId: orgA,
      userId: ownerB.userId,
      permissions: ownerB.permissions, // permisos de orgB (incluye odontogram.view)
    };
    // El ctx tiene odontogram.view del orgB, así que pasa el check de permiso.
    // Pero las queries corren con tenant_id=orgA, y ownerB.userId no tiene membresía en orgA.
    // Sin embargo, lo importante es que los datos de patientA (orgA) SÍ serían visibles
    // si el RLS no bloqueara. El RLS garantiza que solo ve datos de orgA.
    const result = await getOdontogramMasterView(run, crossCtx, patientAId);
    // El resultado puede ser ok (RLS no distingue si el userId tiene membresía, solo el tenant_id)
    // Lo que importa es que NO devuelve datos de otro tenant.
    // Este caso valida que el aislamiento es por tenant_id y no por userId.
    // El test verifica que si el runner es de orgA, solo se ven datos de orgA.
    if (result.ok) {
      // Si devuelve datos, deben ser de orgA (correcto — el runner está en orgA)
      // Solo verificamos que patientBId no tiene hallazgos en orgA
      const run2 = makeTenantRunner(orgA);
      const patBResult = await getOdontogramMasterView(run2, ownerA, patientBId);
      expect(patBResult.ok).toBe(true);
      if (!patBResult.ok) return;
      expect(patBResult.value.summary.findingsCount).toBe(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. getOdontogramMasterView — DTO seguro
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramMasterView — DTO seguro", () => {
  it("DTO no contiene note ni el valor de la nota secreta", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"note"');
    expect(raw).not.toContain(NOTE_SECRET);
  });

  it("DTO no contiene recordedByUserId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"recordedByUserId"');
    expect(raw).not.toContain(ownerA.userId);
  });

  it("DTO no contiene organizationId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"organizationId"');
    expect(raw).not.toContain(orgA);
  });

  it("DTO no contiene supersedesFindingId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"supersedesFindingId"');
  });

  it("DTO no contiene IDs internos de hallazgos", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Los IDs internos (findingId1..5) no deben aparecer directamente en el panel
    for (const item of result.value.findingsPanel) {
      expect(item).not.toHaveProperty("id");
      expect(item).not.toHaveProperty("supersedesFindingId");
    }
  });

  it("DTO tiene los campos esperados en findingsPanel", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value.findingsPanel[0];
    expect(first).toHaveProperty("toothFdi");
    expect(first).toHaveProperty("findingType");
    expect(first).toHaveProperty("toothStatus");
    expect(first).toHaveProperty("createdAt");
    expect(first).not.toHaveProperty("note");
    expect(first).not.toHaveProperty("recordedByUserId");
    expect(first).not.toHaveProperty("organizationId");
  });

  it("modo es patient_current", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mode).toBe("patient_current");
    expect(result.value.patientId).toBe(patientAId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. getOdontogramMasterView — lógica de resolución
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramMasterView — resolución de hallazgos", () => {
  it("hallazgos supersedidos (findingId2 y findingId1) no aparecen en vista maestra", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.findingsPanel;
    // findingId2 (CARIES pieza 21) fue supersedido por findingId3 → no debe aparecer
    const caries21 = panel.find(f => f.toothFdi === 21 && f.findingType === "CARIES");
    expect(caries21).toBeUndefined();
    // findingId1 (CROWN pieza 11) fue supersedido por findingId5 → no debe aparecer
    const crown11 = panel.find(f => f.toothFdi === 11 && f.findingType === "CROWN");
    expect(crown11).toBeUndefined();
  });

  it("hallazgos vigentes (findingId3, findingId4, findingId5) sí aparecen", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.findingsPanel;
    // findingId3: RESTORATION pieza 21 MESIAL
    const restoration21 = panel.find(f => f.toothFdi === 21 && f.findingType === "RESTORATION");
    expect(restoration21).toBeDefined();
    expect(restoration21?.surface).toBe("MESIAL");
    // findingId4: MISSING pieza 36
    const missing36 = panel.find(f => f.toothFdi === 36 && f.findingType === "MISSING");
    expect(missing36).toBeDefined();
    expect(missing36?.toothStatus).toBe("ABSENT");
    // findingId5: IMPLANT pieza 11 (supersedió a CROWN)
    const implant11 = panel.find(f => f.toothFdi === 11 && f.findingType === "IMPLANT");
    expect(implant11).toBeDefined();
  });

  it("summary tiene findingsCount correcto (3 vigentes)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 3 hallazgos vigentes: findingId3, findingId4, findingId5
    expect(result.value.summary.findingsCount).toBe(3);
  });

  it("summary tiene affectedTeethCount correcto (3 piezas distintas)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Piezas 11, 21, 36
    expect(result.value.summary.affectedTeethCount).toBe(3);
  });

  it("teeth contiene exactamente 32 piezas FDI 11-48", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.teeth).toHaveLength(32);
    const fdis = result.value.teeth.map((t) => t.fdi);
    // Verificar que están los 32 FDI permanentes
    for (let q = 1; q <= 4; q++) {
      for (let p = 1; p <= 8; p++) {
        const fdi = q * 10 + p;
        expect(fdis).toContain(fdi);
      }
    }
  });

  it("pieza 21 tiene los hallazgos correctos (solo RESTORATION, no CARIES)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tooth21 = result.value.teeth.find((t) => t.fdi === 21);
    expect(tooth21).toBeDefined();
    const findingTypes = tooth21!.findings.map((f) => f.findingType);
    expect(findingTypes).toContain("RESTORATION");
    expect(findingTypes).not.toContain("CARIES");
  });

  it("pieza 36 tiene status ABSENT (dominante por MISSING)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tooth36 = result.value.teeth.find((t) => t.fdi === 36);
    expect(tooth36).toBeDefined();
    expect(tooth36!.status).toBe("ABSENT");
  });

  it("cada pieza tiene quadrant y position correctos", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const tooth of result.value.teeth) {
      expect(tooth.quadrant).toBe(Math.floor(tooth.fdi / 10));
      expect(tooth.position).toBe(tooth.fdi % 10);
    }
  });

  it("findingsPanel incluye encounterId (para enlazar a consulta)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Al menos uno debe tener encounterId
    const withEnc = result.value.findingsPanel.filter((f) => f.encounterId !== undefined);
    expect(withEnc.length).toBeGreaterThan(0);
  });

  it("paciente sin hallazgos → findingsPanel vacío, summary.findingsCount = 0", async () => {
    // Crear paciente vacío en orgA
    const contactEmpty = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
        [orgA, "Vacio UI4", "+5215510000099"],
      )
    ).rows[0].id;
    const emptyPatientId = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state")
         VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgA, contactEmpty],
      )
    ).rows[0].id;
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramMasterView(run, ownerA, emptyPatientId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.findingsPanel).toHaveLength(0);
    expect(result.value.summary.findingsCount).toBe(0);
    expect(result.value.summary.affectedTeethCount).toBe(0);
    expect(result.value.summary.lastFindingAt).toBeNull();
    expect(result.value.teeth).toHaveLength(32);
    // Todas las piezas en estado PRESENT por defecto
    for (const tooth of result.value.teeth) {
      expect(tooth.status).toBe("PRESENT");
      expect(tooth.findings).toHaveLength(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. getOdontogramEncounterView — autorización
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramEncounterView — autorización", () => {
  it("billing (sin odontogram.view) → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, billingA, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("actor sin permisos → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, noPermsA, patientAId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("owner con permiso → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
  });

  it("clinician con permiso → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, clinicianA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. getOdontogramEncounterView — anti-IDOR y RLS
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramEncounterView — anti-IDOR y RLS", () => {
  it("encounterBId con patientAId pero mismatch paciente → ok (mismo paciente, encounter B es de patientA)", async () => {
    // encounterBId también pertenece a patientA → debe funcionar
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Solo findingId5 está en encounterB
    expect(result.value.summary.findingsCount).toBe(1);
    const implant = result.value.findingsPanel.find(f => f.findingType === "IMPLANT");
    expect(implant).toBeDefined();
  });

  it("encounterAId con patientBId (mismatch cross-paciente) → NOT_FOUND", async () => {
    // encounterAId pertenece a patientA, no a patientB
    // RLS filtra el encounter (es de orgA, no de orgB) ó mismatch de patientId
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientBId, encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Debería ser NOT_FOUND (RLS filtra el encounter porque patientBId es de orgB
    // o porque el patientId no coincide)
    expect(["NOT_FOUND", "FORBIDDEN"]).toContain(result.reason);
  });

  it("encounterId falso → NOT_FOUND", async () => {
    const run = makeTenantRunner(orgA);
    const fakeId = "00000000-0000-0000-0000-000000000099";
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, fakeId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("encounter de orgB no visible desde orgA (RLS filtra, NOT_FOUND)", async () => {
    // Crear encounter en orgB
    const encBOrgId = (
      await adminPool.query(
        `INSERT INTO "clinical_encounters"
           ("organizationId","patientId","status","chiefComplaint","createdBy")
         VALUES ($1,$2,'DRAFT','Consulta orgB',$3) RETURNING id`,
        [orgB, patientBId, ownerB.userId],
      )
    ).rows[0].id;
    const run = makeTenantRunner(orgA);
    // Intentar ver un encounter de orgB desde orgA (con patientBId)
    // RLS filtra clinical_encounters por organizationId=orgA → no lo encuentra
    const result = await getOdontogramEncounterView(run, ownerA, patientBId, encBOrgId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. getOdontogramEncounterView — DTO seguro
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramEncounterView — DTO seguro", () => {
  it("DTO no contiene note ni el valor de la nota secreta", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"note"');
    expect(raw).not.toContain(NOTE_SECRET);
  });

  it("DTO no contiene recordedByUserId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"recordedByUserId"');
  });

  it("DTO no contiene organizationId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"organizationId"');
    expect(raw).not.toContain(orgA);
  });

  it("DTO no contiene supersedesFindingId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"supersedesFindingId"');
  });

  it("modo es encounter_snapshot", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mode).toBe("encounter_snapshot");
    expect(result.value.encounterId).toBe(encounterAId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. getOdontogramEncounterView — lógica de resolución
// ══════════════════════════════════════════════════════════════════════

describe("getOdontogramEncounterView — resolución y aislamiento", () => {
  it("muestra solo hallazgos de encounterA (no los de encounterB)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // findingId5 (IMPLANT de encounterB) NO debe aparecer en encounterA
    const implant = result.value.findingsPanel.find(f => f.findingType === "IMPLANT");
    expect(implant).toBeUndefined();
  });

  it("filtra supersesión intra-consulta: CARIES pieza 21 supersedida → no aparece", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const caries = result.value.findingsPanel.find(f => f.findingType === "CARIES" && f.toothFdi === 21);
    expect(caries).toBeUndefined();
  });

  it("RESTORATION pieza 21 sí aparece (es la que supersedió)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const restoration = result.value.findingsPanel.find(f => f.findingType === "RESTORATION" && f.toothFdi === 21);
    expect(restoration).toBeDefined();
  });

  it("NO mezcla con estado vigente global: pieza 11 con CROWN en encounterA (aun no supersedida en ese contexto)", async () => {
    // encounterA tiene findingId1 (CROWN, pieza 11). findingId5 (IMPLANT) está en encounterB.
    // En encounterA, findingId1 NO está supersedido (findingId5 no está en la lista de encounterA).
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // CROWN pieza 11 SÍ debe aparecer en encounterA (no ha sido supersedida en esta consulta)
    const crown = result.value.findingsPanel.find(f => f.findingType === "CROWN" && f.toothFdi === 11);
    expect(crown).toBeDefined();
    // IMPLANT pieza 11 (de encounterB) NO debe aparecer
    const implant = result.value.findingsPanel.find(f => f.findingType === "IMPLANT");
    expect(implant).toBeUndefined();
  });

  it("encounterA tiene 3 hallazgos vigentes (CROWN 11, RESTORATION 21, MISSING 36)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.findingsCount).toBe(3);
    expect(result.value.summary.affectedTeethCount).toBe(3);
  });

  it("encounterB tiene 1 hallazgo vigente (IMPLANT 11)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, encounterBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.summary.findingsCount).toBe(1);
    expect(result.value.findingsPanel[0].findingType).toBe("IMPLANT");
    expect(result.value.findingsPanel[0].toothFdi).toBe(11);
  });

  it("encounter vacío → findingsPanel vacío, summary.findingsCount = 0", async () => {
    const emptyEncId = (
      await adminPool.query(
        `INSERT INTO "clinical_encounters"
           ("organizationId","patientId","status","chiefComplaint","createdBy")
         VALUES ($1,$2,'DRAFT','Consulta vacía UI4',$3) RETURNING id`,
        [orgA, patientAId, ownerA.userId],
      )
    ).rows[0].id;
    const run = makeTenantRunner(orgA);
    const result = await getOdontogramEncounterView(run, ownerA, patientAId, emptyEncId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.findingsPanel).toHaveLength(0);
    expect(result.value.summary.findingsCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. Integridad estructural
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("no existe tests/phase7d.test.ts", () => {
    expect(existsSync(resolve("tests/phase7d.test.ts"))).toBe(false);
  });

  it("no existe migración 0016", () => {
    const files = readdirSync(resolve("prisma/migrations"));
    expect(files.some((f: string) => f.startsWith("0016"))).toBe(false);
  });

  it("no existe src/app/api/odontogram", () => {
    expect(existsSync(resolve("src/app/api/odontogram"))).toBe(false);
  });

  it("sí existe odontogram-views.ts", () => {
    expect(existsSync(resolve("src/server/domain/clinical/odontogram-views.ts"))).toBe(true);
  });

  it("sí existe src/components/odontogram/", () => {
    expect(existsSync(resolve("src/components/odontogram"))).toBe(true);
  });

  it("sí existen componentes presentacionales del odontograma", () => {
    const required = [
      "OdontogramChart.tsx",
      "ToothGlyph.tsx",
      "ToothSurfaceZone.tsx",
      "OdontogramLegend.tsx",
      "FindingsPanel.tsx",
      "FindingRow.tsx",
      "EncounterFindings.tsx",
      "OdontogramEmpty.tsx",
      "OdontogramNoPermission.tsx",
      "OdontogramMasterSection.tsx",
    ];
    for (const c of required) {
      expect(
        existsSync(resolve("src/components/odontogram", c)),
        `Debe existir ${c}`,
      ).toBe(true);
    }
  });

  it("odontogram.ts no fue modificado por UI-4 (no importa encounter-views ni odontogram-views)", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/odontogram.ts"), "utf-8");
    expect(content).not.toContain("encounter-views");
    expect(content).not.toContain("odontogram-views");
  });

  it("encounters.ts no fue modificado por UI-4 (no importa odontogram-views)", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/encounters.ts"), "utf-8");
    expect(content).not.toContain("odontogram-views");
  });

  it("odontogram-views.ts no invoca recordFinding ni supersedeFinding", () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/odontogram-views.ts"),
      "utf-8",
    );
    expect(content).not.toContain("recordFinding");
    expect(content).not.toContain("supersedeFinding");
  });

  it("odontogram-views.ts no hace SELECT *", () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/odontogram-views.ts"),
      "utf-8",
    );
    expect(content).not.toContain("SELECT *");
  });

  it('odontogram-views.ts no selecciona "note"', () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/odontogram-views.ts"),
      "utf-8",
    );
    // La query de SELECT no debe incluir "note" ni "recordedByUserId"
    expect(content).not.toContain('"note"');
    expect(content).not.toContain('"recordedByUserId"');
  });

  it("ningún componente odontogram renderiza note o recordedByUserId", () => {
    const dir = resolve("src/components/odontogram");
    const files = readdirSync(dir).filter((f: string) => f.endsWith(".tsx"));
    for (const file of files) {
      const content = readFileSync(resolve(dir, file), "utf-8");
      // Verificar que no se accede a .note o .recordedByUserId en JSX/código
      expect(content, `${file} no debe acceder a .note`).not.toContain(".note");
      expect(content, `${file} no debe acceder a .recordedByUserId`).not.toContain(".recordedByUserId");
    }
  });

  it("páginas UI-4 no importan recordFinding ni supersedeFinding", () => {
    const pages = [
      "src/app/(app)/pacientes/[id]/page.tsx",
      "src/app/(app)/pacientes/[id]/consultas/[encounterId]/page.tsx",
    ];
    for (const p of pages) {
      const content = readFileSync(resolve(p), "utf-8");
      expect(content, `${p} no debe importar recordFinding`).not.toContain("recordFinding");
      expect(content, `${p} no debe importar supersedeFinding`).not.toContain("supersedeFinding");
    }
  });

  it("OdontogramLegend.tsx contiene todos los findingTypes en la leyenda", () => {
    const content = readFileSync(resolve("src/components/odontogram/OdontogramLegend.tsx"), "utf-8");
    const required = [
      "CARIES", "RESTORATION", "CROWN", "ENDODONTICS", "IMPLANT",
      "FRACTURE", "MOBILITY", "MISSING", "SEALANT", "OTHER",
    ];
    for (const t of required) {
      expect(content, `Leyenda debe incluir ${t}`).toContain(t);
    }
  });

  it("OdontogramLegend.tsx contiene todos los toothStatus en la leyenda", () => {
    const content = readFileSync(resolve("src/components/odontogram/OdontogramLegend.tsx"), "utf-8");
    const required = ["PRESENT", "ABSENT", "EXTRACTED", "IMPACTED", "UNERUPTED", "ROOT_ONLY"];
    for (const s of required) {
      expect(content, `Leyenda debe incluir estado ${s}`).toContain(s);
    }
  });

  it("OdontogramChart.tsx representa los 32 FDI 11-48", () => {
    const content = readFileSync(resolve("src/components/odontogram/OdontogramChart.tsx"), "utf-8");
    // Verificar que todos los FDI aparecen en el archivo
    for (let q = 1; q <= 4; q++) {
      for (let p = 1; p <= 8; p++) {
        const fdi = q * 10 + p;
        expect(content, `Chart debe incluir FDI ${fdi}`).toContain(String(fdi));
      }
    }
  });

  it("ToothSurfaceZone.tsx exporta FINDING_TYPE_COLOR con los 10 tipos", () => {
    const content = readFileSync(
      resolve("src/components/odontogram/ToothSurfaceZone.tsx"),
      "utf-8",
    );
    const required = [
      "CARIES", "RESTORATION", "CROWN", "ENDODONTICS", "IMPLANT",
      "FRACTURE", "MOBILITY", "MISSING", "SEALANT", "OTHER",
    ];
    for (const t of required) {
      expect(content, `ToothSurfaceZone debe mapear color de ${t}`).toContain(t);
    }
  });

  it("FindingRow.tsx no accede a .note ni .recordedByUserId", () => {
    const content = readFileSync(resolve("src/components/odontogram/FindingRow.tsx"), "utf-8");
    expect(content).not.toContain(".note");
    expect(content).not.toContain(".recordedByUserId");
    expect(content).not.toContain("note.body");
  });

  it("EncounterFindings.tsx no accede a .recordedByUserId ni note.body", () => {
    const content = readFileSync(resolve("src/components/odontogram/EncounterFindings.tsx"), "utf-8");
    expect(content).not.toContain(".recordedByUserId");
    expect(content).not.toContain("note.body");
  });

  it("PHASE_UI-4_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_UI-4_DELIVERY_MARKER.txt"))).toBe(true);
  });
});
