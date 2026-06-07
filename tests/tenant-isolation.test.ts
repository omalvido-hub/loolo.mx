// NELZZON — Prueba de aislamiento multi-tenant y garantías de la columna vertebral.
// Corre como app_user (SIN bypass) contra el Postgres real con RLS + FORCE activos.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, userPool, forTenantPg, asUserNoTenant, closePools } from "./harness.js";
import { planInboundMessage } from "../src/server/domain/conversations/receive-inbound.js";
import { validateEvent } from "../src/server/domain/events/schemas.js";

let orgA: string;
let orgB: string;
let contactA: string;
let contactB: string;

const rnd = () => Math.random().toString(36).slice(2, 8);

beforeAll(async () => {
  // Crear dos organizaciones aisladas (admin = bypass).
  const sa = rnd(), sb = rnd();
  orgA = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ('Org A','a-${sa}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(
    `INSERT INTO "organizations"("name","slug") VALUES ('Org B','b-${sb}') RETURNING id`)).rows[0].id;
  contactA = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'Paciente A') RETURNING id`, [orgA])).rows[0].id;
  contactB = (await adminPool.query(
    `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'Paciente B') RETURNING id`, [orgB])).rows[0].id;
});

afterAll(async () => { await closePools(); });

describe("Aislamiento multi-tenant (RLS)", () => {
  it("1. Lectura aislada: A solo ve sus propios contactos", async () => {
    const rows = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT "organizationId" FROM "contacts"`)).rows);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.organizationId === orgA)).toBe(true);
    expect(rows.some((r) => r.organizationId === orgB)).toBe(false);
  });

  it("2. Acceso directo por id ajeno: A no puede leer el contacto de B", async () => {
    const rows = await forTenantPg(orgA, async (c) =>
      (await c.query(`SELECT id FROM "contacts" WHERE id=$1`, [contactB])).rows);
    expect(rows.length).toBe(0);
  });

  it("3. Escritura cruzada (INSERT): A no puede crear filas marcadas como de B", async () => {
    await expect(
      forTenantPg(orgA, async (c) =>
        c.query(`INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'intruso')`, [orgB])),
    ).rejects.toThrow(/row-level security/i);
  });

  it("4. Escritura cruzada (UPDATE): A no puede modificar el contacto de B", async () => {
    const res = await forTenantPg(orgA, async (c) =>
      c.query(`UPDATE "contacts" SET "fullName"='hackeado' WHERE id=$1`, [contactB]));
    expect(res.rowCount).toBe(0); // RLS oculta la fila → 0 afectadas
    // Confirmar que B sigue intacto (visto desde B)
    const b = await forTenantPg(orgB, async (c) =>
      (await c.query(`SELECT "fullName" FROM "contacts" WHERE id=$1`, [contactB])).rows[0]);
    expect(b.fullName).toBe("Paciente B");
  });

  it("5. Fail-closed: sin contexto de tenant no se ve ninguna fila", async () => {
    const rows = await asUserNoTenant(async (c) =>
      (await c.query(`SELECT id FROM "contacts"`)).rows);
    expect(rows.length).toBe(0);
  });

  it("6. Append-only: audit_logs y events no admiten UPDATE/DELETE para app_user", async () => {
    const auditId = await forTenantPg(orgA, async (c) =>
      (await c.query(
        `INSERT INTO "audit_logs"("organizationId","action","entityType") VALUES ($1,'x','y') RETURNING id`,
        [orgA])).rows[0].id);
    await expect(forTenantPg(orgA, async (c) =>
      c.query(`UPDATE "audit_logs" SET "action"='tampered' WHERE id=$1`, [auditId])),
    ).rejects.toThrow(/permission denied/i);
    await expect(forTenantPg(orgA, async (c) =>
      c.query(`DELETE FROM "audit_logs" WHERE id=$1`, [auditId])),
    ).rejects.toThrow(/permission denied/i);
  });

  it("7. Tablas de Better Auth no están expuestas al rol runtime", async () => {
    await expect(forTenantPg(orgA, async (c) =>
      c.query(`SELECT id FROM "users"`)),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("Reglas de dominio del flujo de entrada", () => {
  it("8a. Mensaje entrante NO crea paciente ni oportunidad (reglas 7 y 9)", async () => {
    const channel = await forTenantPg(orgA, async (c) =>
      (await c.query(
        `INSERT INTO "channels"("organizationId","type","identifier") VALUES ($1,'WEB','web-1') RETURNING id`,
        [orgA])).rows[0]);

    const plan = planInboundMessage({
      organizationId: orgA, channelId: channel.id, channelType: "WEB",
      fromIdentifier: "visitante-1", body: "¿Cuánto cuesta una limpieza?",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.createsPatient).toBe(false);
    expect(plan.value.createsOpportunity).toBe(false);

    await forTenantPg(orgA, async (c) => {
      const contact = (await c.query(
        `INSERT INTO "contacts"("organizationId","source","state") VALUES ($1,'WEB',$2) RETURNING id`,
        [orgA, plan.value.contactState])).rows[0];
      await c.query(
        `INSERT INTO "conversations"("organizationId","channelId","contactId") VALUES ($1,$2,$3)`,
        [orgA, channel.id, contact.id]);
    });

    const counts = await forTenantPg(orgA, async (c) => ({
      patients: Number((await c.query(`SELECT count(*) FROM "patients"`)).rows[0].count),
      opportunities: Number((await c.query(`SELECT count(*) FROM "opportunities"`)).rows[0].count),
    }));
    expect(counts.patients).toBe(0);
    expect(counts.opportunities).toBe(0);
  });

  it("8b. Mensaje sin canal → MISSING_DATA, no se inventa (regla 13)", () => {
    const plan = planInboundMessage({
      organizationId: orgA, channelId: null, channelType: null,
      fromIdentifier: "x", body: "hola",
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("MISSING_DATA");
  });

  it("8c. Eventos: payload inválido NO se emite (regla 21)", () => {
    const bad = validateEvent("conversation.received", { foo: "bar" });
    expect(bad.ok).toBe(false);
    const good = validateEvent("contact.created", {
      contactId: "00000000-0000-0000-0000-000000000000", source: "WHATSAPP",
    });
    expect(good.ok).toBe(true);
  });
});
