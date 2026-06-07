// NELZZON — Validadores Zod + transiciones de Plan de tratamiento (Fase 5C). Fail-closed.
// Transiciones explícitas (ajustes A/B), puras y testeables.

import { z } from "zod";
import { ToothSurfaceZ, isValidFdi } from "./odontogram-schemas.js";

export const TreatmentPlanStatusZ = z.enum(["DRAFT", "PROPOSED", "ACCEPTED", "ACTIVE", "COMPLETED", "REJECTED", "CANCELED"]);
export const TreatmentItemStatusZ = z.enum(["PROPOSED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELED"]);
export const TreatmentPriorityZ = z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]);
export const ProcedureTypeZ = z.enum([
  "EXAM", "PROPHYLAXIS", "RESTORATION", "ENDODONTICS", "EXTRACTION", "CROWN",
  "BRIDGE", "IMPLANT", "PERIODONTAL", "ORTHODONTICS", "SURGERY", "OTHER",
]);

const ToothFdiZ = z.number().int().refine(isValidFdi, { message: "toothFdi no es FDI permanente válido (11-48)" });

// ── Matrices de transición (ajustes A/B) ──
export const PLAN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PROPOSED", "CANCELED"],
  PROPOSED: ["ACCEPTED", "REJECTED", "CANCELED"],
  ACCEPTED: ["ACTIVE", "CANCELED"],
  ACTIVE: ["COMPLETED", "CANCELED"],
  COMPLETED: [], REJECTED: [], CANCELED: [],
};
export const ITEM_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ["ACCEPTED", "REJECTED", "CANCELED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELED"],
  IN_PROGRESS: ["COMPLETED", "CANCELED"],
  COMPLETED: [], REJECTED: [], CANCELED: [],
};
export const PLAN_TERMINAL = new Set(["COMPLETED", "REJECTED", "CANCELED"]);
export const ITEM_TERMINAL = new Set(["COMPLETED", "REJECTED", "CANCELED"]);
export const ITEM_LIVE = new Set(["PROPOSED", "ACCEPTED", "IN_PROGRESS"]); // bloquean completar plan (ajuste C)

export const canPlanTransition = (from: string, to: string): boolean => (PLAN_TRANSITIONS[from] ?? []).includes(to);
export const canItemTransition = (from: string, to: string): boolean => (ITEM_TRANSITIONS[from] ?? []).includes(to);

export const CreatePlanInputZ = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  professionalResourceId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const AddItemInputZ = z.object({
  planId: z.string().uuid(),
  procedureType: ProcedureTypeZ,
  toothFdi: ToothFdiZ.optional(),
  surface: ToothSurfaceZ.optional(),
  priority: TreatmentPriorityZ.optional(),
  sequence: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
  professionalResourceId: z.string().uuid().optional(),
  linkedFindingId: z.string().uuid().optional(),
});

export const UpdateItemInputZ = z.object({
  itemId: z.string().uuid(),
  procedureType: ProcedureTypeZ.optional(),
  toothFdi: ToothFdiZ.optional(),
  surface: ToothSurfaceZ.optional(),
  priority: TreatmentPriorityZ.optional(),
  sequence: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
}).refine((o) => Object.keys(o).length > 1, { message: "updateItem requiere al menos un campo" });

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Validación 5C falló: " + r.error.message);
  return r.data;
}
