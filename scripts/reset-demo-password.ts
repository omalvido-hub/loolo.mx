// Resetea la contraseña del usuario demo en la cuenta credential (Better Auth).
// Usa el mismo hasher que seed-demo-user.ts (scrypt vía @better-auth/utils/password),
// así el hash queda en el formato que better-auth/adapters/prisma espera al verificar.
//
// SOLO actualiza accounts.password de una cuenta credential YA EXISTENTE.
// Nunca crea usuarios ni cuentas — si no existen, falla sin escribir nada.
//
// DRY RUN por defecto — muestra qué fila se actualizaría sin tocar la DB.
// APPLY solo con flag explícito: npx tsx scripts/reset-demo-password.ts --apply
//
// Variables de entorno:
//   DEMO_USER_EMAIL    — opcional, default omalvido@gmail.com
//   DEMO_USER_PASSWORD — OBLIGATORIA. El script falla si falta. Nunca se imprime.
//
// Tabla tocada: accounts (solo columna password, providerId='credential', userId del demo).
// Tablas intactas: users, organizations, memberships, y todo lo clínico/financiero.

import { config } from "dotenv";
config();

import { hashPassword } from "@better-auth/utils/password";
import { adminPool } from "../tests/harness.js";

const EMAIL = process.env.DEMO_USER_EMAIL ?? "omalvido@gmail.com";
const PASSWORD = process.env.DEMO_USER_PASSWORD;
const isDryRun = !process.argv.includes("--apply");

async function main() {
  if (!PASSWORD) {
    console.error(
      "ERROR: falta DEMO_USER_PASSWORD. Define la variable de entorno con la nueva " +
        "contraseña antes de ejecutar este script. No se realizó ningún cambio.",
    );
    process.exit(1);
  }

  console.log("─────────────────────────────────────────────────────────");
  console.log("  reset-demo-password");
  console.log(`  Modo  : ${isDryRun ? "DRY RUN (sin cambios)" : "⚠️  APPLY (escribe en DB)"}`);
  console.log(`  Email : ${EMAIL}`);
  console.log("─────────────────────────────────────────────────────────\n");

  const { rows: userRows } = await adminPool.query(
    `SELECT id FROM users WHERE email=$1`,
    [EMAIL],
  );
  if (userRows.length === 0) {
    console.error(
      `ERROR: no existe ningún usuario con email ${EMAIL}. ` +
        "Este script NO crea usuarios — usa seed-demo-user.ts para eso. Abortado.",
    );
    await adminPool.end();
    process.exit(1);
  }
  const userId: string = userRows[0].id;

  const { rows: accountRows } = await adminPool.query(
    `SELECT id FROM accounts WHERE "userId"=$1 AND "providerId"='credential'`,
    [userId],
  );
  if (accountRows.length === 0) {
    console.error(
      `ERROR: el usuario ${EMAIL} (${userId}) no tiene cuenta credential. ` +
        "Este script NO crea cuentas — usa seed-demo-user.ts para eso. Abortado.",
    );
    await adminPool.end();
    process.exit(1);
  }
  const accountId: string = accountRows[0].id;

  const hashed = await hashPassword(PASSWORD);

  if (isDryRun) {
    console.log(`Se actualizaría accounts.id=${accountId} (userId=${userId}).`);
    console.log("Ejecuta con --apply para aplicar el cambio.\n");
    await adminPool.end();
    return;
  }

  await adminPool.query(
    `UPDATE accounts SET password=$1, "updatedAt"=now() WHERE id=$2 AND "providerId"='credential'`,
    [hashed, accountId],
  );

  console.log(`✅ Contraseña actualizada para ${EMAIL} (accounts.id=${accountId}).`);
  console.log("   (La contraseña nunca se imprime en este log.)\n");

  await adminPool.end();
}

main().catch(async (e) => {
  console.error("ERROR:", e);
  await adminPool.end();
  process.exit(1);
});
