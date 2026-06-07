// NELZZON — Repara filas VOIDED con encounterId=null cuando el hallazgo original
// sí tiene encounterId. Ocurre cuando voidFinding se llamó sin pasar encounterId
// (versión pre-fix de ODONTO-BUGFIX-RENDER-VOID-1).
//
// DRY RUN por defecto — imprime candidatos sin modificar nada.
// APPLY solo con flag explícito: npm run repair:voided-encounter -- --apply
//
// Tabla tocada: odontogram_findings (solo columna encounterId en filas VOIDED).
// Tablas intactas: organizations, users, patients, encounters, quotes, payments, etc.

import pg from "pg";
import { config } from "dotenv";

config();

const isDryRun = !process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

interface Candidate {
  voidedId:        string;
  voidedFdi:       number;
  findingType:     string;
  surface:         string | null;
  origId:          string;
  origEncounterId: string;
}

async function run() {
  const client = await pool.connect();

  console.log("─────────────────────────────────────────────────────────");
  console.log("  repair:voided-encounter-id");
  console.log(`  Modo: ${isDryRun ? "DRY RUN (sin cambios)" : "⚠️  APPLY (escribe en DB)"}`);
  console.log("─────────────────────────────────────────────────────────\n");

  try {
    // ── Buscar candidatos ─────────────────────────────────────────────────────
    // Condiciones:
    //   1. La fila VOIDED tiene encounterId IS NULL
    //   2. Tiene supersedesFindingId (apunta al hallazgo original)
    //   3. El hallazgo original tiene encounterId NOT NULL
    const { rows: candidates } = await client.query<Candidate>(`
      SELECT
        v."id"            AS "voidedId",
        v."toothFdi"      AS "voidedFdi",
        v."findingType"   AS "findingType",
        v."surface"       AS "surface",
        orig."id"         AS "origId",
        orig."encounterId" AS "origEncounterId"
      FROM "odontogram_findings" v
      JOIN "odontogram_findings" orig ON orig."id" = v."supersedesFindingId"
      WHERE v."lifecycleStatus"     = 'VOIDED'
        AND v."encounterId"         IS NULL
        AND v."supersedesFindingId" IS NOT NULL
        AND orig."encounterId"      IS NOT NULL
      ORDER BY v."createdAt" ASC
    `);

    if (candidates.length === 0) {
      console.log("✅ No se encontraron candidatos. Nada que reparar.");
      return;
    }

    console.log(`Candidatos encontrados: ${candidates.length}\n`);

    for (const c of candidates) {
      const surfaceLabel = c.surface ? ` · ${c.surface}` : "";
      console.log(`  Hallazgo VOIDED   : ${c.voidedId}`);
      console.log(`  Pieza FDI         : ${c.voidedFdi}`);
      console.log(`  Tipo              : ${c.findingType}${surfaceLabel}`);
      console.log(`  Original ID       : ${c.origId}`);
      console.log(`  encounterId que copiaría: ${c.origEncounterId}`);

      if (!isDryRun) {
        // UPDATE estricto: solo si aún cumple VOIDED + encounterId IS NULL
        const { rowCount } = await client.query(
          `UPDATE "odontogram_findings"
           SET "encounterId" = $1
           WHERE "id" = $2
             AND "lifecycleStatus" = 'VOIDED'
             AND "encounterId" IS NULL`,
          [c.origEncounterId, c.voidedId],
        );
        if (rowCount && rowCount > 0) {
          console.log(`  → ✅ ACTUALIZADO (encounterId = ${c.origEncounterId})`);
        } else {
          console.log(`  → ⚠️  Sin cambio (fila ya no cumplía condiciones al momento del UPDATE)`);
        }
      } else {
        console.log(`  → [DRY RUN] No se modificó nada.`);
      }

      console.log("");
    }

  } finally {
    client.release();
    await pool.end();
  }

  if (isDryRun) {
    console.log("─────────────────────────────────────────────────────────");
    console.log("  DRY RUN completado. Para aplicar los cambios:");
    console.log("  npm run repair:voided-encounter -- --apply");
    console.log("─────────────────────────────────────────────────────────");
  } else {
    console.log("─────────────────────────────────────────────────────────");
    console.log("  APPLY completado.");
    console.log("  Tabla tocada:  odontogram_findings (solo encounterId)");
    console.log("  Tablas intactas: organizations, users, patients,");
    console.log("                   encounters, quotes, payments, roles...");
    console.log("─────────────────────────────────────────────────────────");
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
