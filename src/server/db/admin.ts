// LOOLO — Cliente PRIVILEGIADO (app_admin, BYPASSRLS).
// USO RESTRINGIDO: resolución de identidad (¿a qué orgs pertenece este usuario?),
// migraciones y operaciones cross-tenant legítimas y auditadas.
// NUNCA usar este cliente para servir datos de dominio a un usuario final.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const adminDb = new PrismaClient({ adapter });

// Resolución de identidad: única vía autorizada para saber memberships/roles.
export async function resolveMemberships(userId: string) {
  return adminDb.member.findMany({
    where: { userId },
    include: { organization: true, membershipRoles: { include: { role: true } } },
  });
}
