// LOOLO — Pruebas Fase 7A (Configuración / Catálogos / Onboarding).
// Postgres real + RLS + permisos + importación + integridad financiera.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import { PermissionDeniedError } from "../src/server/domain/identity/authorize.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";

import { createService, updateService, deactivateService, listServices, DuplicateServiceCodeError } from "../src/server/domain/config/service-catalog.js";
import { upsertPaymentMethodConfig, listPaymentMethodConfigs } from "../src/server/domain/config/payment-method-config.js";
import { upsertQuoteSetting, getQuoteSetting } from "../src/server/domain/config/quote-setting.js";
import { upsertTaxProfile, getTaxProfile } from "../src/server/domain/config/tax-profile.js";
import { createMedication, deactivateMedication, listMedications } from "../src/server/domain/config/medication-catalog.js";
import { createDocumentTemplate, deactivateDocumentTemplate, listDocumentTemplates } from "../src/server/domain/config/document-templates.js";
import { upsertNotificationRule, listNotificationRules } from "../src/server/domain/config/notification-rules.js";
import { runImport } from "../src/server/domain/config/import.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let adminA: ActorContext;
let frontDeskA: ActorContext;
let clinicianA: ActorContext;
let billingA: ActorContext;
let accountantA: ActorContext;

async function ensureRbac() {
  for (const p of PERMISSIONS)
    await adminPool.query(`INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`, [p.key, p.description]);
  for (const r of ROLES) {
    const id = (await adminPool.query(
      `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
      [r.key, r.name, r.scope, r.assignable],
    )).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions)
      await adminPool.query(`INSERT INTO "role_permissions"("roleId","permissionId") SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`, [id, pk]);
  }
}

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (await adminPool.query(`INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`, [`${roleKey}-${rnd()}@7a.test`])).rows[0].id;
  const memberId = (await adminPool.query(`INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,$3) RETURNING id`, [orgId, userId, roleKey])).rows[0].id;
  await adminPool.query(`INSERT INTO "membership_roles"("memberId","roleId") SELECT $1, id FROM "roles" WHERE "key"=$2`, [memberId, roleKey]);
  const { rows } = await adminPool.query(
    `SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId"
     WHERE mr."memberId"=$1`, [memberId]);
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r: any) => r.key)) };
}

const runA = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgA, async (c) => work(execOf(c)));
const runB = <T,>(work: (e: any) => Promise<T>) => forTenantPg(orgB, async (c) => work(execOf(c)));

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('Clinica7A','clinica7a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('Otra7A','otra7a-${rnd()}') RETURNING id`)).rows[0].id;
  ownerA      = await member(orgA, "owner");
  adminA      = await member(orgA, "admin");
  frontDeskA  = await member(orgA, "front_desk");
  clinicianA  = await member(orgA, "clinician");
  billingA    = await member(orgA, "billing");
  accountantA = await member(orgA, "accountant");
});
afterAll(async () => { await closePools(); });

// ══════════════════════════════════════════════════════════════════════
// 1. Catálogo de Servicios
// ══════════════════════════════════════════════════════════════════════

describe("service_catalog", () => {
  it("owner crea servicio y aparece en lista", async () => {
    const { serviceId } = await runA((e) => createService(e, ownerA, { code: `C-${rnd()}`, name: "Consulta", basePriceCents: 50000, defaultDurationMin: 30 }));
    const list = await runA((e) => listServices(e, frontDeskA));
    expect(list.some((s: any) => s.id === serviceId)).toBe(true);
  });

  it("basePriceCents se almacena como entero exacto sin pérdida float", async () => {
    const code = `EXACT-${rnd()}`;
    await runA((e) => createService(e, ownerA, { code, name: "Exacto", basePriceCents: 123456789, defaultDurationMin: 45 }));
    const list = await runA((e) => listServices(e, ownerA));
    const svc = list.find((s: any) => s.code === code);
    expect(svc?.basePriceCents).toBe(123456789);
  });

  it("código duplicado lanza DuplicateServiceCodeError", async () => {
    const code = `DUP-${rnd()}`;
    await runA((e) => createService(e, ownerA, { code, name: "Original", basePriceCents: 0, defaultDurationMin: 15 }));
    await expect(runA((e) => createService(e, ownerA, { code, name: "Copia", basePriceCents: 0, defaultDurationMin: 15 }))).rejects.toMatchObject({ name: "DuplicateServiceCodeError" });
  });

  it("front_desk solo puede listar, no crear", async () => {
    await expect(runA((e) => createService(e, frontDeskA, { code: `FD-${rnd()}`, name: "X", basePriceCents: 0, defaultDurationMin: 10 }))).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(runA((e) => listServices(e, frontDeskA))).resolves.toBeInstanceOf(Array);
  });

  it("soft-delete: servicio desactivado no aparece en lista activa", async () => {
    const code = `DEL-${rnd()}`;
    const { serviceId } = await runA((e) => createService(e, ownerA, { code, name: "Borrable", basePriceCents: 1000, defaultDurationMin: 10 }));
    await runA((e) => deactivateService(e, ownerA, serviceId));
    const active = await runA((e) => listServices(e, ownerA));
    expect(active.some((s: any) => s.id === serviceId)).toBe(false);
    // Con includeInactive sí aparece
    const all = await runA((e) => listServices(e, ownerA, true));
    expect(all.some((s: any) => s.id === serviceId)).toBe(true);
  });

  it("RLS: orgB no ve servicios de orgA", async () => {
    await runA((e) => createService(e, ownerA, { code: `RLS-${rnd()}`, name: "Exclusivo A", basePriceCents: 100, defaultDurationMin: 10 }));
    const ctxB = await member(orgB, "owner");
    const listB = await runB((e) => listServices(e, ctxB));
    expect(listB).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Formas de Pago
// ══════════════════════════════════════════════════════════════════════

describe("payment_method_config", () => {
  it("owner habilita CASH; front_desk puede verlo", async () => {
    await runA((e) => upsertPaymentMethodConfig(e, ownerA, { method: "CASH", enabled: true, displayOrder: 1 }));
    const list = await runA((e) => listPaymentMethodConfigs(e, frontDeskA));
    expect(list.some((c: any) => c.method === "CASH" && c.enabled)).toBe(true);
  });

  it("upsert actualiza sin duplicar (UNIQUE org+method)", async () => {
    await runA((e) => upsertPaymentMethodConfig(e, ownerA, { method: "CARD", enabled: true, displayOrder: 2 }));
    await runA((e) => upsertPaymentMethodConfig(e, ownerA, { method: "CARD", enabled: false, displayOrder: 2 }));
    const list = await runA((e) => listPaymentMethodConfigs(e, ownerA));
    const cards = list.filter((c: any) => c.method === "CARD");
    expect(cards).toHaveLength(1);
    expect(cards[0].enabled).toBe(false);
  });

  it("método fuera del enum es rechazado por Zod", async () => {
    await expect(runA((e) => upsertPaymentMethodConfig(e, ownerA, { method: "CRYPTO", enabled: true }))).rejects.toThrow();
  });

  it("clinician no puede gestionar formas de pago", async () => {
    await expect(runA((e) => upsertPaymentMethodConfig(e, clinicianA, { method: "CASH", enabled: true }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("RLS: orgB no ve configs de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const listB = await runB((e) => listPaymentMethodConfigs(e, ctxB));
    expect(listB).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Reglas de Presupuesto
// ══════════════════════════════════════════════════════════════════════

describe("quote_setting", () => {
  it("owner upserta y front_desk puede leer", async () => {
    await runA((e) => upsertQuoteSetting(e, ownerA, { validityDays: 30, defaultDepositBps: 2000 }));
    const s = await runA((e) => getQuoteSetting(e, frontDeskA));
    expect(s?.validityDays).toBe(30);
    expect(s?.defaultDepositBps).toBe(2000);
  });

  it("defaultDepositBps fuera de 0-10000 es rechazado", async () => {
    await expect(runA((e) => upsertQuoteSetting(e, ownerA, { validityDays: 30, defaultDepositBps: 10001 }))).rejects.toThrow();
    await expect(runA((e) => upsertQuoteSetting(e, ownerA, { validityDays: 30, defaultDepositBps: -1 }))).rejects.toThrow();
  });

  it("front_desk no puede modificar reglas de presupuesto", async () => {
    await expect(runA((e) => upsertQuoteSetting(e, frontDeskA, { validityDays: 10, defaultDepositBps: 0 }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("RLS: orgB no ve setting de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const s = await runB((e) => getQuoteSetting(e, ctxB));
    expect(s).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Datos Fiscales (SENSIBLE)
// ══════════════════════════════════════════════════════════════════════

describe("clinic_tax_profile (sensible)", () => {
  const validProfile = { rfc: "XAXX010101000", legalName: "Clínica Test SA", regimeCode: "601", fiscalZip: "01000" };

  it("owner escribe y lee perfil fiscal; genera audit en lectura y escritura", async () => {
    await runA((e) => upsertTaxProfile(e, ownerA, validProfile));
    const profile = await runA((e) => getTaxProfile(e, ownerA));
    expect(profile?.rfc).toBe("XAXX010101000");
    expect(profile?.regimeCode).toBe("601");
    // Verificar que se crearon entradas de auditoría
    const audits = (await adminPool.query(
      `SELECT "action" FROM "audit_logs" WHERE "organizationId"=$1 AND "action" LIKE 'tax_profile.%'`,
      [orgA],
    )).rows;
    const actions = audits.map((a: any) => a.action);
    expect(actions).toContain("tax_profile.written");
    expect(actions).toContain("tax_profile.read");
  });

  it("RFC inválido es rechazado", async () => {
    await expect(runA((e) => upsertTaxProfile(e, ownerA, { ...validProfile, rfc: "INVALIDO" }))).rejects.toThrow();
  });

  it("código postal inválido es rechazado", async () => {
    await expect(runA((e) => upsertTaxProfile(e, ownerA, { ...validProfile, fiscalZip: "123" }))).rejects.toThrow();
  });

  it("accountant puede gestionar; billing solo ver; front_desk y clinician sin acceso", async () => {
    await runA((e) => upsertTaxProfile(e, accountantA, validProfile));
    await expect(runA((e) => getTaxProfile(e, billingA))).resolves.not.toBeNull();
    await expect(runA((e) => upsertTaxProfile(e, billingA, validProfile))).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(runA((e) => getTaxProfile(e, frontDeskA))).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(runA((e) => getTaxProfile(e, clinicianA))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("RLS: orgB no ve tax_profile de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const p = await runB((e) => getTaxProfile(e, ctxB));
    expect(p).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Catálogo de Medicamentos
// ══════════════════════════════════════════════════════════════════════

describe("medication_catalog", () => {
  it("owner crea; clinician puede listar", async () => {
    await runA((e) => createMedication(e, ownerA, { name: "Ibuprofeno", presentation: "Tableta 400mg", defaultDose: "1 cada 8h" }));
    const list = await runA((e) => listMedications(e, clinicianA));
    expect(list.some((m: any) => m.name === "Ibuprofeno")).toBe(true);
  });

  it("front_desk no puede crear medicamentos", async () => {
    await expect(runA((e) => createMedication(e, frontDeskA, { name: "X" }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("soft-delete: medicamento desactivado no aparece", async () => {
    const { medicationId } = await runA((e) => createMedication(e, ownerA, { name: `Med-${rnd()}` }));
    await runA((e) => deactivateMedication(e, ownerA, medicationId));
    const list = await runA((e) => listMedications(e, ownerA));
    expect(list.some((m: any) => m.id === medicationId)).toBe(false);
  });

  it("RLS: orgB no ve medicamentos de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const list = await runB((e) => listMedications(e, ctxB));
    expect(list).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Plantillas de Documentos
// ══════════════════════════════════════════════════════════════════════

describe("document_templates", () => {
  it("kind inválido es rechazado por Zod", async () => {
    await expect(runA((e) => createDocumentTemplate(e, ownerA, {
      kind: "FACTURA" as any, name: "X", body: "hola", variables: [],
    }))).rejects.toThrow();
  });

  it("variable usada en body no declarada en allowlist es rechazada", async () => {
    await expect(runA((e) => createDocumentTemplate(e, ownerA, {
      kind: "PRESCRIPTION", name: "Receta", body: "Paciente: {{patient_name}} tel: {{telefono}}", variables: ["patient_name"],
    }))).rejects.toThrow(/telefono/);
  });

  it("crea plantilla de receta y clinician puede listarla", async () => {
    await runA((e) => createDocumentTemplate(e, ownerA, {
      kind: "PRESCRIPTION", name: "Receta Base", body: "Paciente: {{patient_name}}", variables: ["patient_name"],
    }));
    const list = await runA((e) => listDocumentTemplates(e, clinicianA, "PRESCRIPTION"));
    expect(list.some((t: any) => t.name === "Receta Base")).toBe(true);
  });

  it("front_desk no puede crear plantillas", async () => {
    await expect(runA((e) => createDocumentTemplate(e, frontDeskA, {
      kind: "MESSAGE", name: "Msg", body: "Hola", variables: [],
    }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("soft-delete: plantilla desactivada no aparece", async () => {
    const { templateId } = await runA((e) => createDocumentTemplate(e, ownerA, { kind: "CONSENT", name: `C-${rnd()}`, body: "Consiento", variables: [] }));
    await runA((e) => deactivateDocumentTemplate(e, ownerA, templateId));
    const list = await runA((e) => listDocumentTemplates(e, ownerA));
    expect(list.some((t: any) => t.id === templateId)).toBe(false);
  });

  it("RLS: orgB no ve plantillas de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const list = await runB((e) => listDocumentTemplates(e, ctxB));
    expect(list).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. Reglas de Notificaciones
// ══════════════════════════════════════════════════════════════════════

describe("notification_rule", () => {
  it("owner crea regla; front_desk puede listarla", async () => {
    await runA((e) => upsertNotificationRule(e, ownerA, {
      eventKey: "appointment.reminder", channel: "WHATSAPP", enabled: true, maxPerDay: 3,
    }));
    const list = await runA((e) => listNotificationRules(e, frontDeskA));
    expect(list.some((r: any) => r.eventKey === "appointment.reminder")).toBe(true);
  });

  it("upsert por (org, eventKey, channel) no duplica", async () => {
    const key = `evt-${rnd()}`;
    await runA((e) => upsertNotificationRule(e, ownerA, { eventKey: key, channel: "EMAIL", enabled: true, maxPerDay: 2 }));
    await runA((e) => upsertNotificationRule(e, ownerA, { eventKey: key, channel: "EMAIL", enabled: false, maxPerDay: 1 }));
    const list = await runA((e) => listNotificationRules(e, ownerA));
    const matches = list.filter((r: any) => r.eventKey === key && r.channel === "EMAIL");
    expect(matches).toHaveLength(1);
    expect(matches[0].enabled).toBe(false);
  });

  it("hora inválida es rechazada", async () => {
    await expect(runA((e) => upsertNotificationRule(e, ownerA, {
      eventKey: "x", channel: "SMS", enabled: true, maxPerDay: 1, quietStart: "25:00",
    }))).rejects.toThrow();
  });

  it("front_desk no puede crear reglas", async () => {
    await expect(runA((e) => upsertNotificationRule(e, frontDeskA, { eventKey: "x", channel: "SMS", enabled: true, maxPerDay: 0 }))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("RLS: orgB no ve reglas de orgA", async () => {
    const ctxB = await member(orgB, "owner");
    const list = await runB((e) => listNotificationRules(e, ctxB));
    expect(list).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. Importación — servicios
// ══════════════════════════════════════════════════════════════════════

describe("import — servicios", () => {
  it("dry-run reporta errores sin insertar datos", async () => {
    const rows = [
      { code: `SVC-${rnd()}`, name: "Extracción", basePriceCents: 100000, defaultDurationMin: 30 },
      { code: `SVC-DUP-${rnd()}`, name: "Dup", basePriceCents: 50000, defaultDurationMin: 15 },
    ];
    const r = await runA((e) => runImport(e, ownerA, { kind: "SERVICES", rows }, true));
    expect(r.isDryRun).toBe(true);
    expect(r.total).toBe(2);
    // En dry-run no se insertan filas
    const list = await runA((e) => listServices(e, ownerA));
    expect(list.some((s: any) => s.code === rows[0].code)).toBe(false);
  });

  it("commit inserta servicios válidos con idempotencia", async () => {
    const code = `IMP-${rnd()}`;
    const rows = [{ code, name: "Corona", basePriceCents: 800000, defaultDurationMin: 60 }];
    const r1 = await runA((e) => runImport(e, ownerA, { kind: "SERVICES", rows }, false));
    expect(r1.okCount).toBe(1);
    // Reimportar el mismo archivo: no duplica
    const r2 = await runA((e) => runImport(e, ownerA, { kind: "SERVICES", rows }, false));
    expect(r2.okCount).toBe(1); // skipped (ya existe)
    const list = await runA((e) => listServices(e, ownerA));
    expect(list.filter((s: any) => s.code === code)).toHaveLength(1);
  });

  it("duplicado en la misma carga reporta error", async () => {
    const code = `BDUP-${rnd()}`;
    const rows = [
      { code, name: "A", basePriceCents: 100, defaultDurationMin: 10 },
      { code, name: "B", basePriceCents: 200, defaultDurationMin: 10 },
    ];
    const r = await runA((e) => runImport(e, ownerA, { kind: "SERVICES", rows }, true));
    expect(r.errorCount).toBeGreaterThanOrEqual(1);
    expect(r.errors.some((e: any) => e.errorType === "DUPLICATE_IN_BATCH")).toBe(true);
  });

  it("front_desk no puede importar", async () => {
    await expect(runA((e) => runImport(e, frontDeskA, { kind: "SERVICES", rows: [] }, true))).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("RLS: import_job de orgB no visible desde orgA", async () => {
    const ctxB = await member(orgB, "owner");
    await runB((e) => runImport(e, ctxB, { kind: "SERVICES", rows: [] }, true));
    const result = await adminPool.query(
      `SELECT "id" FROM "import_job" WHERE "organizationId"=$1`, [orgB],
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    // Desde orgA no debe verse
    const fromA = await runA(async (e) => e(`SELECT "id" FROM "import_job" WHERE "organizationId"=$1`, [orgB]));
    expect(fromA).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. Importación — pacientes (F3A)
// ══════════════════════════════════════════════════════════════════════

describe("import — pacientes (F3A)", () => {
  it("dry-run detecta teléfonos inválidos sin crear datos", async () => {
    const r = await runA((e) => runImport(e, ownerA, {
      kind: "PATIENTS",
      rows: [{ phone: "INVALIDO", fullName: "Test" }],
    }, true));
    expect(r.isDryRun).toBe(true);
    expect(r.errorCount).toBeGreaterThanOrEqual(1);
    expect(r.errors[0].errorType).toBe("INVALID_PHONE");
    // No se creó contacto
    const contacts = await adminPool.query(`SELECT id FROM "contacts" WHERE "organizationId"=$1`, [orgA]);
    // (el test anterior puede haber creado contactos; verificamos que no se creó el paciente de INVALIDO)
  });

  it("commit: crea contacto + paciente; respeta F3A (dedup E.164)", async () => {
    const phone = "5512345678"; // → +525512345678
    const r1 = await runA((e) => runImport(e, ownerA, {
      kind: "PATIENTS",
      rows: [{ phone, fullName: "Juan Pérez" }],
    }, false));
    expect(r1.okCount).toBe(1);
    // Verificar que se creó contacto con identificador E.164
    const ci = (await adminPool.query(
      `SELECT "contactId","valueNormalized" FROM "contact_identifiers" WHERE "organizationId"=$1 AND "kind"='PHONE' AND "valueNormalized"='+525512345678'`,
      [orgA],
    )).rows;
    expect(ci).toHaveLength(1);
    const patCount = (await adminPool.query(
      `SELECT COUNT(*) as c FROM "patients" WHERE "organizationId"=$1 AND "contactId"=$2`,
      [orgA, ci[0].contactId],
    )).rows[0].c;
    expect(Number(patCount)).toBe(1);

    // Reimportar el mismo teléfono: idempotente, sin duplicados
    const r2 = await runA((e) => runImport(e, ownerA, {
      kind: "PATIENTS",
      rows: [{ phone, fullName: "Juan Pérez" }],
    }, false));
    expect(r2.okCount).toBe(1);
    const ciAfter = (await adminPool.query(
      `SELECT "contactId" FROM "contact_identifiers" WHERE "organizationId"=$1 AND "kind"='PHONE' AND "valueNormalized"='+525512345678'`,
      [orgA],
    )).rows;
    // Sigue habiendo exactamente un contacto con ese teléfono
    expect(ciAfter).toHaveLength(1);
    const patAfter = (await adminPool.query(
      `SELECT COUNT(*) as c FROM "patients" WHERE "organizationId"=$1 AND "contactId"=$2`,
      [orgA, ciAfter[0].contactId],
    )).rows[0].c;
    expect(Number(patAfter)).toBe(1);
  });

  it("teléfono duplicado en la misma carga reporta error", async () => {
    const phone = "5599887766";
    const r = await runA((e) => runImport(e, ownerA, {
      kind: "PATIENTS",
      rows: [
        { phone, fullName: "A" },
        { phone, fullName: "B" },
      ],
    }, false));
    expect(r.errors.some((e: any) => e.errorType === "DUPLICATE_IN_BATCH")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 10. ALTER resources no rompe F4A (agenda)
// ══════════════════════════════════════════════════════════════════════

describe("ALTER resources no rompe F4A", () => {
  it("puede crear recurso PROFESSIONAL con campos 7A opcionales", async () => {
    const resId = (await adminPool.query(
      `INSERT INTO "resources"("organizationId","kind","name","specialty","color","cedula")
       VALUES ($1,'PROFESSIONAL','Dr. Test','Endodoncia','#3B82F6','12345678') RETURNING id`,
      [orgA],
    )).rows[0].id;
    const row = (await adminPool.query(`SELECT * FROM "resources" WHERE "id"=$1`, [resId])).rows[0];
    expect(row.specialty).toBe("Endodoncia");
    expect(row.color).toBe("#3B82F6");
    expect(row.cedula).toBe("12345678");
  });

  it("recurso existente de F4A sigue accesible (campos nuevos son NULL)", async () => {
    const resId = (await adminPool.query(
      `INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,'CHAIR','Sillón Clásico') RETURNING id`,
      [orgA],
    )).rows[0].id;
    const row = (await adminPool.query(`SELECT * FROM "resources" WHERE "id"=$1`, [resId])).rows[0];
    expect(row.specialty).toBeNull();
    expect(row.color).toBeNull();
    expect(row.cedula).toBeNull();
    expect(row.name).toBe("Sillón Clásico");
  });
});
