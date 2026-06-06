// LOOLO — Sincronización del catálogo RBAC (permisos, roles, role_permissions).
// Idempotente: solo inserta filas faltantes. Nunca toca usuarios, organizaciones,
// membresías, datos clínicos, pacientes, pagos ni ningún dato de tenant.
// Usa app_admin (DATABASE_URL) — BYPASSRLS, solo para catálogos de identidad.

import pg from "pg";
import { config } from "dotenv";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";

config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function syncRbac() {
  const client = await pool.connect();
  let permCreated = 0, permExisting = 0;
  let roleCreated = 0, roleExisting = 0;
  let rpCreated = 0, rpExisting = 0;

  try {
    // ── Permisos ──────────────────────────────────────────────────────────────
    console.log("\n▶ Sincronizando permisos...");
    for (const p of PERMISSIONS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "permissions"("key","description") VALUES ($1,$2)
         ON CONFLICT ("key") DO NOTHING
         RETURNING "id"`,
        [p.key, p.description],
      );
      if (rows.length > 0) {
        console.log(`  + creado: ${p.key}`);
        permCreated++;
      } else {
        permExisting++;
      }
    }
    console.log(`  → ${permCreated} creados, ${permExisting} ya existían`);

    // ── Roles ─────────────────────────────────────────────────────────────────
    console.log("\n▶ Sincronizando roles...");
    for (const r of ROLES) {
      const { rows } = await client.query<{ id: string; created: boolean }>(
        `INSERT INTO "roles"("key","name","scope","assignable")
         VALUES ($1,$2,$3,$4)
         ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name"
         RETURNING "id", (xmax = 0) AS created`,
        [r.key, r.name, r.scope, r.assignable],
      );
      const wasCreated = rows[0]?.created === true;
      if (wasCreated) {
        console.log(`  + creado: ${r.key}`);
        roleCreated++;
      } else {
        roleExisting++;
      }
    }
    console.log(`  → ${roleCreated} creados, ${roleExisting} ya existían`);

    // ── Role-permissions ──────────────────────────────────────────────────────
    console.log("\n▶ Sincronizando role_permissions...");
    for (const r of ROLES) {
      for (const permKey of r.permissions) {
        const { rows } = await client.query<{ roleId: string }>(
          `INSERT INTO "role_permissions"("roleId","permissionId")
           SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
           WHERE r."key"=$1 AND p."key"=$2
           ON CONFLICT DO NOTHING
           RETURNING "roleId"`,
          [r.key, permKey],
        );
        if (rows.length > 0) {
          console.log(`  + ${r.key} ← ${permKey}`);
          rpCreated++;
        } else {
          rpExisting++;
        }
      }
    }
    console.log(`  → ${rpCreated} creados, ${rpExisting} ya existían`);

  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n✅ sync:rbac completado.");
  console.log(`   Permisos:         ${permCreated} nuevos / ${permExisting} existentes`);
  console.log(`   Roles:            ${roleCreated} nuevos / ${roleExisting} existentes`);
  console.log(`   Role-permisos:    ${rpCreated} nuevos / ${rpExisting} existentes`);
  console.log("\n   Tablas tocadas:   permissions, roles, role_permissions");
  console.log("   Tablas intactas:  organizations, users, memberships, patients,");
  console.log("                     encounters, odontogram_findings, quotes, payments");
}

syncRbac().catch((e) => { console.error(e); process.exit(1); });
