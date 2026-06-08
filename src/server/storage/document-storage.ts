// NELZZON — Capa de almacenamiento de documentos (PATIENT-DOCUMENTS-4B).
// Los archivos NUNCA se guardan en Postgres ni en disco del VPS: solo viven
// metadatos en patient_documents.storageKey, que referencia un objeto en
// almacenamiento compatible con S3 (Cloudflare R2 recomendado — ver 4A).
//
// Esta fase NO configura credenciales reales de R2/S3 (regla explícita de
// PATIENT-DOCUMENTS-4B: "NO Cloudflare real. NO R2 real."). Por eso:
//   - El storage real queda DESHABILITADO y falla cerrado con un mensaje claro,
//     SIN dejar fila huérfana en patient_documents (el INSERT ocurre después).
//   - Para pruebas existe InMemoryDocumentStorage, inyectable vía
//     setDocumentStorageForTests — nunca se usa en producción real.
// Cablear el cliente S3/R2 real (con credenciales reales y prueba contra el
// bucket real) es trabajo de una fase futura dedicada, fuera de este alcance.

import { ok, fail } from "../domain/shared/status.js";
import type { Result } from "../domain/shared/status.js";

export interface PutObjectInput {
  storageKey: string;
  body: Buffer;
  mimeType: string;
}

export interface DocumentStorage {
  putObject(input: PutObjectInput): Promise<Result<void>>;
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

  isConfigured(): boolean {
    return false;
  }
}

let activeStorage: DocumentStorage = new UnconfiguredDocumentStorage();

/**
 * Resuelve el storage activo. Hoy SIEMPRE es UnconfiguredDocumentStorage en
 * producción (fail-closed) — cablear el cliente real es una fase futura que
 * requiere credenciales reales y prueba contra el bucket real.
 */
export function getDocumentStorage(): DocumentStorage {
  return activeStorage;
}

/**
 * Señal segura para la UI: ¿el storage activo está listo para recibir archivos
 * reales? NUNCA expone nombres de variables, credenciales, bucket ni detalles
 * internos — solo un booleano. Mientras sea UnconfiguredDocumentStorage,
 * devuelve false y la UI debe ocultar el formulario de carga.
 */
export function isDocumentStorageConfigured(): boolean {
  return activeStorage.isConfigured();
}

export type DocumentStorageStatus = "configured" | "unconfigured";

/** Variante en forma de estado legible, por si la UI prefiere distinguir casos a futuro. */
export function getDocumentStorageStatus(): DocumentStorageStatus {
  return activeStorage.isConfigured() ? "configured" : "unconfigured";
}

/** SOLO pruebas: inyecta un storage fake (p.ej. InMemoryDocumentStorage) o lo restablece con null. */
export function setDocumentStorageForTests(storage: DocumentStorage | null): void {
  activeStorage = storage ?? new UnconfiguredDocumentStorage();
}
