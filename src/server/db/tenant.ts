// LOOLO — Cliente RUNTIME tenant-scoped (app_user, SIN bypass).
// Todo el dominio servido a usuarios finales pasa por aquí.
// La variable app.current_tenant_id se fija LOCAL a la transacción (3er arg = true):
// muere al cerrar la transacción → seguro con connection pooling, sin fugas entre requests.
// RLS (migración 0002) hace cumplir el aislamiento aunque el código olvidara filtrar.

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.RUNTIME_DATABASE_URL });

const runtimeDb = new PrismaClient({ adapter });

/**
 * Ejecuta `work` dentro de una transacción con el contexto de tenant fijado.
 * Cualquier query dentro queda automáticamente restringida a `organizationId = orgId` por RLS.
 */
export async function forTenant<T>(
  orgId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!orgId) throw new Error("forTenant: orgId requerido (fail-closed).");
  return runtimeDb.$transaction(async (tx) => {
    // set_config(name, value, is_local=true): vive solo en esta transacción.
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgId}, true)`;
    return work(tx);
  });
}

/**
 * Igual que forTenant pero además fija app.current_user_id (LOCAL a la transacción).
 * Necesario para user_preferences, cuya RLS exige org + user. Fail-closed: si falta userId,
 * lanza; y si no se fijara, la RLS de user_preferences no devolvería ninguna fila.
 */
export async function forTenantAsUser<T>(
  orgId: string,
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!orgId) throw new Error("forTenantAsUser: orgId requerido (fail-closed).");
  if (!userId) throw new Error("forTenantAsUser: userId requerido (fail-closed).");
  return runtimeDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return work(tx);
  });
}
