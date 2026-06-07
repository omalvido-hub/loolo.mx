// NELZZON — Resolver de Odontograma (Fase 5B). PURO, determinista, testeable sin DB.
// Colapsa cadenas de supersesión: el estado VIGENTE = hallazgos no superseded por otro.

export interface Finding {
  id: string;
  toothFdi: number;
  surface: string | null;
  findingType: string;
  toothStatus: string;
  lifecycleStatus?: string;  // 'ACTIVE' | 'OBSERVATION' | 'TREATED' | 'RESOLVED' | 'CONTROLLED' | 'VOIDED'
  supersedesFindingId: string | null;
  createdAt?: string | Date;
}

/**
 * Devuelve los hallazgos vigentes (no reemplazados por ningún otro).
 * Un hallazgo está superseded si existe otro cuyo supersedesFindingId apunta a él.
 * La cadena A←B←C colapsa a C (el más reciente no superseded).
 */
export function resolveOdontogram(findings: Finding[]): Finding[] {
  const superseded = new Set<string>();
  for (const f of findings) {
    if (f.supersedesFindingId) superseded.add(f.supersedesFindingId);
  }
  return findings
    .filter((f) => !superseded.has(f.id))
    .sort((a, b) => a.toothFdi - b.toothFdi || String(a.surface).localeCompare(String(b.surface)));
}

/** Agrupa los vigentes por pieza (toothFdi). Útil para una vista por diente. */
export function groupByTooth(findings: Finding[]): Record<number, Finding[]> {
  const out: Record<number, Finding[]> = {};
  for (const f of resolveOdontogram(findings)) {
    (out[f.toothFdi] ??= []).push(f);
  }
  return out;
}
