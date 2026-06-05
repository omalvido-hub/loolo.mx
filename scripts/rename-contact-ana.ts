// Renombra el contacto demo de "Ana García López" a "Ana González Medina".
// Seguro: solo actualiza ese contacto por teléfono en la org demo.
// Uso: npx tsx scripts/rename-contact-ana.ts

import { config } from "dotenv";
config();

import { adminPool } from "../tests/harness.js";

const ORG_SLUG   = "clinica-demo";
const OLD_PHONE  = "+5215599887766";
const NEW_NAME   = "Ana González Medina";

async function main() {
  const { rows: orgRows } = await adminPool.query(
    `SELECT id FROM organizations WHERE slug = $1`,
    [ORG_SLUG],
  );
  if (!orgRows.length) throw new Error(`Org "${ORG_SLUG}" no encontrada.`);
  const orgId = orgRows[0].id;

  const { rows, rowCount } = await adminPool.query(
    `UPDATE contacts
     SET "fullName" = $1, "updatedAt" = now()
     WHERE "organizationId" = $2
       AND phone = $3
       AND "deletedAt" IS NULL
     RETURNING id, "fullName"`,
    [NEW_NAME, orgId, OLD_PHONE],
  );

  if (!rowCount) {
    console.log("No se encontró ningún contacto con ese teléfono en la org demo.");
  } else {
    console.log(`✅ Contacto renombrado: ${rows[0].fullName} (id: ${rows[0].id})`);
  }

  await adminPool.end();
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
