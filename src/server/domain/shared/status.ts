// LOOLO — Estado compartido del dominio.
// Regla 13: si falta un dato crítico → MISSING_DATA / REQUIRES_HUMAN / BLOCKED.
// El dominio NUNCA inventa: ante la duda, marca el estado y se detiene.

export const RecordState = {
  OK: "OK",
  MISSING_DATA: "MISSING_DATA",
  REQUIRES_HUMAN: "REQUIRES_HUMAN",
  BLOCKED: "BLOCKED",
  ARCHIVED: "ARCHIVED",
} as const;

export type RecordState = (typeof RecordState)[keyof typeof RecordState];

/** Estados que detienen el flujo automático (requieren intervención). */
export const GATING_STATES: RecordState[] = [
  RecordState.MISSING_DATA,
  RecordState.REQUIRES_HUMAN,
  RecordState.BLOCKED,
];

export function isGated(state: RecordState): boolean {
  return GATING_STATES.includes(state);
}

/**
 * Result: el dominio devuelve éxito o un fallo explícito.
 * Fallar cerrado = ante la duda, NO actuar; devolver el motivo.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; reason: RecordState | "FORBIDDEN" | "NOT_FOUND" | "INVALID"; detail?: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T = never>(
  reason: RecordState | "FORBIDDEN" | "NOT_FOUND" | "INVALID",
  detail?: string,
): Result<T> => ({ ok: false, reason, detail });
