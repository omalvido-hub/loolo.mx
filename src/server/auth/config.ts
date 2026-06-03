// LOOLO — Configuración de Better Auth.
// Better Auth es dueño de la lógica de autenticación, sesiones, organizaciones y membresías.
// Usa las tablas ya definidas en Prisma (users, sessions, accounts, organizations,
// organization_memberships, invitations). La capa de permisos finos de LOOLO
// (roles/permissions/membership_roles) se valida aparte, en src/server/domain.

import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminDb } from "../db/admin.js";

export const auth = betterAuth({
  database: prismaAdapter(adminDb, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      // Un usuario puede pertenecer a varias organizaciones (regla 3).
      allowUserToCreateOrganization: true,
    }),
  ],
  // Todas las columnas id son UUID en PostgreSQL.
  // El factory de Better Auth usa `advanced.database.generateId` para la generación
  // de IDs en el adapter (distinto de `advanced.generateId` que es para secondary storage).
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export type Auth = typeof auth;
