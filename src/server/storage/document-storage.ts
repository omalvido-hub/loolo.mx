// NELZZON — Capa de almacenamiento de documentos (PATIENT-DOCUMENTS-4B / 4C).
// Los archivos NUNCA se guardan en Postgres ni en disco del VPS: solo viven
// metadatos en patient_documents.storageKey, que referencia un objeto en
// almacenamiento compatible con S3 (Cloudflare R2 — ver R2DocumentStorage).
//
// 4C agrega el adaptador REAL de R2 (r2-document-storage.ts), pero esta fase
// NO configura credenciales reales (regla explícita: "NO Cloudflare real. NO
// R2 real."). El adaptador real solo se activa cuando TODAS las variables de
// entorno requeridas existen Y DOCUMENT_STORAGE_DRIVER='r2'
// (ver resolveR2ConfigFromEnv). Mientras falte cualquiera, se usa
// UnconfiguredDocumentStorage: falla cerrado con un mensaje claro, SIN dejar
// fila huérfana en patient_documents (el INSERT ocurre después del putObject).
//
// Variables de entorno esperadas (NO definidas aquí, NO en .env real todavía):
//   DOCUMENT_STORAGE_DRIVER=r2
//   R2_ACCOUNT_ID=...
//   R2_BUCKET_NAME=...
//   R2_ACCESS_KEY_ID=...
//   R2_SECRET_ACCESS_KEY=...
//
// Para pruebas existe InMemoryDocumentStorage, inyectable vía
// setDocumentStorageForTests — nunca se usa en producción real.

import { ok, fail } from "../domain/shared/status.js";
import type { Result } from "../domain/shared/status.js";
import { R2DocumentStorage, type R2StorageConfig } from "./r2-document-storage.js";

export interface PutObjectInput {
  storageKey: string;
  body: Buffer;
  mimeType: string;
}

export interface GetObjectOutput {
  bytes: Buffer;
  contentType: string | null;
  contentLength: number;
}

export interface DocumentStorage {
  putObject(input: PutObjectInput): Promise<Result<void>>;
  /**
   * Lee un objeto del storage por su storageKey opaco. Devuelve los bytes
   * completos — el dominio decide qué exponer al cliente (nunca el storageKey).
   * NOT_FOUND si la clave no existe; BLOCKED si el storage falla o no está
   * configurado.
   */
  getObject(storageKey: string): Promise<Result<GetObjectOutput>>;
  /**
   * Indica si este storage está listo para recibir archivos reales.
   * NO expone nombres de variables, credenciales ni detalles internos —
   * es una señal booleana para que la UI decida si mostrar el formulario
   * de carga (ver isDocumentStorageConfigured / getDocumentStorageStatus).
   */
  isConfigured(): boolean;
}

/** Almacenamiento en memoria — SOLO pruebas/desarrollo. Se pierde al reiniciar el proceso. */
export class InMemoryDocumentStorage implements DocumentStorage {
  private readonly objects = new Map<string, { body: Buffer; mimeType: string }>();

  async putObject({ storageKey, body, mimeType }: PutObjectInput): Promise<Result<void>> {
    this.objects.set(storageKey, { body, mimeType });
    return ok(undefined);
  }

  async getObject(storageKey: string): Promise<Result<GetObjectOutput>> {
    const entry = this.objects.get(storageKey);
    if (!entry) {
      return fail("NOT_FOUND", "El objeto no existe en el almacenamiento.");
    }
    return ok({
      bytes: entry.body,
      contentType: entry.mimeType,
      contentLength: entry.body.length,
    });
  }

  isConfigured(): boolean {
    return true;
  }

  has(storageKey: string): boolean {
    return this.objects.has(storageKey);
  }

  sizeOf(storageKey: string): number | null {
    return this.objects.get(storageKey)?.body.length ?? null;
  }
}

/**
 * Storage real S3/R2-compatible — pendiente de credenciales reales.
 * Falla cerrado: ninguna escritura en patient_documents ocurre si esto falla,
 * porque el dominio llama putObject ANTES del INSERT.
 */
class UnconfiguredDocumentStorage implements DocumentStorage {
  async putObject(): Promise<Result<void>> {
    return fail(
      "BLOCKED",
      "Almacenamiento de documentos no configurado todavía (faltan credenciales reales de S3/R2). " +
        "No se guardó ningún archivo ni se creó ningún registro.",
    );
  }

  async getObject(): Promise<Result<GetObjectOutput>> {
    return fail(
      "BLOCKED",
      "Almacenamiento de documentos no configurado todavía. No se puede descargar el archivo.",
    );
  }

  isConfigured(): boolean {
    return false;
  }
}

/**
 * Lee la configuración de R2 desde variables de entorno. Solo devuelve una
 * configuración válida si DOCUMENT_STORAGE_DRIVER='r2' Y existen las cuatro
 * variables requeridas — configuración parcial cuenta como "no configurado".
 * No valida ni transforma los valores: solo confirma que están presentes.
 */
function resolveR2ConfigFromEnv(): R2StorageConfig | null {
  if (process.env.DOCUMENT_STORAGE_DRIVER !== "r2") return null;

  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) return null;

  return { accountId, bucketName, accessKeyId, secretAccessKey };
}

const NO_OVERRIDE = Symbol("document-storage-no-override");
let storageOverride: DocumentStorage | typeof NO_OVERRIDE = NO_OVERRIDE;

/**
 * Resuelve el storage activo:
 *   1. Si una prueba inyectó un storage (setDocumentStorageForTests), se usa ese.
 *   2. Si no, se construye desde variables de entorno (R2DocumentStorage) cuando
 *      la configuración está completa.
 *   3. En cualquier otro caso, UnconfiguredDocumentStorage (fail-closed).
 * No se cachea: las variables de entorno de un proceso Node no cambian en
 * caliente en producción, y no cachear simplifica las pruebas que las simulan.
 */
export function getDocumentStorage(): DocumentStorage {
  if (storageOverride !== NO_OVERRIDE) return storageOverride;

  const r2Config = resolveR2ConfigFromEnv();
  if (r2Config) return new R2DocumentStorage(r2Config);

  return new UnconfiguredDocumentStorage();
}

/**
 * Señal segura para la UI: ¿el storage activo está listo para recibir archivos
 * reales? NUNCA expone nombres de variables, credenciales, bucket ni detalles
 * internos — solo un booleano. Mientras no haya configuración válida de R2,
 * devuelve false y la UI debe ocultar el formulario de carga.
 */
export function isDocumentStorageConfigured(): boolean {
  return getDocumentStorage().isConfigured();
}

export type DocumentStorageStatus = "configured" | "unconfigured";

/** Variante en forma de estado legible, por si la UI prefiere distinguir casos a futuro. */
export function getDocumentStorageStatus(): DocumentStorageStatus {
  return getDocumentStorage().isConfigured() ? "configured" : "unconfigured";
}

/**
 * SOLO pruebas: fuerza el storage activo a `storage`, o a
 * UnconfiguredDocumentStorage si se pasa null. Tiene prioridad sobre la
 * resolución por variables de entorno — útil para simular fallas o un storage
 * en memoria sin depender de configuración real.
 */
export function setDocumentStorageForTests(storage: DocumentStorage | null): void {
  storageOverride = storage ?? new UnconfiguredDocumentStorage();
}

/**
 * SOLO pruebas: elimina cualquier override y vuelve a la resolución normal
 * (variables de entorno → R2DocumentStorage o UnconfiguredDocumentStorage).
 * Necesario para probar isDocumentStorageConfigured()/getDocumentStorageStatus()
 * bajo distintas combinaciones de variables de entorno simuladas.
 */
export function resetDocumentStorageForTests(): void {
  storageOverride = NO_OVERRIDE;
}
