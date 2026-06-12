// NELZZON — Pruebas Fase 1J-B (datos enriquecidos de próxima/última cita en Ficha Viva).
// Postgres real + RLS + permisos. Solo datos/schema — sin UI.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { resolvePatientLiveRecord } from "../src/server/domain/patient-record/resolver.js";

const rnd = () => Math.random().toString(36).slice(2, 8);
const execOf = (c: any) => (t: string, p: unknown[]) => c.query(t, p).then((r: any) => r.rows);

let orgA: string;
let ownerA: ActorContext;
let ownerNoResourcesA: ActorContext;

let patientWithApptsId: string;
let patientNoApptsId: string;
let professionalResourceId: string;
let chairResourceId: string;

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
      [`${roleKey}-${rnd()}@1jb.test`],
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

beforeAll(async () => {
  await ensureRbac();

  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('Clinica1JB','clinica1jb-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerA = await member(orgA, "owner");

  // Mismo actor que ownerA pero SIN resources.view — solo para validar el gateo.
  ownerNoResourcesA = {
    organizationId: orgA,
    userId: ownerA.userId,
    permissions: new Set([...ownerA.permissions].filter((p) => p !== "resources.view")),
  };

  // ── Recursos: profesional + sillón ──
  professionalResourceId = (
    await adminPool.query(
      `INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,'PROFESSIONAL','Dra. Pérez') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  chairResourceId = (
    await adminPool.query(
      `INSERT INTO "resources"("organizationId","kind","name") VALUES ($1,'CHAIR','Sillón 2') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;

  // ── Paciente con citas (pasada + futura), ambas con recursos asignados ──
  const contactWithApptsId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone")
       VALUES ($1,'Paciente Con Citas','+5255100001') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  patientWithApptsId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactWithApptsId],
    )
  ).rows[0].id;

  // Cita pasada → lastAppointment
  await adminPool.query(
    `INSERT INTO "appointments"
       ("organizationId","contactId","patientId","startAt","endAt","status","createdBy","completedAt",
        "professionalResourceId","chairResourceId","reason")
     VALUES ($1,$2,$3, now()-interval'10 days', now()-interval'10 days'+interval'1 hour',
             'COMPLETED',$4, now()-interval'10 days'+interval'1 hour',$5,$6,'Limpieza')`,
    [orgA, contactWithApptsId, patientWithApptsId, ownerA.userId, professionalResourceId, chairResourceId],
  );

  // Cita futura SCHEDULED → nextAppointment
  await adminPool.query(
    `INSERT INTO "appointments"
       ("organizationId","contactId","patientId","startAt","endAt","status","createdBy",
        "professionalResourceId","chairResourceId","reason")
     VALUES ($1,$2,$3, now()+interval'5 days', now()+interval'5 days'+interval'30 minutes',
             'SCHEDULED',$4,$5,$6,'Revisión')`,
    [orgA, contactWithApptsId, patientWithApptsId, ownerA.userId, professionalResourceId, chairResourceId],
  );

  // ── Paciente sin citas ──
  const contactNoApptsId = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName","phone")
       VALUES ($1,'Paciente Sin Citas','+5255100002') RETURNING id`,
      [orgA],
    )
  ).rows[0].id;
  patientNoApptsId = (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state")
       VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgA, contactNoApptsId],
    )
  ).rows[0].id;
});

afterAll(async () => {
  await closePools();
});

describe("1J-B — nextAppointment/lastAppointment enriquecidos", () => {
  it("owner (con resources.view) ve endAt, profesional y sillón en nextAppointment", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientWithApptsId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { nextAppointment } = result.value.operative;
    expect(nextAppointment).not.toBeNull();
    expect(nextAppointment!.status).toBe("SCHEDULED");
    expect(nextAppointment!.reason).toBe("Revisión");
    expect(nextAppointment!.endAt).not.toBeNull();
    expect(nextAppointment!.professionalResourceId).toBe(professionalResourceId);
    expect(nextAppointment!.chairResourceId).toBe(chairResourceId);
    expect(nextAppointment!.professionalName).toBe("Dra. Pérez");
    expect(nextAppointment!.chairName).toBe("Sillón 2");
  });

  it("owner (con resources.view) ve endAt, profesional y sillón en lastAppointment", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientWithApptsId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { lastAppointment } = result.value.operative;
    expect(lastAppointment).not.toBeNull();
    expect(lastAppointment!.status).toBe("COMPLETED");
    expect(lastAppointment!.reason).toBe("Limpieza");
    expect(lastAppointment!.endAt).not.toBeNull();
    expect(lastAppointment!.professionalResourceId).toBe(professionalResourceId);
    expect(lastAppointment!.chairResourceId).toBe(chairResourceId);
    expect(lastAppointment!.professionalName).toBe("Dra. Pérez");
    expect(lastAppointment!.chairName).toBe("Sillón 2");
  });

  it("sin resources.view: se conserva fecha/hora/status/reason/ids, pero professionalName y chairName son null", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerNoResourcesA, patientWithApptsId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { nextAppointment, lastAppointment } = result.value.operative;

    expect(nextAppointment).not.toBeNull();
    expect(nextAppointment!.status).toBe("SCHEDULED");
    expect(nextAppointment!.reason).toBe("Revisión");
    expect(nextAppointment!.endAt).not.toBeNull();
    expect(nextAppointment!.professionalResourceId).toBe(professionalResourceId);
    expect(nextAppointment!.chairResourceId).toBe(chairResourceId);
    expect(nextAppointment!.professionalName).toBeNull();
    expect(nextAppointment!.chairName).toBeNull();

    expect(lastAppointment).not.toBeNull();
    expect(lastAppointment!.professionalName).toBeNull();
    expect(lastAppointment!.chairName).toBeNull();
  });

  it("paciente sin citas → nextAppointment y lastAppointment son null, sin error", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientNoApptsId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { nextAppointment, lastAppointment } = result.value.operative;
    expect(nextAppointment).toBeNull();
    expect(lastAppointment).toBeNull();
  });

  it("se conserva el shape previo: id, startAt, status, reason siguen presentes", async () => {
    const result = await resolvePatientLiveRecord(runA, ownerA, patientWithApptsId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { nextAppointment } = result.value.operative;
    expect(typeof nextAppointment!.id).toBe("string");
    expect(typeof nextAppointment!.startAt).toBe("string");
    expect(typeof nextAppointment!.status).toBe("string");
    expect(typeof nextAppointment!.reason).toBe("string");
  });
});
