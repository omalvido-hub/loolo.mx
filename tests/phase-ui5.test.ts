// NELZZON — Pruebas Fase UI-5 (Plan de tratamiento, solo lectura).
// Postgres real + RLS + permisos. Cubre:
// - getTreatmentPlansSafeView exige treatment.view.
// - Respeto de RLS / multi-tenant.
// - DTO no expone notes (plan), note (ítem), createdBy, organizationId.
// - Plan activo resuelto correctamente (activePlan).
// - liveItemsCount y itemsCount correctos.
// - Ordenamiento: ACTIVE primero.
// - Paciente sin planes → lista vacía, activePlan null.
// - Integridad estructural: sin escritura, sin endpoints, sin migración.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { getTreatmentPlansSafeView } from "../src/server/domain/clinical/treatment-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let frontDeskA: ActorContext;
let noPermsA: ActorContext;
let ownerB: ActorContext;

let patientAId: string;
let patientBId: string;
let patientEmptyId: string;

// IDs de planes (internos, solo para setup)
let planDraftId: string;
let planActiveId: string;
let planCompletedId: string;

// IDs de ítems (internos)
let itemLive1Id: string; // PROPOSED en planActive
let itemLive2Id: string; // IN_PROGRESS en planActive
let itemDoneId: string;  // COMPLETED en planActive
const NOTES_SECRET = "notas-secretas-ui5-" + rnd();
const NOTE_SECRET = "nota-item-secreta-ui5-" + rnd();

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
      [`${roleKey ?? "noperms"}-${rnd()}@ui5.test`],
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

  // Organizaciones
  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["OrgUI5-A-" + rnd(), "ui5a-" + rnd()],
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ($1,$2) RETURNING id`,
      ["OrgUI5-B-" + rnd(), "ui5b-" + rnd()],
    )
  ).rows[0].id;

  // Actores
  ownerA     = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  billingA   = await member(orgA, "billing");
  frontDeskA = await member(orgA, "front_desk");
  noPermsA   = await member(orgA, null);
  ownerB     = await member(orgB, "owner");

  // Pacientes en orgA
  const contactAId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgA, "Paciente UI5-A", "+5215510000081"],
    )
  ).rows[0].id;
  patientAId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactAId],
    )
  ).rows[0].id;

  const contactEmptyId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgA, "Paciente UI5-Vacio", "+5215510000082"],
    )
  ).rows[0].id;
  patientEmptyId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactEmptyId],
    )
  ).rows[0].id;

  // Paciente en orgB
  const contactBId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone") VALUES ($1,$2,$3) RETURNING id`,
      [orgB, "Paciente UI5-B", "+5215510000083"],
    )
  ).rows[0].id;
  patientBId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgB, contactBId],
    )
  ).rows[0].id;

  // Planes de tratamiento para patientA — adminPool bypassea RLS para el seed
  planDraftId = (
    await adminPool.query(
      `INSERT INTO "treatment_plans"
         ("organizationId","patientId","status","title","notes","createdBy")
       VALUES ($1,$2,'DRAFT',$3,$4,$5) RETURNING id`,
      [orgA, patientAId, "Plan borrador UI5", NOTES_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  // Plan activo — tiene índice único parcial en Postgres (solo un ACTIVE por paciente)
  planActiveId = (
    await adminPool.query(
      `INSERT INTO "treatment_plans"
         ("organizationId","patientId","status","title","notes","createdBy",
          "proposedAt","acceptedAt","activatedAt")
       VALUES ($1,$2,'ACTIVE',$3,$4,$5,now(),now(),now()) RETURNING id`,
      [orgA, patientAId, "Plan activo UI5", NOTES_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  planCompletedId = (
    await adminPool.query(
      `INSERT INTO "treatment_plans"
         ("organizationId","patientId","status","title","notes","createdBy",
          "proposedAt","acceptedAt","activatedAt","completedAt")
       VALUES ($1,$2,'COMPLETED',$3,$4,$5,now(),now(),now(),now()) RETURNING id`,
      [orgA, patientAId, "Plan completado UI5", NOTES_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  // Ítems del plan activo
  itemLive1Id = (
    await adminPool.query(
      `INSERT INTO "treatment_plan_items"
         ("organizationId","planId","procedureType","status","priority","sequence","note","createdBy")
       VALUES ($1,$2,'RESTORATION','PROPOSED','HIGH',1,$3,$4) RETURNING id`,
      [orgA, planActiveId, NOTE_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  itemLive2Id = (
    await adminPool.query(
      `INSERT INTO "treatment_plan_items"
         ("organizationId","planId","toothFdi","surface","procedureType","status","priority","sequence","createdBy")
       VALUES ($1,$2,21,'MESIAL','ENDODONTICS','IN_PROGRESS','URGENT',2,$3) RETURNING id`,
      [orgA, planActiveId, ownerA.userId],
    )
  ).rows[0].id;

  itemDoneId = (
    await adminPool.query(
      `INSERT INTO "treatment_plan_items"
         ("organizationId","planId","toothFdi","procedureType","status","priority","sequence","createdBy","completedAt")
       VALUES ($1,$2,11,'CROWN','COMPLETED','NORMAL',3,$3,now()) RETURNING id`,
      [orgA, planActiveId, ownerA.userId],
    )
  ).rows[0].id;
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Autorización
// ══════════════════════════════════════════════════════════════════════

describe("getTreatmentPlansSafeView — autorización", () => {
  it("billing (sin treatment.view) → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, billingA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("front_desk (sin treatment.view) → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, frontDeskA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("actor sin permisos → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, noPermsA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("owner (con treatment.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("clinician (con treatment.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("organizationId vacío → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const badCtx: ActorContext = { organizationId: "", userId: ownerA.userId, permissions: ownerA.permissions };
    const result = await getTreatmentPlansSafeView(run, badCtx, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. RLS y multi-tenant
// ══════════════════════════════════════════════════════════════════════

describe("getTreatmentPlansSafeView — RLS y multi-tenant", () => {
  it("actor de orgA con patientBId (orgB) → lista vacía (RLS filtra)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalPlans).toBe(0);
    expect(result.value.plans).toHaveLength(0);
    expect(result.value.activePlan).toBeNull();
  });

  it("actor de orgB no ve planes de orgA (RLS filtra)", async () => {
    const run = makeTenantRunner(orgB);
    const result = await getTreatmentPlansSafeView(run, ownerB, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalPlans).toBe(0);
  });

  it("patientId vacío → lista vacía, no lanza (RLS filtra)", async () => {
    const run = makeTenantRunner(orgA);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const result = await getTreatmentPlansSafeView(run, ownerA, fakeId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalPlans).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. DTO seguro
// ══════════════════════════════════════════════════════════════════════

describe("getTreatmentPlansSafeView — DTO seguro", () => {
  it("DTO no contiene notes ni el valor del secreto del plan", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"notes"');
    expect(raw).not.toContain(NOTES_SECRET);
  });

  it("DTO no contiene note ni el valor del secreto del ítem", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"note"');
    expect(raw).not.toContain(NOTE_SECRET);
  });

  it("DTO no contiene createdBy", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"createdBy"');
    expect(raw).not.toContain(ownerA.userId);
  });

  it("DTO no contiene organizationId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"organizationId"');
    expect(raw).not.toContain(orgA);
  });

  it("DTO no contiene linkedFindingId", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = JSON.stringify(result.value);
    expect(raw).not.toContain('"linkedFindingId"');
  });

  it("DTO de plan tiene los campos esperados", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const plan = result.value.plans[0];
    expect(plan).toHaveProperty("id");
    expect(plan).toHaveProperty("status");
    expect(plan).toHaveProperty("title");
    expect(plan).toHaveProperty("createdAt");
    expect(plan).toHaveProperty("items");
    expect(plan).toHaveProperty("itemsCount");
    expect(plan).toHaveProperty("liveItemsCount");
    expect(plan).not.toHaveProperty("notes");
    expect(plan).not.toHaveProperty("createdBy");
    expect(plan).not.toHaveProperty("organizationId");
  });

  it("DTO de ítem tiene los campos esperados", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const activePlan = result.value.activePlan;
    expect(activePlan).not.toBeNull();
    if (!activePlan || activePlan.items.length === 0) return;
    const item = activePlan.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("procedureType");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("priority");
    expect(item).toHaveProperty("sequence");
    expect(item).toHaveProperty("createdAt");
    expect(item).not.toHaveProperty("note");
    expect(item).not.toHaveProperty("createdBy");
    expect(item).not.toHaveProperty("organizationId");
    expect(item).not.toHaveProperty("linkedFindingId");
    expect(item).not.toHaveProperty("planId");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Lógica y ordenamiento
// ══════════════════════════════════════════════════════════════════════

describe("getTreatmentPlansSafeView — lógica", () => {
  it("patientA tiene 3 planes (ACTIVE, DRAFT, COMPLETED)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalPlans).toBe(3);
    expect(result.value.plans).toHaveLength(3);
  });

  it("activePlan está resuelto correctamente (planActiveId)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activePlan).not.toBeNull();
    expect(result.value.activePlan?.id).toBe(planActiveId);
    expect(result.value.activePlan?.status).toBe("ACTIVE");
  });

  it("el plan activo es el primero en la lista (ordenamiento)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.plans[0].status).toBe("ACTIVE");
  });

  it("plan activo tiene 3 ítems (itemsCount = 3)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activePlan?.itemsCount).toBe(3);
  });

  it("plan activo tiene 2 ítems vivos (PROPOSED + IN_PROGRESS)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activePlan?.liveItemsCount).toBe(2);
  });

  it("ítem con toothFdi y surface tiene los datos correctos", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const items = result.value.activePlan?.items ?? [];
    const endoItem = items.find((i) => i.procedureType === "ENDODONTICS");
    expect(endoItem).toBeDefined();
    expect(endoItem?.toothFdi).toBe(21);
    expect(endoItem?.surface).toBe("MESIAL");
    expect(endoItem?.status).toBe("IN_PROGRESS");
    expect(endoItem?.priority).toBe("URGENT");
  });

  it("ítem sin toothFdi tiene toothFdi null", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const items = result.value.activePlan?.items ?? [];
    const restItem = items.find((i) => i.procedureType === "RESTORATION");
    expect(restItem).toBeDefined();
    expect(restItem?.toothFdi).toBeNull();
  });

  it("ítem completado tiene completedAt no null", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const items = result.value.activePlan?.items ?? [];
    const crownItem = items.find((i) => i.procedureType === "CROWN");
    expect(crownItem).toBeDefined();
    expect(crownItem?.status).toBe("COMPLETED");
    expect(crownItem?.completedAt).not.toBeNull();
  });

  it("paciente sin planes → totalPlans 0, activePlan null", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientEmptyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalPlans).toBe(0);
    expect(result.value.plans).toHaveLength(0);
    expect(result.value.activePlan).toBeNull();
    expect(result.value.patientId).toBe(patientEmptyId);
  });

  it("plan DRAFT tiene itemsCount 0 (no tiene ítems en el seed)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const draft = result.value.plans.find((p) => p.id === planDraftId);
    expect(draft).toBeDefined();
    expect(draft?.itemsCount).toBe(0);
    expect(draft?.liveItemsCount).toBe(0);
  });

  it("plan COMPLETED tiene completedAt no null", async () => {
    const run = makeTenantRunner(orgA);
    const result = await getTreatmentPlansSafeView(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const completed = result.value.plans.find((p) => p.id === planCompletedId);
    expect(completed).toBeDefined();
    expect(completed?.completedAt).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Integridad estructural
// ══════════════════════════════════════════════════════════════════════

describe("integridad estructural", () => {
  it("UI-5 no agregó migración propia (sin 0016_phase_ui5 ni superior de UI-5)", () => {
    expect(existsSync(resolve("prisma/migrations/0016_phase_ui5.sql"))).toBe(false);
  });

  it("no existe src/app/api/treatment", () => {
    expect(existsSync(resolve("src/app/api/treatment"))).toBe(false);
  });

  it("sí existe treatment-views.ts", () => {
    expect(existsSync(resolve("src/server/domain/clinical/treatment-views.ts"))).toBe(true);
  });

  it("sí existe src/components/treatment/", () => {
    expect(existsSync(resolve("src/components/treatment"))).toBe(true);
  });

  it("sí existen componentes presentacionales del plan de tratamiento", () => {
    const required = [
      "TreatmentPlanStatusBadge.tsx",
      "TreatmentItemRow.tsx",
      "TreatmentPlanCard.tsx",
      "TreatmentEmpty.tsx",
      "TreatmentNoPermission.tsx",
      "TreatmentPlansSection.tsx",
    ];
    for (const c of required) {
      expect(
        existsSync(resolve("src/components/treatment", c)),
        `Debe existir ${c}`,
      ).toBe(true);
    }
  });

  it("treatment.ts no fue modificado por UI-5", () => {
    const content = readFileSync(resolve("src/server/domain/clinical/treatment.ts"), "utf-8");
    expect(content).not.toContain("treatment-views");
    expect(content).not.toContain("getTreatmentPlansSafeView");
  });

  it("treatment-views.ts no invoca createPlan, addItem ni setPlanStatus", () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/treatment-views.ts"),
      "utf-8",
    );
    expect(content).not.toContain("createPlan");
    expect(content).not.toContain("addItem");
    expect(content).not.toContain("setPlanStatus");
    expect(content).not.toContain("setItemStatus");
    expect(content).not.toContain("updateItem");
  });

  it("treatment-views.ts no hace SELECT *", () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/treatment-views.ts"),
      "utf-8",
    );
    expect(content).not.toContain("SELECT *");
  });

  it('treatment-views.ts no selecciona "notes" ni "note" ni "createdBy"', () => {
    const content = readFileSync(
      resolve("src/server/domain/clinical/treatment-views.ts"),
      "utf-8",
    );
    expect(content).not.toContain('"notes"');
    expect(content).not.toContain('"note"');
    expect(content).not.toContain('"createdBy"');
  });

  it("ningún componente treatment renderiza .notes, .note o .createdBy", () => {
    const dir = resolve("src/components/treatment");
    const files = readdirSync(dir).filter((f: string) => f.endsWith(".tsx"));
    for (const file of files) {
      const content = readFileSync(resolve(dir, file), "utf-8");
      expect(content, `${file} no debe acceder a .notes`).not.toContain(".notes");
      expect(content, `${file} no debe acceder a .note`).not.toContain(".note");
      expect(content, `${file} no debe acceder a .createdBy`).not.toContain(".createdBy");
    }
  });

  it("página pacientes/[id] importa getTreatmentPlansSafeView y TreatmentPlansSection", () => {
    const content = readFileSync(
      resolve("src/app/(app)/pacientes/[id]/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("getTreatmentPlansSafeView");
    expect(content).toContain("TreatmentPlansSection");
    expect(content).toContain("TreatmentNoPermission");
  });

  it("página pacientes/[id] no importa createPlan, addItem ni setPlanStatus", () => {
    const content = readFileSync(
      resolve("src/app/(app)/pacientes/[id]/page.tsx"),
      "utf-8",
    );
    expect(content).not.toContain("createPlan");
    expect(content).not.toContain("addItem");
    expect(content).not.toContain("setPlanStatus");
  });

  it("PHASE_UI-5_DELIVERY_MARKER.txt existe", () => {
    expect(existsSync(resolve("PHASE_UI-5_DELIVERY_MARKER.txt"))).toBe(true);
  });
});
