// LOOLO — Pruebas Fase 7B (Ficha Viva interna del paciente).
// Postgres real + RLS + permisos + secciones filtradas por rol + auditoría.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { resolvePatientLiveRecord } from "../src/server/domain/patient-record/resolver.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let adminA: ActorContext;
let frontDeskA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let accountantA: ActorContext;

// patientA: paciente con datos completos para pruebas
let patientAId: string;
let contactAId: string;
// patientArchived: paciente archivado
let patientArchivedId: string;
// patientB: paciente en orgB
let patientBId: string;

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
      [`${roleKey}-${rnd()}@7b.test`],
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
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r: any) => r.key)) };
}

const runA = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(orgA, async (c) => work(execOf(c)));
const runB = <T,>(work: (e: any) => Promise<T>) =>
  forTenantPg(orgB, async (c) => work(execOf(c)));

beforeAll(async () => {
  await ensureRbac();

  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('Clinica7B','clinica7b-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('OtraOrg7B','otra7b-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerA = await member(orgA, "owner");
  adminA = await member(orgA, "admin");
  frontDeskA = await member(orgA, "front_desk");
  clinicianA = await member(orgA, "clinician");
  billingA = await member(orgA, "billing");
  accountantA = await member(orgA, "accountant");

  // ── Semilla orgA: contacto + paciente con datos en todas las secciones ──

  contactAId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone","email","phoneNormalized","emailNormalized")
       VALUES ($1,'Ana García','+5255123456','ana@test.com','+525512345600','ana@test.com') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;

  patientAId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactAId],
    )
  ).rows[0].id;

  // Cita pasada completada
  await adminPool.query(
    `INSERT INTO "appointments"("organizationId","contactId","patientId","startAt","endAt","status","createdBy","completedAt")
     VALUES ($1,$2,$3, now()-interval'10 days', now()-interval'10 days'+interval'1 hour',
             'COMPLETED',$4, now()-interval'10 days'+interval'1 hour')`,
    [orgA, contactAId, patientAId, ownerA.userId],
  );

  // Canal + conversación abierta con tarea
  const channelId = (
    await adminPool.query(
      `INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WHATSAPP','521234') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  const convId = (
    await adminPool.query(
      `INSERT INTO "conversations"("organizationId","channelId","contactId","status")
       VALUES ($1,$2,$3,'OPEN') RETURNING id`,
      [orgA, channelId, contactAId],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "conversation_tasks"("organizationId","conversationId","contactId","title","status","createdBy")
     VALUES ($1,$2,$3,'Confirmar próxima cita','OPEN',$4)`,
    [orgA, convId, contactAId, ownerA.userId],
  );

  // Consulta clínica finalizada + nota clínica
  const encId = (
    await adminPool.query(
      `INSERT INTO "clinical_encounters"
         ("organizationId","patientId","status","chiefComplaint","createdBy","finalizedAt","finalizedByUserId")
       VALUES ($1,$2,'FINALIZED','Revisión general',$3,now()-interval'8 days',$4) RETURNING id`,
      [orgA, patientAId, ownerA.userId, ownerA.userId],
    )
  ).rows[0].id;
  // body de nota clínica — NUNCA debe aparecer en la ficha viva
  await adminPool.query(
    `INSERT INTO "clinical_notes"("organizationId","encounterId","authorUserId","body")
     VALUES ($1,$2,$3,'CONTENIDO CLINICO SECRETO QUE NUNCA DEBE APARECER')`,
    [orgA, encId, ownerA.userId],
  );

  // Hallazgo odontograma
  await adminPool.query(
    `INSERT INTO "odontogram_findings"
       ("organizationId","patientId","encounterId","toothFdi","findingType","toothStatus","recordedByUserId")
     VALUES ($1,$2,$3,11,'CARIES','PRESENT',$4)`,
    [orgA, patientAId, encId, ownerA.userId],
  );

  // Plan de tratamiento activo con ítem
  const planId = (
    await adminPool.query(
      `INSERT INTO "treatment_plans"
         ("organizationId","patientId","status","title","createdBy","activatedAt")
       VALUES ($1,$2,'ACTIVE','Plan ortodoncia',$3,now()-interval'5 days') RETURNING id`,
      [orgA, patientAId, ownerA.userId],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "treatment_plan_items"
       ("organizationId","planId","procedureType","status","priority","sequence","createdBy")
     VALUES ($1,$2,'ORTHODONTICS','PROPOSED','NORMAL',1,$3)`,
    [orgA, planId, ownerA.userId],
  );

  // Presupuesto ACCEPTED con total 500000 centavos
  const quoteId = (
    await adminPool.query(
      `INSERT INTO "quotes"
         ("organizationId","patientId","status","currency","totalCents","subtotalCents","discountTotalCents","taxTotalCents","createdBy","acceptedAt")
       VALUES ($1,$2,'ACCEPTED','MXN',500000,500000,0,0,$3,now()-interval'4 days') RETURNING id`,
      [orgA, patientAId, ownerA.userId],
    )
  ).rows[0].id;

  // Pago de 300000 centavos
  await adminPool.query(
    `INSERT INTO "payments"
       ("organizationId","quoteId","patientId","entryKind","amountCents","method","status","recordedByUserId")
     VALUES ($1,$2,$3,'PAYMENT',300000,'CASH','CONFIRMED',$4)`,
    [orgA, quoteId, patientAId, ownerA.userId],
  );

  // ── Paciente archivado ──
  const archivedContactId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'Archivado Test') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  patientArchivedId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state","archivedAt")
       VALUES ($1,$2,'INACTIVE','ARCHIVED',now()) RETURNING id`,
      [orgA, archivedContactId],
    )
  ).rows[0].id;

  // ── Semilla orgB: paciente para prueba multi-tenant ──
  const contactBId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'OtroOrg') RETURNING id`,
      [orgB],
    )
  ).rows[0].id;
  patientBId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgB, contactBId],
    )
  ).rows[0].id;
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. Composición correcta por sección (owner ve todo)
// ══════════════════════════════════════════════════════════════════════

describe("composición por sección", () => {
  it("identity incluye nombre, estado, patientId y contactId", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { identity } = result.value;
    expect(identity.patientId).toBe(patientAId);
    expect(identity.contactId).toBe(contactAId);
    expect(identity.fullName).toBe("Ana García");
    expect(identity.patientState).toBe("OK");
  });

  it("operative incluye última cita y conteo de conversaciones y tareas abiertas", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { operative } = result.value;
    expect(operative.openConversationsCount).toBeGreaterThanOrEqual(1);
    expect(operative.openTasksCount).toBeGreaterThanOrEqual(1);
    expect(operative.lastAppointment).not.toBeNull();
    expect(operative.lastAppointment?.status).toBe("COMPLETED");
  });

  it("clinical contiene conteo de consultas y notas (sin body)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { clinical } = result.value;
    expect(clinical).toBeDefined();
    expect(clinical!.encountersCount).toBeGreaterThanOrEqual(1);
    expect(clinical!.notesCount).toBeGreaterThanOrEqual(1);
    expect(clinical!.lastEncounterStatus).toBe("FINALIZED");
  });

  it("odontogramSummary contiene total de hallazgos", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.odontogramSummary).toBeDefined();
    expect(result.value.odontogramSummary!.totalFindings).toBeGreaterThanOrEqual(1);
    expect(result.value.odontogramSummary!.findingsByStatus["PRESENT"]).toBeGreaterThanOrEqual(1);
  });

  it("treatment contiene plan activo e ítems por estado", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { treatment } = result.value;
    expect(treatment).toBeDefined();
    expect(treatment!.activePlanId).not.toBeNull();
    expect(treatment!.activePlanStatus).toBe("ACTIVE");
    expect(treatment!.plansCount).toBeGreaterThanOrEqual(1);
    expect(treatment!.itemsByStatus["PROPOSED"]).toBeGreaterThanOrEqual(1);
  });

  it("financial contiene conteo de presupuestos y saldo correcto", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { financial } = result.value;
    expect(financial).toBeDefined();
    expect(financial!.totalAcceptedCents).toBe(500000);
    expect(financial!.paidCents).toBe(300000);
    expect(financial!.balanceCents).toBe(200000);
    expect(financial!.hasReversals).toBe(false);
  });

  it("tasks contiene tareas con campos básicos", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { tasks } = result.value;
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    const open = (tasks ?? []).filter((t) => t.status === "OPEN");
    expect(open.length).toBeGreaterThanOrEqual(1);
    expect(open[0].title).toBe("Confirmar próxima cita");
  });

  it("_meta lista las secciones visibles del owner", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sections = result.value._meta.visibleSections;
    expect(sections).toContain("identity");
    expect(sections).toContain("operative");
    expect(sections).toContain("clinical");
    expect(sections).toContain("odontogramSummary");
    expect(sections).toContain("treatment");
    expect(sections).toContain("financial");
    expect(sections).toContain("tasks");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Filtrado por permisos ROL POR ROL
// ══════════════════════════════════════════════════════════════════════

describe("filtrado por permisos rol a rol", () => {
  it("admin ve todas las secciones (igual que owner)", async () => {
    const result = await resolvePatientLiveRecord(runA, adminA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { _meta } = result.value;
    expect(_meta.visibleSections).toContain("clinical");
    expect(_meta.visibleSections).toContain("financial");
    expect(_meta.visibleSections).toContain("tasks");
  });

  it("front_desk (sin patients.view) → FORBIDDEN y auditado", async () => {
    const result = await resolvePatientLiveRecord(runA, frontDeskA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
    // Verificar audit en DB
    const audit = (
      await adminPool.query(
        `SELECT "action","metadata" FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='permission.denied'
           AND "actorUserId"=$2 ORDER BY "createdAt" DESC LIMIT 1`,
        [orgA, frontDeskA.userId],
      )
    ).rows;
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].metadata?.permission).toBe("patients.view");
  });

  it("clinician (sin payment.view) → ve clinical/treatment pero NO financial", async () => {
    const result = await resolvePatientLiveRecord(runA, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { _meta, financial, clinical, odontogramSummary, treatment } = result.value;
    // clinician tiene patients.view, clinical.view, odontogram.view, treatment.view
    expect(clinical).toBeDefined();
    expect(odontogramSummary).toBeDefined();
    expect(treatment).toBeDefined();
    // clinician NO tiene payment.view → no financial
    expect(financial).toBeUndefined();
    expect(_meta.visibleSections).not.toContain("financial");
  });

  it("billing (sin patients.view) → FORBIDDEN", async () => {
    const result = await resolvePatientLiveRecord(runA, billingA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("accountant (sin patients.view) → FORBIDDEN", async () => {
    const result = await resolvePatientLiveRecord(runA, accountantA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("contexto con patients.view pero sin clinical.view → NO sección clinical", async () => {
    // Simula un rol con patients.view + tasks.view pero sin clinical.view
    const customCtx: ActorContext = {
      organizationId: orgA,
      userId: ownerA.userId,
      permissions: new Set(["patients.view", "tasks.view", "appointments.view"]),
    };
    const result = await resolvePatientLiveRecord(runA, customCtx, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clinical).toBeUndefined();
    expect(result.value.odontogramSummary).toBeUndefined();
    expect(result.value.treatment).toBeUndefined();
    expect(result.value.financial).toBeUndefined();
    expect(result.value.tasks).toBeDefined();
    expect(result.value._meta.visibleSections).not.toContain("clinical");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. clinical_notes: NUNCA devuelve body
// ══════════════════════════════════════════════════════════════════════

describe("clinical_notes: sin body", () => {
  it("el resolver nunca devuelve body de notas clínicas", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = result.value;
    const serialized = JSON.stringify(record);

    // body no debe aparecer ni en la clave directa ni en ningún contexto
    expect(serialized).not.toContain("CONTENIDO CLINICO SECRETO");
    expect(serialized).not.toContain('"body"');

    // La sección clinical SÍ tiene conteos (metadatos permitidos)
    expect(record.clinical!.notesCount).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Timeline: solo eventos de secciones visibles, sin audit_logs crudos
// ══════════════════════════════════════════════════════════════════════

describe("timeline", () => {
  it("owner ve eventos de todas las secciones (citas, consultas, pagos)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { timeline } = result.value;
    expect(Array.isArray(timeline)).toBe(true);
    const types = timeline.map((e) => e.eventType);
    // Cita completada
    expect(types).toContain("appointment.completed");
    // Consulta finalizada (visible porque owner tiene clinical.view)
    expect(types).toContain("encounter.finalized");
    // Pago registrado (visible porque owner tiene payment.view)
    expect(types).toContain("payment.recorded");
  });

  it("clinician (sin payment.view) no ve eventos financieros en timeline", async () => {
    const result = await resolvePatientLiveRecord(runA, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const types = result.value.timeline.map((e) => e.eventType);
    expect(types).not.toContain("payment.recorded");
    expect(types).not.toContain("quote.proposed");
    expect(types).not.toContain("quote.accepted");
  });

  it("el timeline no expone audit_logs crudos (sin action/actorType)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const event of result.value.timeline) {
      expect(event).not.toHaveProperty("action");
      expect(event).not.toHaveProperty("actorType");
      expect(event).not.toHaveProperty("actorUserId");
      expect(event).not.toHaveProperty("metadata");
      // Sí debe tener los campos del schema
      expect(event).toHaveProperty("eventType");
      expect(event).toHaveProperty("label");
      expect(event).toHaveProperty("occurredAt");
    }
  });

  it("contexto sin financial no ve eventos de pagos/presupuestos en timeline", async () => {
    const customCtx: ActorContext = {
      organizationId: orgA,
      userId: ownerA.userId,
      permissions: new Set(["patients.view", "clinical.view"]),
    };
    const result = await resolvePatientLiveRecord(runA, customCtx, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const types = result.value.timeline.map((e) => e.eventType);
    expect(types).not.toContain("payment.recorded");
    expect(types).not.toContain("quote.accepted");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Saldo: balanceCents = PAYMENT - REVERSAL
// ══════════════════════════════════════════════════════════════════════

describe("cálculo de saldo", () => {
  it("balanceCents = totalAcceptedCents - paidCents (pago parcial)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { financial } = result.value;
    expect(financial).toBeDefined();
    // 500000 total - 300000 pago = 200000 pendiente
    expect(financial!.balanceCents).toBe(200000);
    expect(financial!.paidCents).toBe(300000);
    expect(Number.isInteger(financial!.balanceCents)).toBe(true);
    expect(Number.isInteger(financial!.paidCents)).toBe(true);
  });

  it("balanceCents con reverso: saldo refleja PAYMENT - REVERSAL", async () => {
    // Crear un paciente nuevo con pago y reverso
    const cId = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'ReversalTest') RETURNING id`,
        [orgA],
      )
    ).rows[0].id;
    const pId = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgA, cId],
      )
    ).rows[0].id;
    const qId = (
      await adminPool.query(
        `INSERT INTO "quotes"("organizationId","patientId","status","currency","totalCents","subtotalCents","discountTotalCents","taxTotalCents","createdBy","acceptedAt")
         VALUES ($1,$2,'ACCEPTED','MXN',100000,100000,0,0,$3,now()) RETURNING id`,
        [orgA, pId, ownerA.userId],
      )
    ).rows[0].id;
    // PAYMENT 80000
    const payId = (
      await adminPool.query(
        `INSERT INTO "payments"("organizationId","quoteId","patientId","entryKind","amountCents","method","status","recordedByUserId")
         VALUES ($1,$2,$3,'PAYMENT',80000,'CASH','CONFIRMED',$4) RETURNING id`,
        [orgA, qId, pId, ownerA.userId],
      )
    ).rows[0].id;
    // REVERSAL 80000
    await adminPool.query(
      `INSERT INTO "payments"("organizationId","quoteId","patientId","entryKind","amountCents","method","status","recordedByUserId","reversesPaymentId")
       VALUES ($1,$2,$3,'REVERSAL',80000,'CASH','CONFIRMED',$4,$5)`,
      [orgA, qId, pId, ownerA.userId, payId],
    );

    const result = await resolvePatientLiveRecord(runA, ownerA, pId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { financial } = result.value;
    expect(financial).toBeDefined();
    // paidCents = 80000 - 80000 = 0; balance = 100000
    expect(financial!.paidCents).toBe(0);
    expect(financial!.balanceCents).toBe(100000);
    expect(financial!.hasReversals).toBe(true);
  });

  it("todos los montos financieros son enteros (sin float)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const f = result.value.financial!;
    expect(Number.isInteger(f.totalAcceptedCents)).toBe(true);
    expect(Number.isInteger(f.totalProposedCents)).toBe(true);
    expect(Number.isInteger(f.balanceCents)).toBe(true);
    expect(Number.isInteger(f.paidCents)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Multi-tenant: paciente de otra org → not found
// ══════════════════════════════════════════════════════════════════════

describe("multi-tenant (RLS)", () => {
  it("pedir ficha de paciente de orgB desde orgA → not found", async () => {
    // ownerA tratando de leer patientBId (que pertenece a orgB)
    const result = await resolvePatientLiveRecord(runA, ownerA, patientBId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("owner de orgB SÍ puede ver su propio paciente", async () => {
    const ownerB = await member(orgB, "owner");
    const result = await resolvePatientLiveRecord(runB, ownerB, patientBId);
    expect(result.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. Auditoría
// ══════════════════════════════════════════════════════════════════════

describe("auditoría", () => {
  it("abrir ficha genera exactamente UNA entrada patient_record.viewed sin contenido sensible", async () => {
    const ctxForAudit: ActorContext = {
      organizationId: orgA,
      userId: ownerA.userId,
      permissions: new Set(["patients.view"]),
    };

    // Contar audits antes
    const before = (
      await adminPool.query(
        `SELECT COUNT(*) as c FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='patient_record.viewed' AND "actorUserId"=$2`,
        [orgA, ownerA.userId],
      )
    ).rows[0].c;

    await resolvePatientLiveRecord(runA, ctxForAudit, patientAId);

    const after = (
      await adminPool.query(
        `SELECT COUNT(*) as c FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='patient_record.viewed' AND "actorUserId"=$2`,
        [orgA, ownerA.userId],
      )
    ).rows;
    expect(Number(after[0].c)).toBe(Number(before) + 1);

    // Verificar que el metadata no contiene contenido sensible
    const entry = (
      await adminPool.query(
        `SELECT "metadata" FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='patient_record.viewed' AND "actorUserId"=$2
         ORDER BY "createdAt" DESC LIMIT 1`,
        [orgA, ownerA.userId],
      )
    ).rows[0];
    expect(entry.metadata).toHaveProperty("patientId");
    expect(entry.metadata).toHaveProperty("visibleSections");
    expect(entry.metadata).toHaveProperty("timestamp");
    // Sin contenido clínico en metadata
    const metaStr = JSON.stringify(entry.metadata);
    expect(metaStr).not.toContain("CONTENIDO CLINICO");
    expect(metaStr).not.toContain("body");
  });

  it("denegación registra permission.denied en transacción propia", async () => {
    const noAccessCtx: ActorContext = {
      organizationId: orgA,
      userId: frontDeskA.userId,
      permissions: new Set(["app_shell.view"]), // sin patients.view
    };

    const result = await resolvePatientLiveRecord(runA, noAccessCtx, patientAId);
    expect(result.ok).toBe(false);

    const denial = (
      await adminPool.query(
        `SELECT "action","metadata" FROM "audit_logs"
         WHERE "organizationId"=$1 AND "action"='permission.denied' AND "actorUserId"=$2
         ORDER BY "createdAt" DESC LIMIT 1`,
        [orgA, frontDeskA.userId],
      )
    ).rows;
    expect(denial.length).toBeGreaterThanOrEqual(1);
    expect(denial[0].metadata?.permission).toBe("patients.view");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. Paciente archivado / eliminado
// ══════════════════════════════════════════════════════════════════════

describe("paciente archivado o eliminado", () => {
  it("paciente con state=ARCHIVED → respuesta controlada (no crash)", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientArchivedId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["ARCHIVED", "NOT_FOUND"]).toContain(result.reason);
  });

  it("paciente con deletedAt → respuesta controlada (no crash)", async () => {
    const cId = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'DeletedTest') RETURNING id`,
        [orgA],
      )
    ).rows[0].id;
    const delId = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state","deletedAt")
         VALUES ($1,$2,'INACTIVE','OK',now()) RETURNING id`,
        [orgA, cId],
      )
    ).rows[0].id;
    const result = await resolvePatientLiveRecord(runA, ownerA, delId);
    expect(result.ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. recommendedActions
// ══════════════════════════════════════════════════════════════════════

describe("recommendedActions", () => {
  it("sin próxima cita → acción schedule_appointment presente", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { recommendedActions, operative } = result.value;
    if (!operative.nextAppointment) {
      expect(recommendedActions.some((a) => a.code === "schedule_appointment")).toBe(true);
    }
  });

  it("saldo pendiente → acción record_payment presente", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { recommendedActions, financial } = result.value;
    if (financial && financial.balanceCents > 0) {
      expect(recommendedActions.some((a) => a.code === "record_payment")).toBe(true);
    }
  });

  it("acciones son solo etiquetas, no ejecutan nada", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const a of result.value.recommendedActions) {
      expect(typeof a.code).toBe("string");
      expect(typeof a.reason).toBe("string");
      expect(Object.keys(a)).toEqual(["code", "reason"]);
    }
  });
});
