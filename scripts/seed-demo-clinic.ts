// NELZZON — Seed demo: clínica dental "operando" para probar el Panel Sinapsis
// con datos reales del backend (nada hardcodeado en la UI).
// Uso: npx tsx scripts/seed-demo-clinic.ts
//
// Prerequisito: scripts/seed-demo-user.ts ya ejecutado (org "Clínica Demo" y
// usuario omalvido@gmail.com deben existir).
//
// Garantías:
//   - Idempotente: se puede correr N veces. Pacientes/recursos se reusan por
//     nombre; citas/presupuestos/pagos/plan de tratamiento de esta demo se
//     regeneran cada corrida (llevan el sello "[DEMO]" en reason/notes) para
//     que "hoy" y "este mes" sigan siendo coherentes sin importar cuándo se
//     ejecute el script.
//   - Nunca toca pacientes/citas/presupuestos que NO llevan el sello DEMO.
//   - Limpieza antes de producción: borrar todo lo sellado "[DEMO]" —
//       DELETE FROM payments        WHERE "quoteId" IN (SELECT id FROM quotes WHERE notes LIKE '[DEMO]%');
//       DELETE FROM quote_lines     WHERE "quoteId" IN (SELECT id FROM quotes WHERE notes LIKE '[DEMO]%');
//       DELETE FROM quotes          WHERE notes LIKE '[DEMO]%';
//       DELETE FROM treatment_plan_items WHERE "planId" IN (SELECT id FROM treatment_plans WHERE notes LIKE '[DEMO]%');
//       DELETE FROM treatment_plans WHERE notes LIKE '[DEMO]%';
//       DELETE FROM appointments    WHERE reason LIKE '[DEMO]%';
//       DELETE FROM organization_finance_periods WHERE "organizationId" = '<orgId>';
//     (pacientes/contactos/recursos demo se dejan — son identidad reusable, no ledger).

import { config } from "dotenv";
config();

import pg from "pg";
import { adminPool } from "../tests/harness.js";

const ORG_SLUG = "clinica-demo";
const USER_EMAIL = "omalvido@gmail.com";
const DEMO_TAG = "[DEMO]";
const TZ = "America/Mexico_City";

// ── Catálogo de procedimientos usados en citas/presupuestos ────────────
const PROC = {
  EXAM: { label: "Revisión y diagnóstico", minutes: 30, priceCents: 60000 },
  PROPHYLAXIS: { label: "Limpieza dental", minutes: 45, priceCents: 120000 },
  RESTORATION: { label: "Resina dental", minutes: 45, priceCents: 150000 },
  ENDODONTICS: { label: "Endodoncia", minutes: 90, priceCents: 950000 },
  EXTRACTION: { label: "Extracción", minutes: 45, priceCents: 220000 },
  CROWN: { label: "Corona porcelana", minutes: 60, priceCents: 850000 },
  ORTHODONTICS: { label: "Ortodoncia — ajuste", minutes: 30, priceCents: 180000 },
} as const;

// ── 40 pacientes demo (nombre completo) ─────────────────────────────────
const PATIENT_NAMES = [
  "Regina Cárdenas Ortiz", "Lucía Bernal Ramírez", "Héctor Sáenz Molina", "Iván Robledo Torres",
  "Sofía Nájera Duarte", "Marco Ordaz Ibarra", "Jorge Lomelí Castro", "Daniela Ponce Salazar",
  "Andrea Guerrero Peña", "Carlos Reyes Cortés", "Alejandra Cabrera Rivas", "Ricardo Domínguez Farías",
  "Paulina Vázquez Aguirre", "Diego Contreras Zamora", "Valeria Villaseñor Cervantes", "Santiago Duarte Navarro",
  "Renata Solís Barrera", "Rodrigo Mendoza Escobar", "Camila Rangel Aguilar", "Adrián Gallardo Delgado",
  "Mariana Torres Guerrero", "Gerardo Peña Molina", "Ana Sofía Reyes Bernal", "Roberto Fuentes Cárdenas",
  "Gabriela Salazar Ibarra", "Fernando Aguirre Ponce", "Isabel Castro Ramírez", "Raúl Domínguez Ordaz",
  "Natalia Espinoza Rivas", "Sergio Cortés Molina", "Verónica Farías Cabrera", "Eduardo Zamora Sáenz",
  "Karla Escobar Nájera", "Ximena Zamora Espinoza", "Alberto Rivas Contreras", "Óscar Fuentes Delgado",
  "Cecilia Aguilar Torres", "Emilia Cortés Salazar", "Tomás Rivera Escobar", "Luisa Ordóñez Peña",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function phoneFor(index: number): string {
  return `+521555${String(1000000 + index).slice(-7)}`;
}

function emailFor(fullName: string, index: number): string {
  const [first, ...rest] = stripAccents(fullName).toLowerCase().split(" ");
  const last = rest[rest.length - 1] ?? "demo";
  return `${first}.${last}${index}@clinicademo.mx`;
}

// ── Helpers de horario en America/Mexico_City ───────────────────────────
/** 00:00 local (MX) del día de hoy, como Date UTC. */
function mxMidnightUTCToday(): Date {
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  for (let h = 4; h <= 8; h++) {
    const pad = h < 10 ? `0${h}` : String(h);
    const candidate = new Date(`${dateStr}T${pad}:00:00Z`);
    const mxStr = candidate.toLocaleString("sv-SE", { timeZone: TZ });
    if (mxStr === `${dateStr} 00:00:00`) return candidate;
  }
  return new Date(`${dateStr}T06:00:00Z`);
}

function atMinute(midnightUTC: Date, minute: number): Date {
  return new Date(midnightUTC.getTime() + minute * 60_000);
}

/** now() menos N días, sin cruzar al mes anterior (clampa al día 1 del mes actual, 10:00 local). */
function daysAgoWithinMonth(now: Date, days: number): Date {
  const candidate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const nowMonthKey = now.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
  const candMonthKey = candidate.toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
  if (candMonthKey === nowMonthKey) return candidate;
  const dateStr = `${nowMonthKey}-01`;
  for (let h = 12; h <= 20; h++) {
    const c = new Date(`${dateStr}T${String(h).padStart(2, "0")}:00:00Z`);
    if (c.toLocaleString("sv-SE", { timeZone: TZ }).startsWith(`${dateStr} `)) return c;
  }
  return new Date(`${dateStr}T16:00:00Z`);
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

// ── DB helpers ────────────────────────────────────────────────────────
async function row<T = Record<string, unknown>>(client: pg.PoolClient, sql: string, params: unknown[]): Promise<T | null> {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}
async function rows<T = Record<string, unknown>>(client: pg.PoolClient, sql: string, params: unknown[]): Promise<T[]> {
  const { rows } = await client.query(sql, params);
  return rows;
}
async function run(client: pg.PoolClient, sql: string, params: unknown[]): Promise<void> {
  await client.query(sql, params);
}

async function getOrCreatePatient(client: pg.PoolClient, orgId: string, fullName: string, index: number): Promise<string> {
  const existing = await row<{ id: string }>(
    client,
    `SELECT p.id FROM patients p
     JOIN contacts c ON c.id = p."contactId"
     WHERE p."organizationId" = $1 AND c."fullName" = $2 AND p."deletedAt" IS NULL
     LIMIT 1`,
    [orgId, fullName],
  );
  if (existing) return existing.id;

  const contact = await row<{ id: string }>(
    client,
    `INSERT INTO contacts ("organizationId","fullName","phone","email","state")
     VALUES ($1,$2,$3,$4,'OK') RETURNING id`,
    [orgId, fullName, phoneFor(index), emailFor(fullName, index)],
  );
  const patient = await row<{ id: string }>(
    client,
    `INSERT INTO patients ("organizationId","contactId","status","state")
     VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
    [orgId, contact!.id],
  );
  return patient!.id;
}

async function getOrCreateResource(
  client: pg.PoolClient,
  orgId: string,
  kind: "CHAIR" | "PROFESSIONAL",
  name: string,
): Promise<string> {
  const existing = await row<{ id: string }>(
    client,
    `SELECT id FROM resources WHERE "organizationId" = $1 AND kind = $2 AND name = $3 LIMIT 1`,
    [orgId, kind, name],
  );
  if (existing) return existing.id;
  const created = await row<{ id: string }>(
    client,
    `INSERT INTO resources ("organizationId","kind","name","active") VALUES ($1,$2,$3,true) RETURNING id`,
    [orgId, kind, name],
  );
  return created!.id;
}

async function ensureWeeklyAvailability(client: pg.PoolClient, orgId: string, resourceId: string): Promise<void> {
  await run(client, `DELETE FROM availability_rules WHERE "resourceId" = $1`, [resourceId]);
  // Lunes(1) a sábado(6), 9:00–19:00. Domingo cerrado (weekday 0, sin regla).
  for (let weekday = 1; weekday <= 6; weekday++) {
    await run(
      client,
      `INSERT INTO availability_rules ("organizationId","resourceId","weekday","startMinute","endMinute","active")
       VALUES ($1,$2,$3,540,1140,true)`,
      [orgId, resourceId, weekday],
    );
  }
}

interface Slot {
  chairId: string;
  professionalId: string;
  patientId: string;
  patientLabel: string;
  procKey: keyof typeof PROC;
  startAt: Date;
  endAt: Date;
}

async function main() {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    const now = new Date();
    const midnight = mxMidnightUTCToday();

    // ── 1-2. Org + usuario ────────────────────────────────────────────
    console.log("1. Organización + usuario...");
    const org = await row<{ id: string }>(client, `SELECT id FROM organizations WHERE slug = $1`, [ORG_SLUG]);
    if (!org) throw new Error(`Organización "${ORG_SLUG}" no encontrada. Ejecuta scripts/seed-demo-user.ts primero.`);
    const orgId = org.id;
    const user = await row<{ id: string }>(client, `SELECT id FROM users WHERE email = $1`, [USER_EMAIL]);
    if (!user) throw new Error(`Usuario "${USER_EMAIL}" no encontrado. Ejecuta scripts/seed-demo-user.ts primero.`);
    const ownerId = user.id;
    console.log(`   orgId=${orgId} ownerId=${ownerId}`);

    // ── 3. Recursos: 4 sillones + 4 profesionales, pareados 1:1 ────────
    console.log("2. Recursos (sillones + profesionales)...");
    const chairNames = ["Sillón 1", "Sillón 2", "Sillón 3", "Sillón 4"];
    const proNames = ["Dra. Valeria Rentería", "Dr. Emilio Castañeda", "Dra. Fernanda Ibarra", "Dr. Santiago Duarte"];
    const chairIds: string[] = [];
    const proIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const chairId = await getOrCreateResource(client, orgId, "CHAIR", chairNames[i]);
      const proId = await getOrCreateResource(client, orgId, "PROFESSIONAL", proNames[i]);
      await ensureWeeklyAvailability(client, orgId, chairId);
      await ensureWeeklyAvailability(client, orgId, proId);
      chairIds.push(chairId);
      proIds.push(proId);
    }
    console.log(`   ✓ 4 sillones + 4 profesionales, disponibilidad lun–sáb 9:00–19:00`);

    // ── 4. Pacientes (40) ───────────────────────────────────────────────
    console.log("3. Pacientes (40)...");
    const patientIds: string[] = [];
    for (let i = 0; i < PATIENT_NAMES.length; i++) {
      patientIds.push(await getOrCreatePatient(client, orgId, PATIENT_NAMES[i], i));
    }
    const patientIdByName = new Map(PATIENT_NAMES.map((n, i) => [n, patientIds[i]]));
    console.log(`   ✓ ${patientIds.length} pacientes`);

    // ── 5. Limpiar citas/presupuestos/planes DEMO previos (refrescar "hoy") ──
    console.log("4. Limpiando datos DEMO previos (citas/presupuestos/planes/pagos)...");
    await run(
      client,
      `DELETE FROM payments WHERE "quoteId" IN (SELECT id FROM quotes WHERE "organizationId" = $1 AND notes LIKE $2)`,
      [orgId, `${DEMO_TAG}%`],
    );
    await run(
      client,
      `DELETE FROM quote_lines WHERE "quoteId" IN (SELECT id FROM quotes WHERE "organizationId" = $1 AND notes LIKE $2)`,
      [orgId, `${DEMO_TAG}%`],
    );
    await run(client, `DELETE FROM quotes WHERE "organizationId" = $1 AND notes LIKE $2`, [orgId, `${DEMO_TAG}%`]);
    await run(
      client,
      `DELETE FROM treatment_plan_items WHERE "planId" IN (SELECT id FROM treatment_plans WHERE "organizationId" = $1 AND notes LIKE $2)`,
      [orgId, `${DEMO_TAG}%`],
    );
    await run(client, `DELETE FROM treatment_plans WHERE "organizationId" = $1 AND notes LIKE $2`, [orgId, `${DEMO_TAG}%`]);
    await run(client, `DELETE FROM appointments WHERE "organizationId" = $1 AND reason LIKE $2`, [orgId, `${DEMO_TAG}%`]);
    console.log("   ✓");

    // ── 6. Agenda de hoy: ~23 citas repartidas en 4 sillones ────────────
    console.log("5. Agenda de hoy...");
    const chairPlans: { procKeys: (keyof typeof PROC)[] }[] = [
      { procKeys: ["EXAM", "PROPHYLAXIS", "ENDODONTICS", "RESTORATION", "CROWN", "EXAM"] },
      { procKeys: ["PROPHYLAXIS", "RESTORATION", "EXTRACTION", "ORTHODONTICS", "CROWN", "PROPHYLAXIS"] },
      { procKeys: ["ENDODONTICS", "EXAM", "RESTORATION", "ORTHODONTICS", "PROPHYLAXIS"] },
      { procKeys: ["CROWN", "PROPHYLAXIS", "EXAM", "RESTORATION", "EXTRACTION", "ORTHODONTICS"] },
    ];
    const GAP_MIN = 10;
    const slots: Slot[] = [];
    let patientCursor = 0;
    for (let chairIdx = 0; chairIdx < 4; chairIdx++) {
      let cursorMinute = 540; // 9:00
      for (const procKey of chairPlans[chairIdx].procKeys) {
        const dur = PROC[procKey].minutes;
        const startAt = atMinute(midnight, cursorMinute);
        const endAt = atMinute(midnight, cursorMinute + dur);
        const patientName = PATIENT_NAMES[patientCursor % PATIENT_NAMES.length];
        slots.push({
          chairId: chairIds[chairIdx],
          professionalId: proIds[chairIdx],
          patientId: patientIdByName.get(patientName)!,
          patientLabel: patientName,
          procKey,
          startAt,
          endAt,
        });
        patientCursor++;
        cursorMinute += dur + GAP_MIN;
      }
    }

    let noShowBudget = 2;
    let futureIdx = 0;
    for (const slot of slots) {
      let status: string;
      let completedAt: Date | null = null;
      let noShowAt: Date | null = null;
      if (slot.endAt.getTime() <= now.getTime()) {
        if (noShowBudget > 0 && Math.random() < 0.15) {
          status = "NO_SHOW";
          noShowAt = slot.startAt;
          noShowBudget--;
        } else {
          status = "COMPLETED";
          completedAt = slot.endAt;
        }
      } else if (slot.startAt.getTime() <= now.getTime()) {
        status = "CONFIRMED"; // en curso ahora mismo
      } else {
        status = futureIdx % 3 === 0 ? "SCHEDULED" : "CONFIRMED"; // mezcla confirmadas / sin confirmar
        futureIdx++;
      }

      await run(
        client,
        `INSERT INTO appointments
           ("organizationId","patientId","chairResourceId","professionalResourceId",
            "startAt","endAt","status","source","reason","createdBy","completedAt","noShowAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'MANUAL',$8,$9,$10,$11)`,
        [
          orgId, slot.patientId, slot.chairId, slot.professionalId,
          slot.startAt.toISOString(), slot.endAt.toISOString(), status,
          `${DEMO_TAG} ${PROC[slot.procKey].label}`, ownerId, completedAt?.toISOString() ?? null, noShowAt?.toISOString() ?? null,
        ],
      );
    }
    console.log(`   ✓ ${slots.length} citas hoy en 4 sillones`);

    // ── 7. Presupuestos (10, estados y montos variados) ─────────────────
    console.log("6. Presupuestos...");
    interface QuoteSeed {
      patient: string;
      status: "DRAFT" | "PROPOSED" | "ACCEPTED" | "REJECTED";
      description: string;
      procedureType: keyof typeof PROC | null;
      toothFdi: number | null;
      quantity: number;
      unitPriceCents: number;
      createdDaysAgo: number; // dentro del mes salvo que se indique "aged"
      aged?: boolean; // >90 días — cartera vencida
      payments?: { amountCents: number; method: "CASH" | "CARD" | "TRANSFER"; daysAgo: number; aged?: boolean }[];
    }
    const quoteSeeds: QuoteSeed[] = [
      { patient: "Regina Cárdenas Ortiz", status: "DRAFT", description: "Limpieza dental profunda", procedureType: "PROPHYLAXIS", toothFdi: null, quantity: 1, unitPriceCents: 320000, createdDaysAgo: 1 },
      { patient: "Lucía Bernal Ramírez", status: "DRAFT", description: "Resina dental (3 piezas)", procedureType: "RESTORATION", toothFdi: null, quantity: 1, unitPriceCents: 450000, createdDaysAgo: 2 },
      { patient: "Iván Robledo Torres", status: "PROPOSED", description: "Endodoncia + restauración", procedureType: "ENDODONTICS", toothFdi: 36, quantity: 1, unitPriceCents: 1280000, createdDaysAgo: 4 },
      { patient: "Carlos Reyes Cortés", status: "REJECTED", description: "Corona porcelana pieza 46", procedureType: "CROWN", toothFdi: 46, quantity: 1, unitPriceCents: 950000, createdDaysAgo: 15 },
      {
        patient: "Marco Ordaz Ibarra", status: "ACCEPTED", description: "Tratamiento de ortodoncia completo",
        procedureType: "ORTHODONTICS", toothFdi: null, quantity: 1, unitPriceCents: 9000000, createdDaysAgo: 18,
        payments: [{ amountCents: 9000000, method: "CARD", daysAgo: 2 }],
      },
      {
        patient: "Daniela Ponce Salazar", status: "ACCEPTED", description: "Implante dental + corona",
        procedureType: "CROWN", toothFdi: 26, quantity: 1, unitPriceCents: 8500000, createdDaysAgo: 20,
        payments: [{ amountCents: 8500000, method: "TRANSFER", daysAgo: 6 }],
      },
      {
        patient: "Sofía Nájera Duarte", status: "ACCEPTED", description: "3 coronas porcelana",
        procedureType: "CROWN", toothFdi: null, quantity: 3, unitPriceCents: 2600000, createdDaysAgo: 22,
        payments: [{ amountCents: 7800000, method: "CASH", daysAgo: 9 }],
      },
      {
        patient: "Jorge Lomelí Castro", status: "ACCEPTED", description: "Puente dental 3 piezas",
        procedureType: "ENDODONTICS", toothFdi: null, quantity: 1, unitPriceCents: 8200000, createdDaysAgo: 25,
        payments: [
          { amountCents: 4000000, method: "CARD", daysAgo: 12 },
          { amountCents: 1740000, method: "CASH", daysAgo: 3 },
        ],
      },
      {
        patient: "Héctor Sáenz Molina", status: "ACCEPTED", description: "Ortodoncia — plan completo",
        procedureType: "ORTHODONTICS", toothFdi: null, quantity: 1, unitPriceCents: 6500000, createdDaysAgo: 130, aged: true,
        payments: [],
      },
      {
        patient: "Andrea Guerrero Peña", status: "ACCEPTED", description: "Implante unitario",
        procedureType: "CROWN", toothFdi: 14, quantity: 1, unitPriceCents: 4800000, createdDaysAgo: 108, aged: true,
        payments: [{ amountCents: 720000, method: "TRANSFER", daysAgo: 105, aged: true }],
      },
    ];

    let cobradoEsteMesCents = 0;
    for (const q of quoteSeeds) {
      const patientId = patientIdByName.get(q.patient);
      if (!patientId) throw new Error(`Paciente de presupuesto no encontrado: ${q.patient}`);
      const subtotal = q.unitPriceCents * q.quantity;
      const createdAt = q.aged ? daysAgo(now, q.createdDaysAgo) : daysAgoWithinMonth(now, q.createdDaysAgo);
      const proposedAt = q.status === "DRAFT" ? null : createdAt;
      const acceptedAt = q.status === "ACCEPTED" ? createdAt : null;
      const rejectedAt = q.status === "REJECTED" ? createdAt : null;

      const quote = await row<{ id: string }>(
        client,
        `INSERT INTO quotes
           ("organizationId","patientId","status","currency","subtotalCents","discountTotalCents",
            "taxTotalCents","totalCents","notes","createdBy","createdAt","proposedAt","acceptedAt","rejectedAt")
         VALUES ($1,$2,$3,'MXN',$4,0,0,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          orgId, patientId, q.status, subtotal, `${DEMO_TAG} datos de demostración`, ownerId,
          createdAt.toISOString(), proposedAt?.toISOString() ?? null, acceptedAt?.toISOString() ?? null, rejectedAt?.toISOString() ?? null,
        ],
      );
      const quoteId = quote!.id;

      await run(
        client,
        `INSERT INTO quote_lines
           ("organizationId","quoteId","description","procedureType","toothFdi","quantity",
            "unitPriceCents","discountCents","taxRateBps","subtotalCents","taxCents","totalCents","currency")
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,0,$8,'MXN')`,
        [orgId, quoteId, q.description, q.procedureType, q.toothFdi, q.quantity, q.unitPriceCents, subtotal],
      );

      for (const p of q.payments ?? []) {
        const paidAt = p.aged ? daysAgo(now, p.daysAgo) : daysAgoWithinMonth(now, p.daysAgo);
        await run(
          client,
          `INSERT INTO payments
             ("organizationId","quoteId","patientId","entryKind","amountCents","method","recordedByUserId","paidAt")
           VALUES ($1,$2,$3,'PAYMENT',$4,$5,$6,$7)`,
          [orgId, quoteId, patientId, p.amountCents, p.method, ownerId, paidAt.toISOString()],
        );
        if (!p.aged) cobradoEsteMesCents += p.amountCents;
      }
    }
    console.log(`   ✓ ${quoteSeeds.length} presupuestos · cobrado este mes ≈ $${(cobradoEsteMesCents / 100).toLocaleString("en-US")} MXN`);

    // ── 8. Planes de tratamiento DRAFT (para ESPERAN TU FIRMA) ──────────
    console.log("7. Planes de tratamiento (DRAFT)...");
    const planSeeds: { patient: string; items: { procedureType: keyof typeof PROC; toothFdi: number | null }[] }[] = [
      { patient: "Ricardo Domínguez Farías", items: [{ procedureType: "ENDODONTICS", toothFdi: 36 }, { procedureType: "CROWN", toothFdi: 36 }] },
      { patient: "Ximena Zamora Espinoza", items: [{ procedureType: "ORTHODONTICS", toothFdi: null }] },
    ];
    for (const p of planSeeds) {
      const patientId = patientIdByName.get(p.patient);
      if (!patientId) throw new Error(`Paciente de plan no encontrado: ${p.patient}`);
      const plan = await row<{ id: string }>(
        client,
        `INSERT INTO treatment_plans ("organizationId","patientId","status","notes","createdBy")
         VALUES ($1,$2,'DRAFT',$3,$4) RETURNING id`,
        [orgId, patientId, `${DEMO_TAG} datos de demostración`, ownerId],
      );
      let seq = 0;
      for (const item of p.items) {
        await run(
          client,
          `INSERT INTO treatment_plan_items
             ("organizationId","planId","toothFdi","procedureType","status","sequence","createdBy")
           VALUES ($1,$2,$3,$4,'PROPOSED',$5,$6)`,
          [orgId, plan!.id, item.toothFdi, item.procedureType, seq, ownerId],
        );
        seq++;
      }
    }
    console.log(`   ✓ ${planSeeds.length} planes DRAFT`);

    // ── 9. Configuración financiera del mes en curso ────────────────────
    console.log("8. Configuración financiera del mes...");
    const nowMx = new Date();
    const [yearStr, monthStr] = nowMx.toLocaleDateString("en-CA", { timeZone: TZ }).split("-");
    const periodYear = Number(yearStr);
    const periodMonth = Number(monthStr);
    await run(
      client,
      `INSERT INTO organization_finance_periods
         ("organizationId","periodYear","periodMonth","monthlyGoalCents",
          "fixedCostRentCents","fixedCostPayrollCents","fixedCostUtilitiesCents","fixedCostSuppliesCents")
       VALUES ($1,$2,$3,75000000,4500000,18000000,1200000,2800000)
       ON CONFLICT ("organizationId","periodYear","periodMonth") DO UPDATE SET
         "monthlyGoalCents" = EXCLUDED."monthlyGoalCents",
         "fixedCostRentCents" = EXCLUDED."fixedCostRentCents",
         "fixedCostPayrollCents" = EXCLUDED."fixedCostPayrollCents",
         "fixedCostUtilitiesCents" = EXCLUDED."fixedCostUtilitiesCents",
         "fixedCostSuppliesCents" = EXCLUDED."fixedCostSuppliesCents",
         "updatedAt" = now()`,
      [orgId, periodYear, periodMonth],
    );
    console.log(`   ✓ meta $750,000 · costos fijos $265,000 (periodo ${periodYear}-${String(periodMonth).padStart(2, "0")})`);

    await client.query("COMMIT");
    console.log("\n✅ Seed de clínica demo completado.\n");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("\n❌ ROLLBACK — ningún dato fue modificado.");
    throw e;
  } finally {
    client.release();
    await adminPool.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
