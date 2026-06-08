// NELZZON — Adaptador de almacenamiento Cloudflare R2 (S3-compatible) para
// documentos del paciente (PATIENT-DOCUMENTS-4C). Implementación REAL del
// cliente, pero esta fase NO conecta credenciales reales — ver
// resolveR2ConfigFromEnv() en document-storage.ts, que solo construye este
// adaptador cuando TODAS las variables de entorno requeridas están presentes.
//
// Decisiones de seguridad (no negociables en este adaptador):
//   - putObject NUNCA manda ACL: el bucket permanece privado por defecto.
//   - putObject NUNCA manda Metadata de objeto: ni fileName ni datos clínicos
//     viajan junto al archivo en el proveedor de almacenamiento.
//   - El Key es el storageKey opaco ya generado por el dominio — esta capa no
//     decide rutas ni nombres.
//   - El ContentType es el mimeType detectado por magic bytes en servidor,
//     nunca el declarado por el cliente.
//   - Los errores de R2/S3 NUNCA se propagan tal cual: pueden contener el
//     endpoint, el nombre del bucket o fragmentos de la petición firmada.
//     Se traduce todo a un mensaje genérico y seguro.
//   - No hay download, no hay signed URLs, no hay portal — solo escritura.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { ok, fail } from "../domain/shared/status.js";
import type { Result } from "../domain/shared/status.js";
import type { DocumentStorage, PutObjectInput, GetObjectOutput } from "./document-storage.js";

export interface R2StorageConfig {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Adaptador real S3-compatible para Cloudflare R2.
 * Solo se instancia cuando resolveR2ConfigFromEnv() confirma que existen
 * TODAS las variables requeridas — nunca con configuración parcial.
 */
export class R2DocumentStorage implements DocumentStorage {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(config: R2StorageConfig) {
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject({ storageKey, body, mimeType }: PutObjectInput): Promise<Result<void>> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: body,
          ContentType: mimeType,
          // Deliberadamente SIN ACL (privado por defecto) y SIN Metadata
          // (nunca fileName, checksum ni datos clínicos en el objeto).
        }),
      );
      return ok(undefined);
    } catch {
      // No exponemos el error real: puede incluir endpoint, bucket, o
      // fragmentos de la petición firmada. Mensaje genérico y seguro.
      return fail(
        "BLOCKED",
        "No se pudo guardar el archivo en el almacenamiento seguro. No se creó ningún registro.",
      );
    }
  }

  async getObject(storageKey: string): Promise<Result<GetObjectOutput>> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: storageKey }),
      );
      if (!response.Body) {
        return fail("BLOCKED", "El almacenamiento no devolvió datos.");
      }
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const bytes = Buffer.concat(chunks);
      return ok({
        bytes,
        contentType: response.ContentType ?? null,
        contentLength: bytes.length,
      });
    } catch {
      // No propagamos el error real: puede incluir endpoint, bucket, Key o
      // fragmentos de la petición firmada. Mensaje genérico y seguro.
      return fail(
        "BLOCKED",
        "No se pudo leer el archivo del almacenamiento seguro.",
      );
    }
  }

  isConfigured(): boolean {
    return true;
  }
}
