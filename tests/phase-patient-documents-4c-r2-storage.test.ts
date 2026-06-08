// NELZZON — Pruebas PATIENT-DOCUMENTS-4C-R2-STORAGE-ADAPTER.
// Sin credenciales reales, sin bucket real, sin red: el cliente S3Client se
// intercepta con un spy sobre `.send`, simulando R2 vía la API S3-compatible.
// Cubre: resolución de configuración por variables de entorno (driver +
// 4 variables requeridas), forma exacta del PutObjectCommand (Bucket/Key/
// Body/ContentType, SIN ACL ni Metadata), traducción segura de errores
// (sin endpoint/bucket/account id/credenciales), y que uploadPatientDocument
// sigue fail-closed (sin filas huérfanas) con el adaptador real simulado.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { adminPool, closePools } from "./harness.js";
import { PERMISSIONS, ROLES } from "../src/server/domain/identity/rbac.js";
import type { ActorContext } from "../src/server/domain/identity/authorize.js";
import { makeTenantRunner } from "../src/server/db/tenant.js";
import type { TenantRunner } from "../src/server/domain/identity/authorize.js";
import { uploadPatientDocument } from "../src/server/domain/clinical/patient-documents-write.js";
import {
  getDocumentStorage,
  isDocumentStorageConfigured,
  getDocumentStorageStatus,
  setDocumentStorageForTests,
  resetDocumentStorageForTests,
} from "../src/server/storage/document-storage.js";
import { R2DocumentStorage } from "../src/server/storage/r2-document-storage.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const rnd = () => Math.random().toString(36).slice(2, 8);

const PDF_BYTES = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");

const ENV_KEYS = [
  "DOCUMENT_STORAGE_DRIVER",
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

const SECRET_VALUES = {
  DOCUMENT_STORAGE_DRIVER: "r2",
  R2_ACCOUNT_ID: "acct-secret-" + rnd(),
  R2_BUCKET_NAME: "bucket-secret-" + rnd(),
  R2_ACCESS_KEY_ID: "akid-secret-" + rnd(),
  R2_SECRET_ACCESS_KEY: "sak-secret-" + rnd(),
};

let savedEnv: Record<string, string | undefined> = {};

function snapshotEnv() {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function setFullValidEnv() {
  for (const k of ENV_KEYS) process.env[k] = SECRET_VALUES[k];
}

// ─── RBAC + fixtures (mínimos, solo para uploadPatientDocument) ────────────

let orgA: string;
let frontA: ActorContext;
let patientAId: string;
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
      [`${roleKey}-${rnd()}@pd4c.test`],
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

async function mkPatient(orgId: string, label: string) {
  const cid = (
    await adminPool.query(
      `INSERT INTO "contacts"("organizationId","fullName") VALUES ($1,$2) RETURNING id`,
      [orgId, `PD4C-${label}`],
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
  patientId: string; kind: string; sensitivityLevel: string; retentionCategory: string;
  fileName: string; declaredMimeType: string; fileBuffer: Buffer;
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
  snapshotEnv();
  await ensureRbac();
  orgA = (
    await adminPool.query(`INSERT INTO "organizations"("name","slug") VALUES ('PD4C-A','pd4c-a-${rnd()}') RETURNING id`)
  ).rows[0].id;
  frontA = await member(orgA, "front_desk");
  patientAId = await mkPatient(orgA, "pacA");
  runA = makeTenantRunner(orgA);
});

afterEach(() => {
  restoreEnv();
  resetDocumentStorageForTests();
  vi.restoreAllMocks();
});

afterAll(async () => {
  restoreEnv();
  resetDocumentStorageForTests();
  await closePools();
});

describe("PATIENT-DOCUMENTS-4C — resolución de configuración por variables de entorno", () => {
  it("sin variables de entorno → isDocumentStorageConfigured() es false", () => {
    clearEnv();
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(false);
    expect(getDocumentStorageStatus()).toBe("unconfigured");
    expect(getDocumentStorage()).not.toBeInstanceOf(R2DocumentStorage);
  });

  it("DOCUMENT_STORAGE_DRIVER distinto de 'r2' → false (aunque el resto exista)", () => {
    setFullValidEnv();
    process.env.DOCUMENT_STORAGE_DRIVER = "s3";
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(false);
    expect(getDocumentStorageStatus()).toBe("unconfigured");
  });

  it("configuración parcial (faltan variables) → false", () => {
    clearEnv();
    process.env.DOCUMENT_STORAGE_DRIVER = "r2";
    process.env.R2_ACCOUNT_ID = SECRET_VALUES.R2_ACCOUNT_ID;
    process.env.R2_BUCKET_NAME = SECRET_VALUES.R2_BUCKET_NAME;
    // Faltan R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY.
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(false);
    expect(getDocumentStorageStatus()).toBe("unconfigured");
  });

  it("configuración completa con driver='r2' → true y se construye R2DocumentStorage", () => {
    setFullValidEnv();
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(true);
    expect(getDocumentStorageStatus()).toBe("configured");
    expect(getDocumentStorage()).toBeInstanceOf(R2DocumentStorage);
  });

  it("setDocumentStorageForTests tiene prioridad sobre las variables de entorno", () => {
    setFullValidEnv();
    setDocumentStorageForTests(null);
    expect(isDocumentStorageConfigured()).toBe(false);
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(true);
  });
});

describe("PATIENT-DOCUMENTS-4C — R2DocumentStorage.putObject (S3Client interceptado, sin red real)", () => {
  it("llama PutObjectCommand con Bucket, Key, Body y ContentType correctos — sin ACL ni Metadata", async () => {
    const sent: any[] = [];
    const sendSpy = vi.spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      sent.push(command);
      return {} as any;
    });

    const storage = new R2DocumentStorage({
      accountId: "acct-test",
      bucketName: "bucket-test",
      accessKeyId: "akid-test",
      secretAccessKey: "sak-test",
    });

    const result = await storage.putObject({
      storageKey: "org/abc/patient/def/doc-123",
      body: PDF_BYTES,
      mimeType: "application/pdf",
    });

    expect(result.ok).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sent.length).toBe(1);
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);

    const input = sent[0].input;
    expect(input.Bucket).toBe("bucket-test");
    expect(input.Key).toBe("org/abc/patient/def/doc-123");
    expect(input.Body).toBe(PDF_BYTES);
    expect(input.ContentType).toBe("application/pdf");

    // No ACL público, no Metadata (ni fileName ni nada clínico).
    expect(input.ACL).toBeUndefined();
    expect(input.Metadata).toBeUndefined();
  });

  it("nunca manda fileName ni storageKey como metadata del objeto", async () => {
    const sent: any[] = [];
    vi.spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      sent.push(command);
      return {} as any;
    });

    const storage = new R2DocumentStorage({
      accountId: "acct-test",
      bucketName: "bucket-test",
      accessKeyId: "akid-test",
      secretAccessKey: "sak-test",
    });

    await storage.putObject({
      storageKey: "org/abc/patient/def/doc-456",
      body: PDF_BYTES,
      mimeType: "application/pdf",
    });

    const input = sent[0].input;
    const dump = JSON.stringify(input);
    expect(dump).not.toContain("fileName");
    expect(dump).not.toContain("Metadata");
    expect(dump).not.toContain("ACL");
  });

  it("ante una falla de R2/S3 devuelve Result.fail seguro sin filtrar endpoint/bucket/credenciales", async () => {
    const accountSecret = "acct-" + rnd();
    const bucketSecret = "bucket-" + rnd();
    const akidSecret = "akid-" + rnd();
    const sakSecret = "sak-" + rnd();

    vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => {
      throw new Error(
        `NetworkingError: failed to fetch https://${accountSecret}.r2.cloudflarestorage.com/${bucketSecret} ` +
          `with credentials akid=${akidSecret} secret=${sakSecret}`,
      );
    });

    const storage = new R2DocumentStorage({
      accountId: accountSecret,
      bucketName: bucketSecret,
      accessKeyId: akidSecret,
      secretAccessKey: sakSecret,
    });

    const result = await storage.putObject({
      storageKey: "org/abc/patient/def/doc-789",
      body: PDF_BYTES,
      mimeType: "application/pdf",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("BLOCKED");
      const msg = `${result.reason} ${result.detail ?? ""}`;
      expect(msg).not.toContain(accountSecret);
      expect(msg).not.toContain(bucketSecret);
      expect(msg).not.toContain(akidSecret);
      expect(msg).not.toContain(sakSecret);
      expect(msg).not.toContain("r2.cloudflarestorage.com");
      expect(msg).not.toContain("NetworkingError");
    }
  });

  it("la respuesta exitosa nunca expone el storageKey al llamador (Result<void>)", async () => {
    vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({} as any));

    const storage = new R2DocumentStorage({
      accountId: "acct-test", bucketName: "bucket-test",
      accessKeyId: "akid-test", secretAccessKey: "sak-test",
    });

    const result = await storage.putObject({
      storageKey: "org/abc/patient/def/doc-999",
      body: PDF_BYTES,
      mimeType: "application/pdf",
    });

    // Result<void>: el "value" en éxito es undefined — no hay forma de que
    // el storageKey viaje de vuelta al llamador a través de este contrato.
    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("PATIENT-DOCUMENTS-4C — uploadPatientDocument con storage R2 simulado", () => {
  it("storage no configurado (env vacío) → no inserta fila (BLOCKED, fail-closed)", async () => {
    clearEnv();
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(false);

    const before = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;

    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "sin-storage.pdf" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("BLOCKED");

    const after = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;
    expect(after).toBe(before);
  });

  it("con env completo y S3Client interceptado (éxito), uploadPatientDocument inserta y no expone storageKey/checksum", async () => {
    setFullValidEnv();
    resetDocumentStorageForTests();
    expect(isDocumentStorageConfigured()).toBe(true);

    const sent: any[] = [];
    vi.spyOn(S3Client.prototype, "send").mockImplementation(async (command: any) => {
      sent.push(command);
      return {} as any;
    });

    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "via-r2-simulado.pdf" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dump = JSON.stringify(result.value.item);
      expect(dump).not.toContain("storageKey");
      expect(dump).not.toContain("checksum");
      expect(dump).not.toContain(SECRET_VALUES.R2_BUCKET_NAME);
      expect(dump).not.toContain(SECRET_VALUES.R2_ACCOUNT_ID);
    }
    expect(sent.length).toBe(1);
    expect(sent[0].input.Bucket).toBe(SECRET_VALUES.R2_BUCKET_NAME);
    expect(sent[0].input.ACL).toBeUndefined();
    expect(sent[0].input.Metadata).toBeUndefined();
  });

  it("con env completo pero R2 simulado fallando, no deja fila huérfana (BLOCKED, sin secretos en el error)", async () => {
    setFullValidEnv();
    resetDocumentStorageForTests();

    vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => {
      throw new Error(`boom ${SECRET_VALUES.R2_BUCKET_NAME} ${SECRET_VALUES.R2_SECRET_ACCESS_KEY}`);
    });

    const before = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;

    const result = await uploadPatientDocument(runA, frontA, baseInput({ fileName: "r2-caido.pdf" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("BLOCKED");
      expect(result.detail ?? "").not.toContain(SECRET_VALUES.R2_BUCKET_NAME);
      expect(result.detail ?? "").not.toContain(SECRET_VALUES.R2_SECRET_ACCESS_KEY);
    }

    const after = (
      await adminPool.query(`SELECT COUNT(*)::int AS cnt FROM "patient_documents" WHERE "organizationId"=$1`, [orgA])
    ).rows[0].cnt;
    expect(after).toBe(before);
  });
});
