// LOOLO — Validadores Zod de Consulta clínica (Fase 5A). Fail-closed.
// Longitudes acotadas. NO se valida contenido semántico clínico (fuera de alcance).

import { z } from "zod";

export const EncounterStatusZ = z.enum(["DRAFT", "IN_PROGRESS", "FINALIZED", "CANCELED"]);

export const CreateEncounterInputZ = z.object({
  patientId: z.string().uuid(),                       // OBLIGATORIO (decisión 1)
  appointmentId: z.string().uuid().optional(),
  professionalResourceId: z.string().uuid().optional(),
  chiefComplaint: z.string().min(1).max(500),         // motivo
  preliminaryDiagnosis: z.string().max(2000).optional(),
  observations: z.string().max(2000).optional(),
  indications: z.string().max(2000).optional(),
});

export const UpdateEncounterInputZ = z.object({
  encounterId: z.string().uuid(),
  chiefComplaint: z.string().min(1).max(500).optional(),
  preliminaryDiagnosis: z.string().max(2000).optional(),
  observations: z.string().max(2000).optional(),
  indications: z.string().max(2000).optional(),
}).refine(
  (o) => o.chiefComplaint !== undefined || o.preliminaryDiagnosis !== undefined || o.observations !== undefined || o.indications !== undefined,
  { message: "updateEncounter requiere al menos un campo" },
);

export const AddNoteInputZ = z.object({
  encounterId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 5A falló: " + r.error.message);
  return r.data;
}
