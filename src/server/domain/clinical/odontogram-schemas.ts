// LOOLO — Validadores Zod de Odontograma (Fase 5B + Lifecycle). Fail-closed.
// FDI permanentes 11-48. Matriz surface↔findingType conservadora y documentada.

import { z } from "zod";

export const ToothSurfaceZ = z.enum(["MESIAL", "DISTAL", "OCCLUSAL", "VESTIBULAR", "LINGUAL", "INCISAL"]);
export const FindingTypeZ = z.enum(["CARIES", "RESTORATION", "CROWN", "ENDODONTICS", "IMPLANT", "FRACTURE", "MOBILITY", "MISSING", "SEALANT", "OTHER"]);
export const ToothStatusZ = z.enum(["PRESENT", "ABSENT", "EXTRACTED", "IMPACTED", "UNERUPTED", "ROOT_ONLY"]);

// FDI permanente: cuadrante 1-4, posición 1-8 (decisión 3).
export const isValidFdi = (n: number): boolean =>
  Number.isInteger(n) && n >= 11 && n <= 48 && Math.floor(n / 10) >= 1 && Math.floor(n / 10) <= 4 && n % 10 >= 1 && n % 10 <= 8;
const ToothFdiZ = z.number().int().refine(isValidFdi, { message: "toothFdi no es FDI permanente válido (11-48)" });

// Matriz surface↔findingType (ajuste 5, refinada: MOBILITY a nivel pieza).
export const SURFACE_REQUIRED = new Set(["CARIES", "RESTORATION", "SEALANT"]);
export const SURFACE_FORBIDDEN = new Set(["MISSING", "IMPLANT", "CROWN", "ENDODONTICS", "MOBILITY"]);
// OPCIONAL (surface libre): FRACTURE, OTHER

export function checkSurfaceRule(findingType: string, surface: string | null | undefined): void {
  const has = surface !== null && surface !== undefined;
  if (SURFACE_REQUIRED.has(findingType) && !has) throw new Error(`findingType ${findingType} exige surface.`);
  if (SURFACE_FORBIDDEN.has(findingType) && has) throw new Error(`findingType ${findingType} no admite surface (es a nivel pieza).`);
}

const findingShape = {
  toothFdi: ToothFdiZ,
  surface: ToothSurfaceZ.optional(),
  findingType: FindingTypeZ,
  toothStatus: ToothStatusZ,
  note: z.string().max(500).optional(),
};

export const RecordFindingInputZ = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  ...findingShape,
});

export const SupersedeFindingInputZ = z.object({
  supersedesFindingId: z.string().uuid(),
  encounterId: z.string().uuid(),   // consulta vigente (DRAFT/IN_PROGRESS) donde se registra la corrección
  ...findingShape,
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 5B falló: " + r.error.message);
  return r.data;
}

// ── Schemas de ciclo de vida (Lifecycle 1A) ───────────────────────────────────

export const OdontogramLifecycleStatusZ = z.enum([
  "ACTIVE", "OBSERVATION", "TREATED", "RESOLVED", "CONTROLLED", "VOIDED",
]);

// Anular hallazgo por error de registro. Motivo obligatorio.
export const VoidFindingInputZ = z.object({
  findingId:       z.string().uuid(),
  lifecycleReason: z.string().min(1, "El motivo de anulación es obligatorio.").max(500),
  encounterId:     z.string().uuid().optional(),  // contexto de consulta (opcional)
});

// Marcar hallazgo como tratado. Requiere motivo O enlace a ítem de tratamiento.
export const TreatFindingInputZ = z.object({
  findingId:              z.string().uuid(),
  lifecycleReason:        z.string().max(500).optional(),
  linkedTreatmentItemId:  z.string().uuid().optional(),
  encounterId:            z.string().uuid().optional(),
}).refine(
  (d) => !!d.lifecycleReason || !!d.linkedTreatmentItemId,
  { message: "treatFinding requiere lifecycleReason o linkedTreatmentItemId." },
);

// Marcar hallazgo como resuelto, controlado o en observación.
export const ResolveFindingInputZ = z.object({
  findingId:       z.string().uuid(),
  targetStatus:    z.enum(["RESOLVED", "CONTROLLED", "OBSERVATION"]),
  lifecycleReason: z.string().max(500).optional(),
  encounterId:     z.string().uuid().optional(),
});
