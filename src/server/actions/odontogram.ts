"use server";

// LOOLO — Server Actions de Odontograma (UI-7B-B).
// Wrapper 1:1 sobre recordFinding del dominio.
// Patrón: sesión → actor context → dominio → revalidatePath → ActionResult.

import { revalidatePath } from "next/cache";
import { requireOrganization, UnauthorizedError, NoOrganizationError } from "@/server/auth/session";
import { getActorContext } from "@/server/auth/context";
import { makeTenantRunner } from "@/server/db/tenant";
import { recordFinding } from "@/server/domain/clinical/odontogram";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getCtx() {
  const org = await requireOrganization();
  const ctx = await getActorContext(org.user.id, org.organizationId);
  const run = makeTenantRunner(org.organizationId);
  return { ctx, run };
}

export async function recordFindingAction(
  patientId: string,
  encounterId: string,
  data: {
    toothFdi: number;
    findingType: string;
    toothStatus: string;
    surface?: string;
    note?: string;
  },
): Promise<ActionResult<{ findingId: string }>> {
  try {
    const { ctx, run } = await getCtx();
    const result = await run((exec) =>
      recordFinding(exec, ctx, { patientId, encounterId, ...data }),
    );
    revalidatePath(`/pacientes/${patientId}/consultas/${encounterId}`);
    return { ok: true, data: result };
  } catch (e: any) {
    if (e instanceof UnauthorizedError || e instanceof NoOrganizationError) {
      return { ok: false, error: "Sesión expirada. Recarga la página." };
    }
    return { ok: false, error: e?.message ?? "Error al registrar el hallazgo." };
  }
}
