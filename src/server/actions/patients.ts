"use server";

// Server actions para pacientes. Read-only por ahora.

import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { searchPatients } from "@/server/domain/patient-record/list";
import type { PatientSearchItem } from "@/server/domain/patient-record/list";

type SearchResult =
  | { ok: true; items: PatientSearchItem[] }
  | { ok: false; error: string };

export async function searchPatientsAction(query: string): Promise<SearchResult> {
  try {
    const sanitized =
      typeof query === "string" ? query.trim().slice(0, 200) : "";
    const org = await requireOrganization();
    const ctx = await getActorContext(org.user.id, org.organizationId);
    const run = makeTenantRunner(org.organizationId);
    const result = await searchPatients(run, ctx, sanitized);
    if (!result.ok) return { ok: false, error: result.detail ?? result.reason };
    return { ok: true, items: result.value };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada." };
    }
    return { ok: false, error: "Error al buscar pacientes." };
  }
}
