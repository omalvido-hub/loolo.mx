// NELZZON — Arnés de prueba (node-postgres).
// Replica el patrón de src/server/db/tenant.ts conectando como app_user (SIN bypass),
// para validar las garantías de RLS a nivel de motor. El runtime de producción usa Prisma
// con el MISMO rol y las MISMAS políticas, así que esta prueba aplica igual.

import pg from "pg";
import { config } from "dotenv";
config();

// app_admin: BYPASSRLS. Seed de catálogos, orgs e identidad.
export const adminPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// app_user: runtime tenant-scoped. RLS lo filtra todo.
export const userPool = new pg.Pool({ connectionString: process.env.RUNTIME_DATABASE_URL });

/**
 * Ejecuta `fn` como app_user dentro de una transacción con el tenant fijado LOCAL.
 * Equivalente directo de forTenant() de Prisma.
 */
export async function forTenantPg<T>(
  orgId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await userPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [orgId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Igual que forTenantPg pero SIN fijar tenant: prueba el comportamiento fail-closed. */
export async function asUserNoTenant<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await userPool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Como forTenantPg pero ademas fija app.current_user_id (doble RLS de user_preferences). */
export async function forTenantPgAsUser<T>(
  orgId: string,
  userId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await userPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [orgId]);
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function closePools() {
  await adminPool.end();
  await userPool.end();
}
