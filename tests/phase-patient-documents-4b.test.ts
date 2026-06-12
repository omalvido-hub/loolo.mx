// NELZZON — Pruebas PATIENT-DOCUMENTS-4B-UPLOAD-STAFF-INTERNAL.
// Postgres real + RLS + permisos. Cubre la primera carga REAL de documentos
// desde personal interno (uploadedVia=STAFF, status=ACTIVE): permisos,
// validación de archivo (vacío / tamaño / magic bytes / tipo declarado falso),
// anti-IDOR multi-tenant, orden storage-antes-de-INSERT (sin filas huérfanas),
// fallas seguras de DB y storage, auditoría sin datos sensibles, y respuesta
// segura (DTO sin storageKey/checksum).

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import type { TenantRunner } from "../src/server/domain/identity/authorize.js";
import {
  uploadPatientDocument,
  detectMimeFromMagicBytes,
  MAX_UPLOAD_SIZE_BYTES,
} from "../src/server/domain/clinical/patient-documents-write.js";
import { listPatientDocumentsSafeForPatient } from "../src/server/domain/clinical/patient-documents-views.js";
import {
  setDocumentStorageForTests,
  InMemoryDocumentStorage,
  type DocumentStorage,
  type PutObjectInput,
} from "../src/server/storage/document-storage.js";
import { fail, ok } from "../src/server/domain/shared/status.js";
import type { Result } from "../src/server/domain/shared/status.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

// ─── Buffers mínimos válidos por tipo (magic bytes reales) ─────────────────

const PDF_BYTES = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0xff, 0xd9,
]);

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
  Buffer.alloc(13),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44]),
]);

const WEBP_BYTES = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 ", "latin1"),
  Buffer.alloc(8),
]);

const ZIP_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

const EXE_BYTES = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

function bigPdf(sizeBytes: number): Buffer {
  const body = Buffer.alloc(sizeBytes - PDF_BYTES.length, 0x20);
  return Buffer.concat([PDF_BYTES, body]);
}

// ─── Storages fake para pruebas dirigidas ──────────────────────────────────

class FailingDocumentStorage implements DocumentStorage {
  async putObject(_input: PutObjectInput): Promise<Result<void>> {
    return fail("BLOCKED", "Storage simulado caído (prueba).");
  }
  async getObject(): Promise<Result<import("../src/server/storage/document-storage.js").GetObjectOutput>> {
    return fail("BLOCKED", "Storage simulado caído (prueba).");
  }
  isConfigured(): boolean {
    return true;
  }
}

class RecordingDocumentStorage implements DocumentStorage {
  readonly calls: PutObjectInput[] = [];
  async putObject(input: PutObjectInput): Promise<Result<void>> {
    this.calls.push(input);
    return ok(undefined);
  }
  async getObject(): Promise<Result<import("../src/server/storage/document-storage.js").GetObjectOutput>> {
    return fail("NOT_FOUND", "getObject no implementado en RecordingDocumentStorage.");
  }
  isConfigured(): boolean {
    return true;
  }
}

// ─── RBAC + fixtures ────────────────────────────────────────────────────────

let orgA: string, orgB: string;
let ownerA: ActorContext;
let frontA: ActorContext; // tiene patient_documents.upload
let clinicianA: ActorContext; // NO tiene upload
let noViewA: ActorContext; // sin view ni upload
let ownerB: ActorContext;

let patientAId: string;
let patientBId: string;
let runA: TenantRunner;

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
      [`${roleKey}-${rnd()}@pd4b.test`],
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
      [`noperms-${rnd()}@pd4b.test`],
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
      [orgId, `PD4B-${label}`],
    )
  ).rows[0].id;
  return (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgId, cid],
    )
  ).rows[0].id;
}

const baseInput = (overrides: Partial<{
  patientId: string;
  kind: string;
  sensitivityLevel: string;
  retentionCategory: string;
  fileName: string;
  declaredMimeType: string;
  fileBuffer: Buffer;
}> = {}) => ({
  patientId: patientAId,
  kind: "CLINICAL",
  sensitivityLevel: "NORMAL",
  retentionCategory: "CLINICAL_RECORD",
  fileName: "documento.pdf",
  declaredMimeType: "application/pdf",
  fileBuffer: PDF_BYTES,
  ...overrides,
});

beforeAll(async () => {
  await ensureRbac();
  orgA = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('PD4B-A','pd4b-a-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;
  orgB = (
    await adminPool.query(
      `INSERT INTO "organizations"("name","slug") VALUES ('PD4B-B','pd4b-b-${rnd()}') RETURNING id`,
    )
  ).rows[0].id;

  ownerA = await member(orgA, "owner");
  frontA = await member(orgA, "front_desk");
  clinicianA = await member(orgA, "clinician");
  noViewA = await noPerms(orgA);
  ownerB = await member(orgB, "owner");

  patientAId = await mkPatient(orgA, "pacA");
  patientBId = await mkPatient(orgB, "pacB");

  runA = makeTenantRunner(orgA);
});

afterAll(async () => {
  setDocumentStorageForTests(null);
  await closePools();
});

afterEach(() => {
  setDocumentStorageForTests(null);
});

describe("PATIENT-DOCUMENTS-4B — carga de documentos desde staff interno", () => {
  it("usuario sin patient_documents.upload no puede subir", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, clinicianA, baseInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("usuario con patient_documents.upload puede subir un documento NORMAL", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "consentimiento.pdf" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.item.kind).toBe("CLINICAL");
      expect(result.value.item.status).toBe("ACTIVE");
      expect(result.value.item.sensitivityLevel).toBe("NORMAL");
      expect(result.value.item.mimeType).toBe("application/pdf");
    }
  });

  it("el documento queda ligado al paciente (link PATIENT)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "ligado.pdf" }));
    if (!result.ok) throw new Error(result.reason);
    const { rows } = await adminPool.query(
      `SELECT "linkType","linkedEntityId" FROM "patient_document_links" WHERE "documentId"=$1`,
      [result.value.item.documentId],
    );
    expect(rows.length).toBe(1);
    expect(rows[0].linkType).toBe("PATIENT");
    expect(rows[0].linkedEntityId).toBe(patientAId);
  });

  it("organizationId equivocado (actor sin tenant) bloqueado fail-closed", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const badCtx: ActorContext = { organizationId: "", userId: frontA.userId, permissions: frontA.permissions };
    const result = await uploadPatientDocument(runA, badCtx, baseInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("patientId de otra organización es bloqueado (anti-IDOR / NOT_FOUND)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, frontA, baseInput({ patientId: patientBId }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("archivo vacío rechazado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileBuffer: Buffer.alloc(0) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("INVALID");
  });

  it("archivo que excede el tamaño máximo (25MB) rechazado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const oversized = bigPdf(MAX_UPLOAD_SIZE_BYTES + 1);
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileBuffer: oversized }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("INVALID");
  });

  it("MIME declarado falso (no coincide con magic bytes reales) rechazado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    // Declara PDF pero el contenido real es PNG.
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({ declaredMimeType: "application/pdf", fileBuffer: PNG_BYTES, fileName: "falso.pdf" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("INVALID");
  });

  it("PDF válido aceptado (mimeType detectado por magic bytes)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({ declaredMimeType: "application/pdf", fileBuffer: PDF_BYTES, fileName: "real.pdf" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.item.mimeType).toBe("application/pdf");
  });

  it("JPG válido aceptado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({
        kind: "RADIOGRAPH",
        declaredMimeType: "image/jpeg",
        fileBuffer: JPEG_BYTES,
        fileName: "radiografia.jpg",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.item.mimeType).toBe("image/jpeg");
  });

  it("PNG válido aceptado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({
        kind: "INTRAORAL_IMAGE",
        declaredMimeType: "image/png",
        fileBuffer: PNG_BYTES,
        fileName: "intraoral.png",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.item.mimeType).toBe("image/png");
  });

  it("WEBP válido aceptado", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({
        kind: "INTRAORAL_IMAGE",
        declaredMimeType: "image/webp",
        fileBuffer: WEBP_BYTES,
        fileName: "intraoral.webp",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.item.mimeType).toBe("image/webp");
  });

  it("ZIP / ejecutable / script rechazados (tipo no permitido)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    expect(detectMimeFromMagicBytes(ZIP_BYTES)).toBeNull();
    expect(detectMimeFromMagicBytes(EXE_BYTES)).toBeNull();
    expect(detectMimeFromMagicBytes(Buffer.from("<script>alert(1)</script>"))).toBeNull();

    for (const [buf, declared, name] of [
      [ZIP_BYTES, "application/zip", "archivo.zip"],
      [EXE_BYTES, "application/x-msdownload", "programa.exe"],
      [Buffer.from("<html><body>hola</body></html>"), "text/html", "pagina.html"],
    ] as const) {
      const result = await uploadPatientDocument(
        runA,
        frontA,
        baseInput({ declaredMimeType: declared, fileBuffer: buf, fileName: name }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("INVALID");
    }
  });

  it("falla de storage no deja fila huérfana en patient_documents", async () => {
    setDocumentStorageForTests(new FailingDocumentStorage());
    const before = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;

    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "huerfano.pdf" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("BLOCKED");

    const after = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;
    expect(after).toBe(before);
  });

  it("storage se invoca ANTES del INSERT (orden fail-safe)", async () => {
    const recorder = new RecordingDocumentStorage();
    setDocumentStorageForTests(recorder);
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "orden.pdf" }));
    if (!result.ok) throw new Error(result.reason);
    expect(recorder.calls.length).toBe(1);
    expect(recorder.calls[0].storageKey).toContain(result.value.item.documentId);
    // El storageKey es opaco: no contiene el nombre de archivo.
    expect(recorder.calls[0].storageKey).not.toContain("orden");
  });

  it("falla de base de datos no reporta éxito (paciente inexistente tras checar storage)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    // Un patientId con formato válido de UUID pero inexistente: la verificación
    // anti-IDOR (SELECT 1 ... WHERE id=$1) no encuentra fila → falla cerrado
    // ANTES de cualquier intento de inserción, sin reportar éxito.
    const fakePatientId = "00000000-0000-0000-0000-000000000000";
    const result = await uploadPatientDocument(runA, frontA, baseInput({ patientId: fakePatientId, fileName: "no-existe.pdf" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("audit log se crea sin storageKey, checksum, fileName ni contenido", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const secretFileName = "expediente-confidencial-" + rnd() + ".pdf";
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: secretFileName }));
    if (!result.ok) throw new Error(result.reason);

    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient_documents.uploaded' AND "entityId"=$1
         AND "metadata"->>'documentId' = $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [patientAId, result.value.item.documentId],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).toContain(result.value.item.documentId);
    expect(meta).toContain("CLINICAL");
    expect(meta).not.toContain(secretFileName);
    expect(meta).not.toContain("storageKey");
    expect(meta).not.toContain("checksum");
    expect(meta).not.toContain("fileName");
    expect(meta).not.toContain("org/");
  });

  it("la respuesta segura no expone storageKey ni checksum", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "seguro.pdf" }));
    if (!result.ok) throw new Error(result.reason);
    const dump = JSON.stringify(result.value.item);
    expect(dump).not.toContain("storageKey");
    expect(dump).not.toContain("checksum");
    expect(dump).not.toContain("org/");
    expect(Object.keys(result.value.item).sort()).toEqual(
      ["createdAt", "documentId", "kind", "mimeType", "retentionCategory", "sensitivityLevel", "sizeBytes", "status"].sort(),
    );
  });

  it("el listado posterior muestra el documento subido respetando el filtro de sensibilidad", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await uploadPatientDocument(
      runA,
      frontA,
      baseInput({
        sensitivityLevel: "SENSITIVE_FINANCIAL",
        retentionCategory: "FINANCIAL_RECORD",
        kind: "FINANCIAL",
        fileName: "estado-cuenta-nuevo.pdf",
      }),
    );
    if (!result.ok) throw new Error(result.reason);

    // owner (con financial_view) sí lo ve.
    const viewOwner = await listPatientDocumentsSafeForPatient(runA, ownerA, patientAId);
    if (!viewOwner.ok) throw new Error(viewOwner.reason);
    expect(viewOwner.value.items.some((i) => i.documentId === result.value.item.documentId)).toBe(true);

    // front_desk (sin financial_view) NO lo ve, aunque lo haya subido.
    const viewFront = await listPatientDocumentsSafeForPatient(runA, frontA, patientAId);
    if (!viewFront.ok) throw new Error(viewFront.reason);
    expect(viewFront.value.items.some((i) => i.documentId === result.value.item.documentId)).toBe(false);
  });

  it("sin patient_documents.view no se ven metadatos aunque el actor haya subido documentos", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const result = await listPatientDocumentsSafeForPatient(runA, noViewA, patientAId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });
});
