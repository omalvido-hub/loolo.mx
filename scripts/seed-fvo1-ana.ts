// LOOLO — Seed FVO-1: datos demo extendidos de Ana García López.
// Idempotente: puede ejecutarse múltiples veces sin duplicar.
// Uso: npx tsx scripts/seed-fvo1-ana.ts
// IDs fijos de la clínica demo (clinica-demo):
//   patientId : 20a707bc-89e6-4085-b71b-fe5379c289f5
//   orgId     : 2f3cec03-6d89-4566-b13c-d578eec4eac3
//   ownerUserId: 52c2c43d-e4d5-4679-8abf-eb20dff647cf

import { config } from "dotenv";
config();

import { adminPool } from "../tests/harness.js";

const PATIENT_ID  = "20a707bc-89e6-4085-b71b-fe5379c289f5";
const ORG_ID      = "2f3cec03-6d89-4566-b13c-d578eec4eac3";
const OWNER_ID    = "52c2c43d-e4d5-4679-8abf-eb20dff647cf";

async function main() {
  console.log("→ Seed FVO-1 para Ana García López...");

  // 1. Datos demográficos
  await adminPool.query(
    `INSERT INTO "patient_demographics"
       ("organizationId","patientId","dateOfBirth","sex","bloodType","occupation","maritalStatus","createdBy")
     VALUES ($1,$2,'1988-03-15','F','O+','Contadora','MARRIED',$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "dateOfBirth"=EXCLUDED."dateOfBirth",
       "sex"=EXCLUDED."sex",
       "bloodType"=EXCLUDED."bloodType",
       "occupation"=EXCLUDED."occupation",
       "maritalStatus"=EXCLUDED."maritalStatus",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Demografía");

  // 2. Domicilio
  await adminPool.query(
    `INSERT INTO "patient_address"
       ("organizationId","patientId","street","extNumber","intNumber","neighborhood","municipality","state","postalCode","country","createdBy")
     VALUES ($1,$2,'Av. Insurgentes Sur','1234','502','Del Valle','Benito Juárez','Ciudad de México','03100','MX',$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "street"=EXCLUDED."street",
       "extNumber"=EXCLUDED."extNumber",
       "intNumber"=EXCLUDED."intNumber",
       "neighborhood"=EXCLUDED."neighborhood",
       "municipality"=EXCLUDED."municipality",
       "state"=EXCLUDED."state",
       "postalCode"=EXCLUDED."postalCode",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Domicilio");

  // 3. Datos fiscales del paciente
  await adminPool.query(
    `INSERT INTO "patient_tax_profile"
       ("organizationId","patientId","rfc","legalName","taxRegime","cfdiUse","taxPostalCode","createdBy")
     VALUES ($1,$2,'GALA880315MDF','Ana García López','605','D10','03100',$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "rfc"=EXCLUDED."rfc",
       "legalName"=EXCLUDED."legalName",
       "taxRegime"=EXCLUDED."taxRegime",
       "cfdiUse"=EXCLUDED."cfdiUse",
       "taxPostalCode"=EXCLUDED."taxPostalCode",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Datos fiscales");

  // 4. Perfil clínico
  await adminPool.query(
    `INSERT INTO "patient_clinical_profile"
       ("organizationId","patientId","knownAllergies","currentMedications","relevantHistory","safetyNotes","createdBy","updatedBy")
     VALUES ($1,$2,ARRAY['Penicilina','Ibuprofeno'],ARRAY['Metformina 500mg (diabetes tipo 2)'],
       'Diabetes mellitus tipo 2 controlada. Hipertensión leve. Sin alergias a látex.',
       'Verificar glucemia antes de procedimientos. Evitar vasoconstrictores con epinefrina en altas concentraciones.',$3,$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "knownAllergies"=EXCLUDED."knownAllergies",
       "currentMedications"=EXCLUDED."currentMedications",
       "relevantHistory"=EXCLUDED."relevantHistory",
       "safetyNotes"=EXCLUDED."safetyNotes",
       "updatedBy"=EXCLUDED."updatedBy",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Perfil clínico");

  // 5. Alertas médicas (solo insertar si no existen)
  const existingAlerts = await adminPool.query(
    `SELECT id FROM "patient_medical_alert" WHERE "patientId"=$1`,
    [PATIENT_ID],
  );
  if (existingAlerts.rows.length === 0) {
    await adminPool.query(
      `INSERT INTO "patient_medical_alert"
         ("organizationId","patientId","alertType","severity","description","active","createdBy")
       VALUES
         ($1,$2,'ALLERGY','HIGH','Alergia a Penicilina — reacción anafiláctica documentada.',true,$3),
         ($1,$2,'CONDITION','MEDIUM','Diabetes mellitus tipo 2 — monitorear glucemia en procedimientos largos.',true,$3),
         ($1,$2,'MEDICATION','LOW','Toma Metformina diariamente. Informar al clínico antes de sedación.',true,$3)`,
      [ORG_ID, PATIENT_ID, OWNER_ID],
    );
    console.log("  ✓ Alertas médicas (3 alertas)");
  } else {
    console.log("  · Alertas médicas ya existen, omitiendo");
  }

  // 6. Tutor / Responsable (no aplica para adulto — insertar vacío para demostrar la estructura)
  // Ana es mayor de edad, no tiene tutor, pero registramos al esposo como contacto de referencia
  await adminPool.query(
    `INSERT INTO "patient_guardian"
       ("organizationId","patientId","name","relationship","phone","email","createdBy")
     VALUES ($1,$2,NULL,NULL,NULL,NULL,$3)
     ON CONFLICT ("patientId") DO NOTHING`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  // Si no hay tutor, no se muestra la sección en la UI (null row)

  // 7. Contacto de emergencia
  await adminPool.query(
    `INSERT INTO "patient_emergency_contact"
       ("organizationId","patientId","name","relationship","phone","createdBy")
     VALUES ($1,$2,'Roberto García Sánchez','Esposo','+5215512345678',$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "name"=EXCLUDED."name",
       "relationship"=EXCLUDED."relationship",
       "phone"=EXCLUDED."phone",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Contacto de emergencia");

  // 8. Origen comercial
  await adminPool.query(
    `INSERT INTO "patient_commercial_origin"
       ("organizationId","patientId","channel","campaign","referredBy","initialReason","createdBy")
     VALUES ($1,$2,'REFERRAL',NULL,'Dra. Lucía Hernández (Médico general)','Dolor dental agudo en molar inferior derecho',$3)
     ON CONFLICT ("patientId") DO UPDATE SET
       "channel"=EXCLUDED."channel",
       "referredBy"=EXCLUDED."referredBy",
       "initialReason"=EXCLUDED."initialReason",
       "updatedAt"=now()`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Origen comercial");

  // 9. Consentimiento de datos
  await adminPool.query(
    `INSERT INTO "patient_data_consent"
       ("organizationId","patientId","consentType","status","grantedAt","version","method","grantedByUserId")
     VALUES ($1,$2,'DATA_TREATMENT','GRANTED',now(),'v1.2','SIGNATURE',$3)
     ON CONFLICT ("patientId","consentType") DO UPDATE SET
       "status"=EXCLUDED."status",
       "grantedAt"=EXCLUDED."grantedAt",
       "version"=EXCLUDED."version",
       "method"=EXCLUDED."method"`,
    [ORG_ID, PATIENT_ID, OWNER_ID],
  );
  console.log("  ✓ Consentimiento de datos");

  console.log("\n✅ Seed FVO-1 completado para Ana García López.");
  await adminPool.end();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
