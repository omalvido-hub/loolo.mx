// NELZZON — Configuración de Better Auth.
// Better Auth es dueño de la lógica de autenticación, sesiones, organizaciones y membresías.
// Usa las tablas ya definidas en Prisma (users, sessions, accounts, organizations,
// organization_memberships, invitations). La capa de permisos finos de Nelzzon
// (roles/permissions/membership_roles) se valida aparte, en src/server/domain.

import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminDb } from "../db/admin.js";
import { sendResetPasswordEmail } from "../email/resend.js";

const extraOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((s) => s.trim())
  : [];

// Subdominio por clínica (ROOT_DOMAIN=nelzzon.app): habilita baseURL dinámico
// (acepta *.nelzzon.app) y cookie de sesión compartida en todo el dominio raíz.
// Sin ROOT_DOMAIN configurado, el comportamiento queda idéntico al de antes.
const rootDomain = process.env.ROOT_DOMAIN;

export const auth = betterAuth({
  database: prismaAdapter(adminDb, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  ...(rootDomain
    ? { baseURL: { allowedHosts: [rootDomain, `*.${rootDomain}`], fallback: process.env.BETTER_AUTH_URL } }
    : {}),
  trustedOrigins: extraOrigins,
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
    // Detrás de Cloudflare, cf-connecting-ip es la IP real del visitante (no falsificable
    // por el cliente). x-forwarded-for queda como fallback para desarrollo local.
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
    ...(rootDomain ? { crossSubDomainCookies: { enabled: true, domain: `.${rootDomain}` } } : {}),
  },
});

export type Auth = typeof auth;
