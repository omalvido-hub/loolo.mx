// NELZZON — Seed demo: consulta activa para Ana García López.
// Uso: npx tsx scripts/seed-active-encounter-ana.ts

import { config } from "dotenv";
config();

import { adminPool } from "../tests/harness.js";

const ENCOUNTER_ID = "7b7b7b7b-1111-4444-8888-7b7b7b7b7b7b";
const PATIENT_ID   = "20a707bc-89e6-4085-b71b-fe5379c289f5";
const ORG_ID       = "2f3cec03-6d89-4566-b13c-d578eec4eac3";
const OWNER_ID     = "52c2c43d-e4d5-4679-8abf-eb20dff647cf";

async function main() {
  console.log("→ Seed consulta activa demo para Ana García López...");

  await adminPool.query(
    `INSERT INTO "clinical_encounters"
       ("id","organizationId","patientId","status","chiefComplaint","preliminaryDiagnosis","observations","indications","startedAt","createdBy")
     VALUES
       ($1,$2,$3,'IN_PROGRESS',
        'Consulta activa de prueba odontograma',
        'Pendiente de valoración odontológica.',
        'Consulta demo abierta para probar registro de hallazgos en odontograma.',
        'No finalizar. Uso exclusivo de prueba UI-7B-B.',
        now(),
        $4)
     ON CONFLICT ("id") DO UPDATE SET
       "status"='IN_PROGRESS',
       "chiefComplaint"=EXCLUDED."chiefComplaint",
       "preliminaryDiagnosis"=EXCLUDED."preliminaryDiagnosis",
       "observations"=EXCLUDED."observations",
       "indications"=EXCLUDED."indications",
       "startedAt"=COALESCE("clinical_encounters"."startedAt", now()),
       "finalizedAt"=NULL,
       "finalizedByUserId"=NULL,
       "canceledAt"=NULL,
       "canceledByUserId"=NULL,
       "updatedAt"=now()`,
    [ENCOUNTER_ID, ORG_ID, PATIENT_ID, OWNER_ID],
  );

  console.log("✅ Consulta activa demo lista.");
  console.log(`   encounterId: ${ENCOUNTER_ID}`);

  await adminPool.end();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
