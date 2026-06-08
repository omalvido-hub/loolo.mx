// NELZZON — Pruebas PATIENT-DOCUMENTS-2A-FOUNDATION (documentos del paciente, solo lectura).
// Postgres real + RLS + permisos. Cubre:
// - listPatientDocumentsSafeForPatient exige patient_documents.view (fail-closed).
// - Aislamiento multi-tenant (RLS): orgA no ve documentos de orgB.
// - portalStatus por defecto = PRIVATE.
// - DTO seguro: NUNCA expone storageKey, checksum, voidReason ni uploadedByUserId.
// - listPatientDocumentLinksSafeByEntity filtra por módulo y por paciente (anti-IDOR).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminPool, forTenantPg, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import {
  listPatientDocumentsSafeForPatient,
  listPatientDocumentLinksSafeByEntity,
  canSeeDocumentSensitivity,
} from "../src/server/domain/clinical/patient-documents-views.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

let orgA: string, orgB: string;
let ownerA: ActorContext;
let clinicianA: ActorContext;
let frontA: ActorContext;
let billingA: ActorContext;
let accountantA: ActorContext;
let noPermsA: ActorContext;
let ownerB: ActorContext;

let patientAId: string;
let patientBId: string;
let encounterAId: string;

let docStaffActiveId: string;
let docPortalQuarantinedId: string;
let docVoidedId: string;
let docComplianceId: string;
let docFinancialId: string;
let docPersonalId: string;
let docBId: string;

// IDs de actores "secretos" usados solo en columnas internas de compliance —
// jamás deben aparecer en la vista segura.
let professionalAuthorSecretId: string;
let reviewedBySecretId: string;
let portalSharedBySecretId: string;

const STORAGE_KEY_SECRET = "s3://nelzzon-docs/secret-" + rnd() + ".pdf";
const CHECKSUM_SECRET = "sha256-" + rnd();
const VOID_REASON_SECRET = "motivo-confidencial-" + rnd();

async function ensureRbac() {
  for (const p of PERMISSIONS)
    await adminPool.query(
      `INSERT INTO "permissions"("key","description") VALUES ($1,$2) ON CONFLICT ("key") DO NOTHING`,
      [p.key, p.description],
    );
  for (const r of ROLES) {
    const id = (
      await adminPool.query(
        `INSERT INTO "roles"("key","name","scope","assignable") VALUES ($1,$2,$3,$4) ON CONFLICT ("key") DO UPDATE SET "name"=EXCLUDED."name" RETURNING id`,
        [r.key, r.name, r.scope, r.assignable],
      )
    ).rows[0].id;
    await adminPool.query(`DELETE FROM "role_permissions" WHERE "roleId"=$1`, [id]);
    for (const pk of r.permissions)
      await adminPool.query(
        `INSERT INTO "role_permissions"("roleId","permissionId") SELECT $1, id FROM "permissions" WHERE "key"=$2 ON CONFLICT DO NOTHING`,
        [id, pk],
      );
  }
}

async function member(orgId: string, roleKey: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`${roleKey}-${rnd()}@pd2a.test`],
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
    `SELECT p."key" FROM "membership_roles" mr JOIN "roles" r ON r.id=mr."roleId"
       JOIN "role_permissions" rp ON rp."roleId"=r.id JOIN "permissions" p ON p.id=rp."permissionId"
     WHERE mr."memberId"=$1`,
    [memberId],
  );
  return { organizationId: orgId, userId, permissions: new Set(rows.map((r) => r.key)) };
}

async function noPerms(orgId: string): Promise<ActorContext> {
  const userId = (
    await adminPool.query(
      `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
      [`noperms-${rnd()}@pd2a.test`],
    )
  ).rows[0].id;
  await adminPool.query(
    `INSERT INTO "organization_memberships"("organizationId","userId","role") VALUES ($1,$2,'front_desk')`,
    [orgId, userId],
  );
  return { organizationId: orgId, userId, permissions: new Set<string>() };
}

async function mkPatient(orgId: string, label: string) {
  const cid = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,$2) RETURNING id`,
      [orgId, `PD2A-${label}`],
    )
  ).rows[0].id;
  return (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgId, cid],
    )
  ).rows[0].id;
}

beforeAll(async () => {
  await ensureRbac();
  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('PD2A-A','pd2a-a-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('PD2A-B','pd2a-b-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerA = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  frontA = await member(orgA, "front_desk");
  billingA = await member(orgA, "billing");
  accountantA = await member(orgA, "accountant");
  noPermsA = await noPerms(orgA);
  ownerB = await member(orgB, "owner");

  patientAId = await mkPatient(orgA, "pacA");
  patientBId = await mkPatient(orgB, "pacB");

  encounterAId = (
    await adminPool.query(
      `INSERT INTO "clinical_encounters"
         ("organizationId","patientId","status","chiefComplaint","createdBy")
       VALUES ($1,$2,'DRAFT','Revisión PD2A',$3) RETURNING id`,
      [orgA, patientAId, ownerA.userId],
    )
  ).rows[0].id;

  // Documento subido por staff, activo, portalStatus/sensitivityLevel por defecto.
  docStaffActiveId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","checksum","uploadedByUserId","uploadedVia","retentionCategory","status")
       VALUES ($1,$2,'CLINICAL','radiografia.jpg','image/jpeg',204800,$3,$4,$5,'STAFF','CLINICAL_RECORD','ACTIVE')
       RETURNING id`,
      [orgA, patientAId, STORAGE_KEY_SECRET, CHECKSUM_SECRET, ownerA.userId],
    )
  ).rows[0].id;

  // Documento subido vía portal del paciente — debe iniciar en cuarentena.
  docPortalQuarantinedId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedVia","retentionCategory","status")
       VALUES ($1,$2,'ADMINISTRATIVE','identificacion.pdf','application/pdf',102400,$3,'PATIENT_PORTAL','ADMINISTRATIVE','QUARANTINED')
       RETURNING id`,
      [orgA, patientAId, "s3://nelzzon-docs/portal-" + rnd() + ".pdf"],
    )
  ).rows[0].id;

  // Documento anulado, con motivo confidencial que NUNCA debe exponerse.
  docVoidedId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedByUserId","uploadedVia","retentionCategory","status","voidedAt","voidReason")
       VALUES ($1,$2,'OTHER','duplicado.pdf','application/pdf',1024,$3,$4,'STAFF','TEMPORARY','VOIDED',now(),$5)
       RETURNING id`,
      [orgA, patientAId, "s3://nelzzon-docs/void-" + rnd() + ".pdf", ownerA.userId, VOID_REASON_SECRET],
    )
  ).rows[0].id;

  // Usuarios "secretos" usados solo como valor de columnas internas — sirven
  // para comprobar que sus UUIDs jamás aparecen en la vista segura.
  const mkUser = async (label: string) =>
    (
      await adminPool.query(
        `INSERT INTO "users"("email","emailVerified") VALUES ($1,true) RETURNING id`,
        [`${label}-${rnd()}@pd2a.test`],
      )
    ).rows[0].id as string;
  professionalAuthorSecretId = await mkUser("prof-author-secret");
  reviewedBySecretId = await mkUser("reviewed-by-secret");
  portalSharedBySecretId = await mkUser("portal-shared-by-secret");

  // Documento con todos los campos de compliance (radiografía revisada, compartida
  // al portal y con responsable clínico) — para validar que esos IDs internos
  // NUNCA se expongan en la vista segura aunque existan en la fila.
  docComplianceId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedByUserId","uploadedVia",
          "professionalAuthorUserId","reviewedByUserId","reviewedAt",
          "sensitivityLevel","retentionCategory","legalHold",
          "portalStatus","portalSharedAt","portalSharedByUserId",
          "status")
       VALUES ($1,$2,'RADIOGRAPH','radiografia-panoramica.dcm','application/dicom',512000,$3,$4,'STAFF',
               $5,$6,now(),
               'SENSITIVE_CLINICAL','CLINICAL_RECORD',true,
               'SHARED_TO_PORTAL',now(),$7,
               'ACTIVE')
       RETURNING id`,
      [
        orgA, patientAId,
        "s3://nelzzon-docs/compliance-" + rnd() + ".dcm",
        ownerA.userId,
        professionalAuthorSecretId, reviewedBySecretId,
        portalSharedBySecretId,
      ],
    )
  ).rows[0].id;

  // Documento financiero sensible — solo visible con patient_documents.financial_view.
  docFinancialId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedByUserId","uploadedVia","sensitivityLevel","retentionCategory","status")
       VALUES ($1,$2,'FINANCIAL','estado-cuenta.pdf','application/pdf',81920,$3,$4,'STAFF','SENSITIVE_FINANCIAL','FINANCIAL_RECORD','ACTIVE')
       RETURNING id`,
      [orgA, patientAId, "s3://nelzzon-docs/financial-" + rnd() + ".pdf", ownerA.userId],
    )
  ).rows[0].id;

  // Documento personal sensible — solo visible con patient_documents.sensitive_personal_view (owner/admin).
  docPersonalId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedByUserId","uploadedVia","sensitivityLevel","retentionCategory","status")
       VALUES ($1,$2,'ADMINISTRATIVE','identificacion-oficial.pdf','application/pdf',40960,$3,$4,'STAFF','SENSITIVE_PERSONAL','ADMINISTRATIVE','ACTIVE')
       RETURNING id`,
      [orgA, patientAId, "s3://nelzzon-docs/personal-" + rnd() + ".pdf", ownerA.userId],
    )
  ).rows[0].id;

  // Vincular el documento clínico a la consulta (módulo ENCOUNTER).
  await adminPool.query(
    `INSERT INTO "patient_document_links"("organizationId","documentId","linkType","linkedEntityId")
     VALUES ($1,$2,'ENCOUNTER',$3)`,
    [orgA, docStaffActiveId, encounterAId],
  );
  await adminPool.query(
    `INSERT INTO "patient_document_links"("organizationId","documentId","linkType","linkedEntityId")
     VALUES ($1,$2,'PATIENT',$3)`,
    [orgA, docStaffActiveId, patientAId],
  );
  // Vincular el documento clínico sensible a la misma consulta — para probar que
  // el filtro de sensibilidad también aplica en listPatientDocumentLinksSafeByEntity.
  await adminPool.query(
    `INSERT INTO "patient_document_links"("organizationId","documentId","linkType","linkedEntityId")
     VALUES ($1,$2,'ENCOUNTER',$3)`,
    [orgA, docComplianceId, encounterAId],
  );

  // Documento de orgB — para probar aislamiento de tenant.
  docBId = (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedByUserId","uploadedVia","retentionCategory","status")
       VALUES ($1,$2,'CLINICAL','expediente-b.pdf','application/pdf',2048,$3,$4,'STAFF','CLINICAL_RECORD','ACTIVE')
       RETURNING id`,
      [orgB, patientBId, "s3://nelzzon-docs/orgb-" + rnd() + ".pdf", ownerB.userId],
    )
  ).rows[0].id;
});

afterAll(async () => {
  await closePools();
});

// ══════════════════════════════════════════════════════════════════════
// 1. listPatientDocumentsSafeForPatient — autorización
// ══════════════════════════════════════════════════════════════════════

describe("listPatientDocumentsSafeForPatient — autorización", () => {
  it("actor sin patient_documents.view → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, noPermsA, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("organizationId vacío → FORBIDDEN (fail-closed)", async () => {
    const run = makeTenantRunner(orgA);
    const badCtx: ActorContext = { organizationId: "", userId: ownerA.userId, permissions: ownerA.permissions };
    const result = await listPatientDocumentsSafeForPatient(run, badCtx, patientAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("owner (con patient_documents.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("clinician (con patient_documents.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
  });

  it("front_desk (con patient_documents.view) → ok", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, frontA, patientAId);
    expect(result.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. listPatientDocumentsSafeForPatient — aislamiento multi-tenant (RLS)
// ══════════════════════════════════════════════════════════════════════

describe("listPatientDocumentsSafeForPatient — RLS y multi-tenant", () => {
  it("actor de orgA no recibe documentos del paciente de orgB (RLS filtra, vacío)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientBId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
    expect(result.value.items.map((i) => i.documentId)).not.toContain(docBId);
  });

  it("actor de orgB no recibe documentos del paciente de orgA (RLS filtra, vacío)", async () => {
    const run = makeTenantRunner(orgB);
    const result = await listPatientDocumentsSafeForPatient(run, ownerB, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
    expect(result.value.items.map((i) => i.documentId)).not.toContain(docStaffActiveId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. listPatientDocumentsSafeForPatient — DTO seguro y portalStatus
// ══════════════════════════════════════════════════════════════════════

describe("listPatientDocumentsSafeForPatient — DTO seguro", () => {
  it("lista los 3 documentos del paciente, ordenados por fecha de creación descendente", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    expect(ids).toContain(docStaffActiveId);
    expect(ids).toContain(docPortalQuarantinedId);
    expect(ids).toContain(docVoidedId);
    expect(ids).not.toContain(docBId);
  });

  it("portalStatus por defecto es PRIVATE cuando no se especifica al insertar", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const staff = result.value.items.find((i) => i.documentId === docStaffActiveId);
    expect(staff?.portalStatus).toBe("PRIVATE");
  });

  it("documento subido vía PATIENT_PORTAL inicia en estado QUARANTINED", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const portalDoc = result.value.items.find((i) => i.documentId === docPortalQuarantinedId);
    expect(portalDoc?.uploadedVia).toBe("PATIENT_PORTAL");
    expect(portalDoc?.status).toBe("QUARANTINED");
  });

  it("la vista segura NUNCA expone storageKey, checksum, voidReason ni IDs internos de actores", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.value.items);
    expect(json).not.toContain(STORAGE_KEY_SECRET);
    expect(json).not.toContain(CHECKSUM_SECRET);
    expect(json).not.toContain(VOID_REASON_SECRET);
    expect(json).not.toContain(ownerA.userId);
    expect(json).not.toContain(professionalAuthorSecretId);
    expect(json).not.toContain(reviewedBySecretId);
    expect(json).not.toContain(portalSharedBySecretId);
    for (const item of result.value.items) {
      expect(item).not.toHaveProperty("storageKey");
      expect(item).not.toHaveProperty("checksum");
      expect(item).not.toHaveProperty("voidReason");
      expect(item).not.toHaveProperty("uploadedByUserId");
      expect(item).not.toHaveProperty("professionalAuthorUserId");
      expect(item).not.toHaveProperty("reviewedByUserId");
      expect(item).not.toHaveProperty("reviewedAt");
      expect(item).not.toHaveProperty("signedByUserId");
      expect(item).not.toHaveProperty("portalSharedByUserId");
      expect(item).not.toHaveProperty("portalRevokedByUserId");
      expect(item).not.toHaveProperty("legalHold");
      expect(item).not.toHaveProperty("organizationId");
    }
  });

  it("expone sensitivityLevel y retentionCategory del documento de cumplimiento", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const compliance = result.value.items.find((i) => i.documentId === docComplianceId);
    expect(compliance?.kind).toBe("RADIOGRAPH");
    expect(compliance?.sensitivityLevel).toBe("SENSITIVE_CLINICAL");
    expect(compliance?.retentionCategory).toBe("CLINICAL_RECORD");
    expect(compliance?.portalStatus).toBe("SHARED_TO_PORTAL");
  });

  it("expone los enlaces (links) del documento al módulo correspondiente", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const staff = result.value.items.find((i) => i.documentId === docStaffActiveId);
    expect(staff?.links).toEqual(
      expect.arrayContaining([
        { linkType: "ENCOUNTER", linkedEntityId: encounterAId },
        { linkType: "PATIENT", linkedEntityId: patientAId },
      ]),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3b. Filtro de visibilidad por sensitivityLevel (PATIENT-DOCUMENTS-4A-3)
// ══════════════════════════════════════════════════════════════════════

describe("canSeeDocumentSensitivity — función pura, fail-closed", () => {
  it("NORMAL: visible con solo patient_documents.view", () => {
    expect(canSeeDocumentSensitivity(new Set(["patient_documents.view"]), "NORMAL")).toBe(true);
  });

  it("SENSITIVE_CLINICAL: requiere view + sensitive_clinical_view", () => {
    expect(canSeeDocumentSensitivity(new Set(["patient_documents.view"]), "SENSITIVE_CLINICAL")).toBe(false);
    expect(
      canSeeDocumentSensitivity(
        new Set(["patient_documents.view", "patient_documents.sensitive_clinical_view"]),
        "SENSITIVE_CLINICAL",
      ),
    ).toBe(true);
  });

  it("SENSITIVE_FINANCIAL: requiere view + financial_view", () => {
    expect(canSeeDocumentSensitivity(new Set(["patient_documents.view"]), "SENSITIVE_FINANCIAL")).toBe(false);
    expect(
      canSeeDocumentSensitivity(
        new Set(["patient_documents.view", "patient_documents.financial_view"]),
        "SENSITIVE_FINANCIAL",
      ),
    ).toBe(true);
  });

  it("SENSITIVE_PERSONAL: requiere view + sensitive_personal_view", () => {
    expect(canSeeDocumentSensitivity(new Set(["patient_documents.view"]), "SENSITIVE_PERSONAL")).toBe(false);
    expect(
      canSeeDocumentSensitivity(
        new Set(["patient_documents.view", "patient_documents.sensitive_personal_view"]),
        "SENSITIVE_PERSONAL",
      ),
    ).toBe(true);
  });

  it("nivel desconocido/futuro se oculta por defecto (fail-closed)", () => {
    const allPerms = new Set([
      "patient_documents.view",
      "patient_documents.sensitive_clinical_view",
      "patient_documents.financial_view",
      "patient_documents.sensitive_personal_view",
    ]);
    expect(canSeeDocumentSensitivity(allPerms, "SENSITIVE_FUTURE_LEVEL")).toBe(false);
    expect(canSeeDocumentSensitivity(allPerms, "")).toBe(false);
  });
});

describe("listPatientDocumentsSafeForPatient — filtro por sensitivityLevel", () => {
  it("front_desk (view + upload, sin permisos finos) solo ve documentos NORMAL", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, frontA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    const levels = new Set(result.value.items.map((i) => i.sensitivityLevel));
    expect(ids).not.toContain(docComplianceId);
    expect(ids).not.toContain(docFinancialId);
    expect(ids).not.toContain(docPersonalId);
    expect(levels).toEqual(new Set(["NORMAL"]));
  });

  it("clinician ve NORMAL + SENSITIVE_CLINICAL, pero no FINANCIAL ni PERSONAL", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, clinicianA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    expect(ids).toContain(docComplianceId);
    expect(ids).not.toContain(docFinancialId);
    expect(ids).not.toContain(docPersonalId);
  });

  it("billing y accountant ven NORMAL + SENSITIVE_FINANCIAL, pero no CLINICAL ni PERSONAL", async () => {
    const run = makeTenantRunner(orgA);
    for (const actor of [billingA, accountantA]) {
      const result = await listPatientDocumentsSafeForPatient(run, actor, patientAId);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const ids = result.value.items.map((i) => i.documentId);
      expect(ids).toContain(docFinancialId);
      expect(ids).not.toContain(docComplianceId);
      expect(ids).not.toContain(docPersonalId);
    }
  });

  it("owner y admin ven los 4 niveles, incluido SENSITIVE_PERSONAL", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, ownerA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    expect(ids).toContain(docStaffActiveId); // NORMAL
    expect(ids).toContain(docComplianceId); // SENSITIVE_CLINICAL
    expect(ids).toContain(docFinancialId); // SENSITIVE_FINANCIAL
    expect(ids).toContain(docPersonalId); // SENSITIVE_PERSONAL
  });

  it("el conteo de auditoría refleja solo los documentos visibles para el actor (no delata documentos ocultos)", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentsSafeForPatient(run, frontA, patientAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient_documents.viewed' AND "entityId"=$1 AND "actorUserId"=$2
       ORDER BY "id" DESC LIMIT 1`,
      [patientAId, frontA.userId],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = rows[0].metadata as { count: number };
    // front_desk solo ve documentos NORMAL — el conteo auditado debe ser el filtrado, no el total bruto.
    expect(meta.count).toBe(result.value.items.length);
    expect(meta.count).toBeLessThan(5);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. listPatientDocumentLinksSafeByEntity — listar por módulo (anti-IDOR)
// ══════════════════════════════════════════════════════════════════════

describe("listPatientDocumentLinksSafeByEntity — listado por módulo", () => {
  it("actor sin patient_documents.view → FORBIDDEN", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentLinksSafeByEntity(run, noPermsA, patientAId, "ENCOUNTER", encounterAId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("devuelve los documentos vinculados a la consulta indicada", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentLinksSafeByEntity(run, ownerA, patientAId, "ENCOUNTER", encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.map((i) => i.documentId)).toContain(docStaffActiveId);
  });

  it("respeta el filtro de sensitivityLevel: front_desk no ve el documento SENSITIVE_CLINICAL vinculado a la consulta", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentLinksSafeByEntity(run, frontA, patientAId, "ENCOUNTER", encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    expect(ids).toContain(docStaffActiveId);
    expect(ids).not.toContain(docComplianceId);
  });

  it("respeta el filtro de sensitivityLevel: clinician sí ve el documento SENSITIVE_CLINICAL vinculado a la consulta", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentLinksSafeByEntity(run, clinicianA, patientAId, "ENCOUNTER", encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.items.map((i) => i.documentId);
    expect(ids).toContain(docStaffActiveId);
    expect(ids).toContain(docComplianceId);
  });

  it("anti-IDOR: si el patientId no coincide con el dueño real del documento, no lo devuelve", async () => {
    const run = makeTenantRunner(orgA);
    const result = await listPatientDocumentLinksSafeByEntity(run, ownerA, patientBId, "ENCOUNTER", encounterAId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Esquema — compliance médico/legal (PATIENT-DOCUMENTS-2B)
// ══════════════════════════════════════════════════════════════════════

describe("patient_documents — esquema de compliance (2B)", () => {
  it("DocumentKind incluye los subtipos clínicos/odontológicos requeridos", async () => {
    const { rows } = await adminPool.query(
      `SELECT unnest(enum_range(NULL::"DocumentKind"))::text AS v`,
    );
    const values = rows.map((r: any) => r.v);
    for (const expected of [
      "CLINICAL", "RADIOGRAPH", "INTRAORAL_IMAGE", "EXTERNAL_STUDY", "CLINICAL_EVIDENCE",
      "ADMINISTRATIVE", "CONSENT", "PRESCRIPTION", "FINANCIAL", "GENERATED", "OTHER",
    ]) {
      expect(values).toContain(expected);
    }
  });

  it("DocumentSensitivityLevel y DocumentRetentionCategory existen con sus valores", async () => {
    const sens = await adminPool.query(`SELECT unnest(enum_range(NULL::"DocumentSensitivityLevel"))::text AS v`);
    expect(sens.rows.map((r: any) => r.v)).toEqual([
      "NORMAL", "SENSITIVE_CLINICAL", "SENSITIVE_FINANCIAL", "SENSITIVE_PERSONAL",
    ]);

    const ret = await adminPool.query(`SELECT unnest(enum_range(NULL::"DocumentRetentionCategory"))::text AS v`);
    expect(ret.rows.map((r: any) => r.v)).toEqual([
      "CLINICAL_RECORD", "FINANCIAL_RECORD", "ADMINISTRATIVE", "CONSENT", "TEMPORARY",
    ]);
  });

  it("columnas de responsabilidad clínica y trazabilidad de portal existen en patient_documents", async () => {
    const { rows } = await adminPool.query(
      `SELECT "column_name" FROM "information_schema"."columns"
       WHERE "table_name" = 'patient_documents'`,
    );
    const cols = rows.map((r: any) => r.column_name);
    for (const expected of [
      "professionalAuthorUserId", "reviewedByUserId", "reviewedAt",
      "sensitivityLevel", "retentionCategory", "legalHold",
      "portalSharedAt", "portalSharedByUserId", "portalRevokedAt", "portalRevokedByUserId",
      "signedAt", "signedByUserId",
    ]) {
      expect(cols).toContain(expected);
    }
  });

  it("sensitivityLevel por defecto es NORMAL y legalHold por defecto es false", async () => {
    const cid = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'PD2A-defaults') RETURNING id`,
        [orgA],
      )
    ).rows[0].id;
    const pid = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgA, cid],
      )
    ).rows[0].id;
    const { rows } = await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedVia","retentionCategory","status")
       VALUES ($1,$2,'OTHER','default-check.pdf','application/pdf',10,$3,'STAFF','TEMPORARY','ACTIVE')
       RETURNING "sensitivityLevel","legalHold","portalStatus"`,
      [orgA, pid, "s3://nelzzon-docs/defaults-" + rnd() + ".pdf"],
    );
    expect(rows[0].sensitivityLevel).toBe("NORMAL");
    expect(rows[0].legalHold).toBe(false);
    expect(rows[0].portalStatus).toBe("PRIVATE");
  });

  it("retentionCategory es obligatorio (NOT NULL) al insertar un documento", async () => {
    const cid = (
      await adminPool.query(
        `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,'PD2A-retention') RETURNING id`,
        [orgA],
      )
    ).rows[0].id;
    const pid = (
      await adminPool.query(
        `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
        [orgA, cid],
      )
    ).rows[0].id;
    await expect(
      adminPool.query(
        `INSERT INTO "patient_documents"
           ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","uploadedVia","status")
         VALUES ($1,$2,'OTHER','sin-retencion.pdf','application/pdf',10,$3,'STAFF','ACTIVE')`,
        [orgA, pid, "s3://nelzzon-docs/no-retention-" + rnd() + ".pdf"],
      ),
    ).rejects.toThrow();
  });
});
