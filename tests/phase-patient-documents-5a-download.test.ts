// NELZZON — Pruebas PATIENT-DOCUMENTS-5A-SECURE-DOWNLOAD-INTERNAL.
// Postgres real + RLS + permisos. Sin signed URLs, sin redirect a R2.
// Cubre: permisos (download+view), estados de documento (solo ACTIVE),
// filtro de sensibilidad, anti-IDOR multi-tenant, sanitización de
// Content-Disposition, storage failure segura, auditoría sin datos internos,
// y que storageKey/checksum/bucket/accountId nunca aparecen en respuesta.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import type { TenantRunner } from "../src/server/domain/identity/authorize.js";
import {
  downloadPatientDocument,
  sanitizeFilenameForContentDisposition,
} from "../src/server/domain/clinical/patient-documents-download.js";
import {
  setDocumentStorageForTests,
  InMemoryDocumentStorage,
  type DocumentStorage,
  type GetObjectOutput,
} from "../src/server/storage/document-storage.js";
import { fail } from "../src/server/domain/shared/status.js";
import type { Result } from "../src/server/domain/shared/status.js";
import type { PutObjectInput } from "../src/server/storage/document-storage.js";

const rnd = () => Math.random().toString(36).slice(2, 8);

// Bytes mínimos PDF válido (magic bytes reales).
const PDF_BYTES = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");

// Storage que falla al leer (putObject funciona para poder insertar fila).
class PutOkGetFailStorage implements DocumentStorage {
  private readonly inner = new InMemoryDocumentStorage();
  async putObject(input: PutObjectInput): Promise<Result<void>> {
    return this.inner.putObject(input);
  }
  async getObject(_storageKey: string): Promise<Result<GetObjectOutput>> {
    return fail("BLOCKED", "Storage simulado caído al leer.");
  }
  isConfigured(): boolean {
    return true;
  }
}

// ─── RBAC + fixtures ────────────────────────────────────────────────────────

let orgA: string, orgB: string;
let ownerA: ActorContext; // download + view + sensitive_clinical_view + financial_view + sensitive_personal_view
let clinicianA: ActorContext; // view + sensitive_clinical_view, SIN download
let noViewA: ActorContext; // sin view ni download

let patientAId: string;
let patientBId: string;
let runA: TenantRunner;

const SECRET_STORAGE_KEY = `org/test/patient/test/doc-${rnd()}`;
const SECRET_CHECKSUM = `sha256-${rnd()}`;

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
      [`${roleKey}-${rnd()}@pd5a.test`],
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
      [`noperms-${rnd()}@pd5a.test`],
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
      [orgId, `PD5A-${label}`],
    )
  ).rows[0].id;
  return (
    await adminPool.query(
      `INSERT INTO "patients"("organizationId","contactId","status","state") VALUES ($1,$2,'ACTIVE','OK') RETURNING id`,
      [orgId, cid],
    )
  ).rows[0].id;
}

async function insertDoc(
  orgId: string,
  patId: string,
  opts: {
    fileName?: string;
    status?: string;
    sensitivityLevel?: string;
    storageKey?: string;
  } = {},
): Promise<string> {
  const storageKey = opts.storageKey ?? `org/test/patient/${patId}/doc-${rnd()}`;
  return (
    await adminPool.query(
      `INSERT INTO "patient_documents"
         ("organizationId","patientId","kind","fileName","mimeType","sizeBytes","storageKey","checksum",
          "uploadedByUserId","uploadedVia","retentionCategory","status","sensitivityLevel")
       VALUES ($1,$2,'CLINICAL',$3,'application/pdf',42,$4,$5,$6,'STAFF','CLINICAL_RECORD',$7,$8)
       RETURNING id`,
      [
        orgId, patId,
        opts.fileName ?? "documento.pdf",
        storageKey,
        SECRET_CHECKSUM,
        ownerA.userId,
        opts.status ?? "ACTIVE",
        opts.sensitivityLevel ?? "NORMAL",
      ],
    )
  ).rows[0].id;
}

beforeAll(async () => {
  await ensureRbac();
  orgA = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('PD5A-A','pd5a-a-${rnd()}') RETURNING id`)).rows[0].id;
  orgB = (await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('PD5A-B','pd5a-b-${rnd()}') RETURNING id`)).rows[0].id;

  ownerA = await member(orgA, "owner");
  clinicianA = await member(orgA, "clinician");
  noViewA = await noPerms(orgA);
  await member(orgB, "owner");

  patientAId = await mkPatient(orgA, "pacA");
  patientBId = await mkPatient(orgB, "pacB");
  runA = makeTenantRunner(orgA);
});

afterEach(() => {
  setDocumentStorageForTests(null);
});

afterAll(async () => {
  setDocumentStorageForTests(null);
  await closePools();
});

// ─── sanitizeFilenameForContentDisposition (unit tests) ───────────────────

describe("sanitizeFilenameForContentDisposition — unit", () => {
  it("nombre normal se devuelve limpio", () => {
    expect(sanitizeFilenameForContentDisposition("radiografia.pdf", "doc-1", "application/pdf"))
      .toBe("radiografia.pdf");
  });

  it("path traversal ../ eliminado", () => {
    const result = sanitizeFilenameForContentDisposition("../../etc/passwd.pdf", "doc-2", "application/pdf");
    expect(result).not.toContain("../");
    expect(result).not.toContain("..");
  });

  it("caracteres de control (CR LF null) eliminados — previene header injection", () => {
    const malicious = "archivo\r\nX-Injected: evil\r\n.pdf";
    const result = sanitizeFilenameForContentDisposition(malicious, "doc-3", "application/pdf");
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n");
  });

  it("comillas peligrosas eliminadas", () => {
    const result = sanitizeFilenameForContentDisposition('archivo"malo.pdf', "doc-4", "application/pdf");
    expect(result).not.toContain('"');
  });

  it("nombre vacío produce fallback documento-<id>.pdf", () => {
    const result = sanitizeFilenameForContentDisposition("", "doc-5", "application/pdf");
    expect(result).toBe("documento-doc-5.pdf");
  });

  it("nombre con solo caracteres peligrosos produce fallback", () => {
    const result = sanitizeFilenameForContentDisposition("../../../", "doc-6", "application/pdf");
    expect(result).toBe("documento-doc-6.pdf");
  });

  it("mimeType desconocido usa extensión .bin en fallback", () => {
    const result = sanitizeFilenameForContentDisposition("", "doc-7", "application/octet-stream");
    expect(result).toBe("documento-doc-7.bin");
  });

  it("nombre largo se trunca a 200 caracteres", () => {
    const long = "a".repeat(300) + ".pdf";
    const result = sanitizeFilenameForContentDisposition(long, "doc-8", "application/pdf");
    expect(result.length).toBeLessThanOrEqual(200);
  });
});

// ─── Dominio: downloadPatientDocument ─────────────────────────────────────

describe("PATIENT-DOCUMENTS-5A — downloadPatientDocument (dominio)", () => {
  it("descarga exitosa con permiso download + view, documento ACTIVE, sensibilidad NORMAL", async () => {
    const mem = new InMemoryDocumentStorage();
    const storageKey = `org/${orgA}/patient/${patientAId}/doc-${rnd()}`;
    await mem.putObject({ storageKey, body: PDF_BYTES, mimeType: "application/pdf" });
    setDocumentStorageForTests(mem);

    const docId = await insertDoc(orgA, patientAId, { storageKey });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bytes).toEqual(PDF_BYTES);
      expect(result.value.mimeType).toBe("application/pdf");
      expect(result.value.contentLength).toBe(PDF_BYTES.length);
      // safeFileName no debe incluir storageKey ni checksum.
      expect(result.value.safeFileName).not.toContain(storageKey);
      expect(result.value.safeFileName).not.toContain(SECRET_CHECKSUM);
    }
  });

  it("sin patient_documents.download → FORBIDDEN (aunque tenga view)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const docId = await insertDoc(orgA, patientAId);
    // clinicianA tiene view pero no download.
    const result = await downloadPatientDocument(runA, clinicianA, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("sin patient_documents.view ni download → FORBIDDEN", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const docId = await insertDoc(orgA, patientAId);
    const result = await downloadPatientDocument(runA, noViewA, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("documento VOIDED no descarga → FORBIDDEN", async () => {
    const mem = new InMemoryDocumentStorage();
    setDocumentStorageForTests(mem);
    const docId = await insertDoc(orgA, patientAId, { status: "VOIDED" });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("documento SUPERSEDED no descarga → FORBIDDEN", async () => {
    const mem = new InMemoryDocumentStorage();
    setDocumentStorageForTests(mem);
    const docId = await insertDoc(orgA, patientAId, { status: "SUPERSEDED" });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("sensibilidad SENSITIVE_CLINICAL sin sensitive_clinical_view → FORBIDDEN", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const docId = await insertDoc(orgA, patientAId, { sensitivityLevel: "SENSITIVE_CLINICAL" });
    const front = await member(orgA, "front_desk");
    // Construimos manualmente un ctx con download+view pero sin sensitive_clinical_view.
    const limitedCtx: ActorContext = {
      organizationId: orgA,
      userId: front.userId,
      permissions: new Set(["patient_documents.view", "patient_documents.download"]),
    };
    const result = await downloadPatientDocument(runA, limitedCtx, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("patientId de otra organización → NOT_FOUND (anti-IDOR / RLS)", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const docBId = await insertDoc(orgB, patientBId);
    // runA solo ve datos de orgA (RLS) — el documento de orgB es invisible.
    const result = await downloadPatientDocument(runA, ownerA, patientBId, docBId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("documentId inexistente → NOT_FOUND", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const result = await downloadPatientDocument(runA, ownerA, patientAId, fakeId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("storage falla → BLOCKED, sin storageKey/bucket/accountId en el error", async () => {
    setDocumentStorageForTests(new PutOkGetFailStorage());
    const storageKey = `org/${orgA}/patient/${patientAId}/doc-${rnd()}`;
    const docId = await insertDoc(orgA, patientAId, { storageKey });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("BLOCKED");
      // El detalle no debe contener datos internos.
      expect(result.detail ?? "").not.toContain(storageKey);
      expect(result.detail ?? "").not.toContain(orgA);
    }
  });

  it("la respuesta exitosa no expone storageKey ni checksum", async () => {
    const mem = new InMemoryDocumentStorage();
    const storageKey = `org/${orgA}/patient/${patientAId}/SECRETKEY-${rnd()}`;
    await mem.putObject({ storageKey, body: PDF_BYTES, mimeType: "application/pdf" });
    setDocumentStorageForTests(mem);

    const docId = await insertDoc(orgA, patientAId, { storageKey });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);

    if (!result.ok) throw new Error(result.reason);
    const dump = JSON.stringify(result.value);
    expect(dump).not.toContain(storageKey);
    expect(dump).not.toContain(SECRET_CHECKSUM);
    expect(dump).not.toContain("SECRETKEY");
    // Los únicos campos en DownloadDocumentResult son: bytes, mimeType, contentLength, safeFileName.
    expect(Object.keys(result.value).sort()).toEqual(
      ["bytes", "contentLength", "mimeType", "safeFileName"].sort(),
    );
  });

  it("audit log de descarga exitosa no contiene storageKey ni checksum", async () => {
    const mem = new InMemoryDocumentStorage();
    const storageKey = `org/${orgA}/patient/${patientAId}/audit-test-${rnd()}`;
    await mem.putObject({ storageKey, body: PDF_BYTES, mimeType: "application/pdf" });
    setDocumentStorageForTests(mem);

    const docId = await insertDoc(orgA, patientAId, { storageKey });
    const result = await downloadPatientDocument(runA, ownerA, patientAId, docId);
    if (!result.ok) throw new Error(result.reason);

    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient_documents.downloaded'
         AND "metadata"->>'documentId' = $1
       ORDER BY "createdAt" DESC LIMIT 1`,
      [docId],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).toContain(docId);
    expect(meta).not.toContain(storageKey);
    expect(meta).not.toContain(SECRET_CHECKSUM);
    expect(meta).not.toContain("storageKey");
    expect(meta).not.toContain("checksum");
    expect(meta).not.toContain("bucket");
    expect(meta).not.toContain("accountId");
  });

  it("audit log de descarga denegada no contiene storageKey ni informacion de bucket", async () => {
    setDocumentStorageForTests(new InMemoryDocumentStorage());
    const docId = await insertDoc(orgA, patientAId, { storageKey: SECRET_STORAGE_KEY });
    // clinicianA no tiene download.
    await downloadPatientDocument(runA, clinicianA, patientAId, docId);

    const { rows } = await adminPool.query(
      `SELECT "metadata" FROM "audit_logs"
       WHERE "action"='patient_documents.download_denied'
         AND "metadata"->>'documentId' = $1
       ORDER BY "createdAt" DESC LIMIT 1`,
      [docId],
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.stringify(rows[0].metadata ?? {});
    expect(meta).not.toContain(SECRET_STORAGE_KEY);
    expect(meta).not.toContain(SECRET_CHECKSUM);
    expect(meta).not.toContain("storageKey");
  });
});

// ─── InMemoryDocumentStorage.getObject ────────────────────────────────────

describe("InMemoryDocumentStorage.getObject", () => {
  it("devuelve bytes y contentType del objeto subido", async () => {
    const mem = new InMemoryDocumentStorage();
    await mem.putObject({ storageKey: "key-1", body: PDF_BYTES, mimeType: "application/pdf" });
    const result = await mem.getObject("key-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bytes).toEqual(PDF_BYTES);
      expect(result.value.contentType).toBe("application/pdf");
      expect(result.value.contentLength).toBe(PDF_BYTES.length);
    }
  });

  it("clave inexistente devuelve NOT_FOUND", async () => {
    const mem = new InMemoryDocumentStorage();
    const result = await mem.getObject("no-existe");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });
});
