// LOOLO — Seed demo: Ana García López en cualquier entorno.
// Seguro, idempotente, transaccional. Sin UUIDs hardcodeados de local.
// Uso: npx tsx scripts/seed-demo-paciente-ana.ts
//
// Prerequisito: seed-demo-user.ts ya ejecutado (org "Clínica Demo" y usuario deben existir).
// Garantías:
//   - Nunca borra datos existentes.
//   - Nunca toca sessions, accounts u otros pacientes.
//   - Falla con mensaje claro si falta org, usuario o membresía.
//   - Idempotente: puede ejecutarse N veces sin duplicar.

import { config } from "dotenv";
config();

import pg from "pg";

// adminPool se importa desde harness para consistencia con el resto de seeds.
// Usa DATABASE_URL (app_admin, BYPASSRLS) — necesario para seed cross-tenant.
import { adminPool } from "../tests/harness.js";

// ── Constantes del entorno demo ───────────────────────────────────────
const ORG_SLUG   = "clinica-demo";
const USER_EMAIL = "omalvido@gmail.com";

// UUID fijo para la consulta activa demo — igual al usado en seed-active-encounter-ana.ts.
// Solo aplica a datos DEMO; es el identificador estable del encounter de prueba UI.
const DEMO_ENCOUNTER_ID = "7b7b7b7b-1111-4444-8888-7b7b7b7b7b7b";

// ── Helpers ────────────────────────────────────────────────────────────
async function row<T = Record<string, unknown>>(
  client: pg.PoolClient,
  sql: string,
  params: unknown[],
): Promise<T | null> {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function run(
  client: pg.PoolClient,
  sql: string,
  params: unknown[],
): Promise<void> {
  await client.query(sql, params);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const client = await adminPool.connect();

  try {
    await client.query("BEGIN");

    // ── 1. Lookup organización ──────────────────────────────────────
    console.log("1. Buscando organización...");
    const org = await row<{ id: string }>(
      client,
      `SELECT id FROM organizations WHERE slug = $1`,
      [ORG_SLUG],
    );
    if (!org) {
      throw new Error(
        `Organización con slug "${ORG_SLUG}" no encontrada. ` +
        `Ejecuta scripts/seed-demo-user.ts primero.`,
      );
    }
    const orgId = org.id;
    console.log(`   orgId: ${orgId}`);

    // ── 2. Lookup usuario ───────────────────────────────────────────
    console.log("2. Buscando usuario...");
    const user = await row<{ id: string }>(
      client,
      `SELECT id FROM users WHERE email = $1`,
      [USER_EMAIL],
    );
    if (!user) {
      throw new Error(
        `Usuario "${USER_EMAIL}" no encontrado. ` +
        `Ejecuta scripts/seed-demo-user.ts primero.`,
      );
    }
    const ownerId = user.id;
    console.log(`   userId: ${ownerId}`);

    // ── 3. Verificar membresía ──────────────────────────────────────
    console.log("3. Verificando membresía...");
    const membership = await row(
      client,
      `SELECT id FROM organization_memberships
       WHERE "organizationId" = $1 AND "userId" = $2`,
      [orgId, ownerId],
    );
    if (!membership) {
      throw new Error(
        `El usuario "${USER_EMAIL}" no es miembro de la organización. ` +
        `Ejecuta scripts/seed-demo-user.ts primero.`,
      );
    }
    console.log(`   membresía confirmada`);

    // ── 4. Contacto de Ana (lookup o crear) ────────────────────────
    console.log("4. Contacto Ana García López...");
    const existingContact = await row<{ id: string }>(
      client,
      `SELECT id FROM contacts
       WHERE "organizationId" = $1
         AND "fullName" = 'Ana García López'
         AND "deletedAt" IS NULL
       LIMIT 1`,
      [orgId],
    );

    let contactId: string;
    if (existingContact) {
      contactId = existingContact.id;
      console.log(`   ya existe → ${contactId}`);
    } else {
      const created = await row<{ id: string }>(
        client,
        `INSERT INTO contacts ("organizationId", "fullName", "phone", "state")
         VALUES ($1, 'Ana García López', '+5215599887766', 'OK')
         RETURNING id`,
        [orgId],
      );
      contactId = created!.id;
      console.log(`   creado → ${contactId}`);
    }

    // ── 5. Paciente (lookup o crear) ───────────────────────────────
    console.log("5. Paciente...");
    const existingPatient = await row<{ id: string }>(
      client,
      `SELECT id FROM patients
       WHERE "organizationId" = $1
         AND "contactId" = $2
         AND "deletedAt" IS NULL
       LIMIT 1`,
      [orgId, contactId],
    );

    let patientId: string;
    if (existingPatient) {
      patientId = existingPatient.id;
      console.log(`   ya existe → ${patientId}`);
    } else {
      const created = await row<{ id: string }>(
        client,
        `INSERT INTO patients ("organizationId", "contactId", "status", "state")
         VALUES ($1, $2, 'ACTIVE', 'OK')
         RETURNING id`,
        [orgId, contactId],
      );
      patientId = created!.id;
      console.log(`   creado → ${patientId}`);
    }

    // ── 6. Demografía ──────────────────────────────────────────────
    console.log("6. Demografía...");
    await run(
      client,
      `INSERT INTO patient_demographics
         ("organizationId","patientId","dateOfBirth","sex","bloodType",
          "occupation","maritalStatus","createdBy")
       VALUES ($1,$2,'1988-03-15','F','O+','Contadora','MARRIED',$3)
       ON CONFLICT ("patientId") DO UPDATE SET
         "dateOfBirth" = EXCLUDED."dateOfBirth",
         "sex"         = EXCLUDED."sex",
         "bloodType"   = EXCLUDED."bloodType",
         "occupation"  = EXCLUDED."occupation",
         "maritalStatus" = EXCLUDED."maritalStatus",
         "updatedAt"   = now()`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 7. Domicilio ───────────────────────────────────────────────
    console.log("7. Domicilio...");
    await run(
      client,
      `INSERT INTO patient_address
         ("organizationId","patientId","street","extNumber","intNumber",
          "neighborhood","municipality","state","postalCode","country","createdBy")
       VALUES ($1,$2,'Av. Insurgentes Sur','1234','502',
               'Del Valle','Benito Juárez','Ciudad de México','03100','MX',$3)
       ON CONFLICT ("patientId") DO UPDATE SET
         "street"       = EXCLUDED."street",
         "extNumber"    = EXCLUDED."extNumber",
         "intNumber"    = EXCLUDED."intNumber",
         "neighborhood" = EXCLUDED."neighborhood",
         "municipality" = EXCLUDED."municipality",
         "state"        = EXCLUDED."state",
         "postalCode"   = EXCLUDED."postalCode",
         "updatedAt"    = now()`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 8. Datos fiscales ──────────────────────────────────────────
    console.log("8. Datos fiscales...");
    await run(
      client,
      `INSERT INTO patient_tax_profile
         ("organizationId","patientId","rfc","legalName","taxRegime",
          "cfdiUse","taxPostalCode","createdBy")
       VALUES ($1,$2,'GALA880315MDF','Ana García López','605','D10','03100',$3)
       ON CONFLICT ("patientId") DO UPDATE SET
         "rfc"          = EXCLUDED."rfc",
         "legalName"    = EXCLUDED."legalName",
         "taxRegime"    = EXCLUDED."taxRegime",
         "cfdiUse"      = EXCLUDED."cfdiUse",
         "taxPostalCode" = EXCLUDED."taxPostalCode",
         "updatedAt"    = now()`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 9. Perfil clínico ──────────────────────────────────────────
    console.log("9. Perfil clínico...");
    await run(
      client,
      `INSERT INTO patient_clinical_profile
         ("organizationId","patientId","knownAllergies","currentMedications",
          "relevantHistory","safetyNotes","createdBy","updatedBy")
       VALUES ($1,$2,
         ARRAY['Penicilina','Ibuprofeno'],
         ARRAY['Metformina 500mg (diabetes tipo 2)'],
         'Diabetes mellitus tipo 2 controlada. Hipertensión leve. Sin alergias a látex.',
         'Verificar glucemia antes de procedimientos. Evitar vasoconstrictores con epinefrina en altas concentraciones.',
         $3,$3)
       ON CONFLICT ("patientId") DO UPDATE SET
         "knownAllergies"     = EXCLUDED."knownAllergies",
         "currentMedications" = EXCLUDED."currentMedications",
         "relevantHistory"    = EXCLUDED."relevantHistory",
         "safetyNotes"        = EXCLUDED."safetyNotes",
         "updatedBy"          = EXCLUDED."updatedBy",
         "updatedAt"          = now()`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 10. Alertas médicas (solo si no existen) ───────────────────
    console.log("10. Alertas médicas...");
    const existingAlerts = await row(
      client,
      `SELECT id FROM patient_medical_alert WHERE "patientId" = $1 LIMIT 1`,
      [patientId],
    );
    if (!existingAlerts) {
      await run(
        client,
        `INSERT INTO patient_medical_alert
           ("organizationId","patientId","alertType","severity","description","active","createdBy")
         VALUES
           ($1,$2,'ALLERGY','HIGH',
            'Alergia a Penicilina — reacción anafiláctica documentada.',true,$3),
           ($1,$2,'CONDITION','MEDIUM',
            'Diabetes mellitus tipo 2 — monitorear glucemia en procedimientos largos.',true,$3),
           ($1,$2,'MEDICATION','LOW',
            'Toma Metformina diariamente. Informar al clínico antes de sedación.',true,$3)`,
        [orgId, patientId, ownerId],
      );
      console.log(`   ✓ 3 alertas insertadas`);
    } else {
      console.log(`   · ya existen, omitiendo`);
    }

    // ── 11. Tutor (solo si no existe) ──────────────────────────────
    // Ana es adulta — se inserta registro vacío para demostrar la estructura.
    // 1:N sin UNIQUE constraint (migración 0017) → SELECT + INSERT condicional.
    console.log("11. Tutor...");
    const existingGuardian = await row(
      client,
      `SELECT id FROM patient_guardian WHERE "patientId" = $1 LIMIT 1`,
      [patientId],
    );
    if (!existingGuardian) {
      await run(
        client,
        `INSERT INTO patient_guardian
           ("organizationId","patientId","name","relationship","phone","email","createdBy")
         VALUES ($1,$2,NULL,NULL,NULL,NULL,$3)`,
        [orgId, patientId, ownerId],
      );
      console.log(`   ✓ (sin tutor — adulto)`);
    } else {
      console.log(`   · ya existe, omitiendo`);
    }

    // ── 12. Contacto de emergencia (solo si no existe) ─────────────
    // 1:N sin UNIQUE constraint (migración 0017) → SELECT + INSERT condicional.
    console.log("12. Contacto de emergencia...");
    const existingEmergency = await row(
      client,
      `SELECT id FROM patient_emergency_contact WHERE "patientId" = $1 LIMIT 1`,
      [patientId],
    );
    if (!existingEmergency) {
      await run(
        client,
        `INSERT INTO patient_emergency_contact
           ("organizationId","patientId","name","relationship","phone","createdBy")
         VALUES ($1,$2,'Roberto García Sánchez','Esposo','+5215512345678',$3)`,
        [orgId, patientId, ownerId],
      );
      console.log(`   ✓`);
    } else {
      console.log(`   · ya existe, omitiendo`);
    }

    // ── 13. Origen comercial ───────────────────────────────────────
    console.log("13. Origen comercial...");
    await run(
      client,
      `INSERT INTO patient_commercial_origin
         ("organizationId","patientId","channel","referredBy","initialReason","createdBy")
       VALUES ($1,$2,'REFERRAL',
               'Dra. Lucía Hernández (Médico general)',
               'Dolor dental agudo en molar inferior derecho',$3)
       ON CONFLICT ("patientId") DO UPDATE SET
         "channel"       = EXCLUDED."channel",
         "referredBy"    = EXCLUDED."referredBy",
         "initialReason" = EXCLUDED."initialReason",
         "updatedAt"     = now()`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 14. Consentimiento ─────────────────────────────────────────
    console.log("14. Consentimiento...");
    await run(
      client,
      `INSERT INTO patient_data_consent
         ("organizationId","patientId","consentType","status","grantedAt",
          "version","method","grantedByUserId")
       VALUES ($1,$2,'DATA_TREATMENT','GRANTED',now(),'v1.2','SIGNATURE',$3)
       ON CONFLICT ("patientId","consentType") DO UPDATE SET
         "status"    = EXCLUDED."status",
         "grantedAt" = EXCLUDED."grantedAt",
         "version"   = EXCLUDED."version",
         "method"    = EXCLUDED."method"`,
      [orgId, patientId, ownerId],
    );
    console.log(`   ✓`);

    // ── 15. Consulta activa demo (idempotente por UUID fijo) ────────
    // El UUID fijo permite ON CONFLICT para poder re-ejecutar el script sin duplicar.
    console.log("15. Consulta activa demo...");
    await run(
      client,
      `INSERT INTO clinical_encounters
         ("id","organizationId","patientId","status","chiefComplaint",
          "preliminaryDiagnosis","observations","indications","startedAt","createdBy")
       VALUES ($1,$2,$3,'IN_PROGRESS',
         'Consulta activa de prueba odontograma',
         'Pendiente de valoración odontológica.',
         'Consulta demo abierta para probar registro de hallazgos en odontograma.',
         'No finalizar. Uso exclusivo de prueba UI-7B-B.',
         now(),$4)
       ON CONFLICT ("id") DO UPDATE SET
         "status"               = 'IN_PROGRESS',
         "chiefComplaint"       = EXCLUDED."chiefComplaint",
         "preliminaryDiagnosis" = EXCLUDED."preliminaryDiagnosis",
         "observations"         = EXCLUDED."observations",
         "indications"          = EXCLUDED."indications",
         "finalizedAt"          = NULL,
         "finalizedByUserId"    = NULL,
         "canceledAt"           = NULL,
         "canceledByUserId"     = NULL,
         "updatedAt"            = now()`,
      [DEMO_ENCOUNTER_ID, orgId, patientId, ownerId],
    );
    console.log(`   ✓ encounterId: ${DEMO_ENCOUNTER_ID}`);

    // ── 16. Hallazgos odontograma (solo si no existen para esta consulta) ──
    // odontogram_findings es append-only (sin UNIQUE útil): se comprueba
    // si ya hay hallazgos para el encounter antes de insertar.
    console.log("16. Hallazgos odontograma...");
    const existingFindings = await row(
      client,
      `SELECT id FROM odontogram_findings WHERE "encounterId" = $1 LIMIT 1`,
      [DEMO_ENCOUNTER_ID],
    );
    if (!existingFindings) {
      // Hallazgos representativos: corona en 16, caries en 26, molar ausente 36, restauración 46.
      await run(
        client,
        `INSERT INTO odontogram_findings
           ("organizationId","patientId","encounterId","toothFdi",
            "findingType","toothStatus","recordedByUserId")
         VALUES
           ($1,$2,$3, 16, 'CROWN',        'PRESENT', $4),
           ($1,$2,$3, 26, 'CARIES',       'PRESENT', $4),
           ($1,$2,$3, 36, 'MISSING',      'ABSENT',  $4),
           ($1,$2,$3, 46, 'RESTORATION',  'PRESENT', $4)`,
        [orgId, patientId, DEMO_ENCOUNTER_ID, ownerId],
      );
      console.log(`   ✓ 4 hallazgos insertados`);
    } else {
      console.log(`   · ya existen hallazgos para esta consulta, omitiendo`);
    }

    await client.query("COMMIT");

    console.log("\n✅ Seed demo completado.\n");
    console.log(`   Paciente  : Ana García López`);
    console.log(`   PatientId : ${patientId}`);
    console.log(`   OrgId     : ${orgId}`);
    console.log(`   Encounter : ${DEMO_ENCOUNTER_ID}`);
    console.log(`   URL       : /pacientes/${patientId}\n`);

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
