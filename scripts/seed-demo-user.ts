// Script: crea usuario demo con contraseña correctamente hasheada por Better Auth.
// Uso: npx tsx scripts/seed-demo-user.ts

import { config } from "dotenv";
config();

// Hasher nativo de Better Auth (scrypt vía node:crypto, sin instanciar Prisma).
import { hashPassword } from "@better-auth/utils/password";
import { adminPool } from "../tests/harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";

const EMAIL    = "omalvido@gmail.com";
const PASSWORD = "Loolo2026";
const NAME     = "Oscar Malvido";
const ORG_NAME = "Clínica Demo";
const ORG_SLUG = "clinica-demo";

async function ensureCatalog() {
  for (const p of PERMISSIONS) {
    await adminPool.query(
      `INSERT INTO permissions(key,description) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`,
      [p.key, p.description],
    );
  }
  for (const r of ROLES) {
    const { rows } = await adminPool.query(
      `INSERT INTO roles(key,name,scope,assignable) VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [r.key, r.name, r.scope, r.assignable],
    );
    const roleId = rows[0].id;
    for (const permKey of r.permissions) {
      await adminPool.query(
        `INSERT INTO role_permissions("roleId","permissionId")
         SELECT $1, id FROM permissions WHERE key=$2
         ON CONFLICT DO NOTHING`,
        [roleId, permKey],
      );
    }
  }
}

async function main() {
  console.log("1. Catálogo RBAC...");
  await ensureCatalog();

  // ── Usuario ─────────────────────────────────────────────────────────
  console.log("2. Usuario...");
  const existing = await adminPool.query(
    `SELECT id FROM users WHERE email=$1`,
    [EMAIL],
  );

  let userId: string;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    console.log(`   Ya existe → ${userId}`);
  } else {
    const { rows } = await adminPool.query(
      `INSERT INTO users(email,name,"emailVerified") VALUES ($1,$2,true) RETURNING id`,
      [EMAIL, NAME],
    );
    userId = rows[0].id;
    console.log(`   Creado → ${userId}`);
  }

  // Asegurar que el account (contraseña) existe — idempotente.
  const hasAccount = await adminPool.query(
    `SELECT id FROM accounts WHERE "userId"=$1 AND "providerId"='credential'`,
    [userId],
  );
  if (hasAccount.rows.length === 0) {
    const hashed = await hashPassword(PASSWORD);
    // Better Auth almacena: providerId='credential', accountId=userId (texto), password=hash.
    await adminPool.query(
      `INSERT INTO accounts("userId","accountId","providerId","password")
       VALUES ($1,$2,'credential',$3)`,
      [userId, userId, hashed],
    );
    console.log(`   Account (contraseña) creado.`);
  } else {
    console.log(`   Account (contraseña) ya existe.`);
  }

  // ── Organización ─────────────────────────────────────────────────────
  console.log("3. Organización...");
  const { rows: orgRows } = await adminPool.query(
    `INSERT INTO organizations(name,slug)
     VALUES ($1,$2)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [ORG_NAME, ORG_SLUG],
  );
  const orgId: string = orgRows[0].id;
  console.log(`   orgId → ${orgId}`);

  // ── Membresía Better Auth ─────────────────────────────────────────────
  console.log("4. Membresía (Better Auth)...");
  const { rows: memberRows } = await adminPool.query(
    `INSERT INTO organization_memberships("organizationId","userId",role)
     VALUES ($1,$2,'owner')
     ON CONFLICT ("organizationId","userId") DO UPDATE SET role='owner'
     RETURNING id`,
    [orgId, userId],
  );
  const memberId: string = memberRows[0].id;

  // ── Rol fino Nelzzon ────────────────────────────────────────────────────
  console.log("5. Rol Nelzzon owner...");
  // DELETE + INSERT garantiza idempotencia aunque los roleId cambien por reseed de tests
  // (phase2a hace DELETE FROM "roles" CASCADE que borra membership_roles;
  //  al re-insertar roles los UUIDs son distintos — ON CONFLICT DO NOTHING
  //  no bastaría si quedara una fila stale con UUID viejo).
  await adminPool.query(
    `DELETE FROM membership_roles WHERE "memberId"=$1`,
    [memberId],
  );
  await adminPool.query(
    `INSERT INTO membership_roles("memberId","roleId")
     SELECT $1, id FROM roles WHERE key='owner'`,
    [memberId],
  );

  console.log("\n✅ Listo.\n");
  console.log(`   Correo     : ${EMAIL}`);
  console.log(`   Contraseña : ${PASSWORD}`);
  console.log(`   Org        : ${ORG_NAME}`);
  console.log(`   Rol        : owner\n`);

  await adminPool.end();
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
