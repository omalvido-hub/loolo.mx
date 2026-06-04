// LOOLO — Mapeo de Result<PatientLiveRecord> → respuesta HTTP (7C-A).
// Función pura sin dependencias de Next.js. Importable desde tests y desde el route handler.

import type { Result } from "../shared/status.js";
import type { PatientLiveRecord } from "./schemas.js";

export interface HttpResponse {
  status: number;
  body: unknown;
}

/** Mapea el Result del resolver al status y body de la respuesta HTTP. */
export function mapRecordResult(result: Result<PatientLiveRecord>): HttpResponse {
  if (!result.ok) {
    if (result.reason === "FORBIDDEN") {
      return { status: 403, body: { error: "Sin permiso" } };
    }
    if (result.reason === "NOT_FOUND" || result.reason === "ARCHIVED") {
      return { status: 404, body: { error: "No encontrado" } };
    }
    return { status: 400, body: { error: result.detail ?? "Error" } };
  }
  return { status: 200, body: result.value };
}
