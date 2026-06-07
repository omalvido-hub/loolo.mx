// NELZZON — Utilidades de sesión (servidor). Better Auth es la fuente de verdad.
// NO usuario mock. NO bypass de desarrollo. La protección NO depende del frontend.
// NOTA: la validación end-to-end requiere un servidor Next corriendo (no ejecutable en el
// sandbox de construcción); la lógica de guard SÍ está probada en tests/phase2a.test.ts.

import { headers } from "next/headers";
import { auth } from "./config.js";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

export interface SessionContext {
  user: CurrentUser;
  activeOrganizationId: string | null;
}

/** Lee la sesión actual desde Better Auth. null si no hay sesión válida. */
export async function getSession(): Promise<SessionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name ?? null },
    // El plugin de organización guarda la org activa en la sesión (server-side),
    // no en una cookie que el usuario pueda falsificar.
    activeOrganizationId: (session.session as { activeOrganizationId?: string | null })?.activeOrganizationId ?? null,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await getSession())?.user ?? null;
}

/** Exige sesión. Lanza si no hay (las rutas deben capturarlo y redirigir a /login). */
export async function requireAuth(): Promise<SessionContext> {
  const ctx = await getSession();
  if (!ctx) throw new UnauthorizedError("No hay sesión activa.");
  return ctx;
}

/** Exige que haya una organización activa seleccionada. */
export async function requireOrganization(): Promise<{ user: CurrentUser; organizationId: string }> {
  const ctx = await requireAuth();
  if (!ctx.activeOrganizationId) {
    throw new NoOrganizationError("No hay organización activa seleccionada.");
  }
  return { user: ctx.user, organizationId: ctx.activeOrganizationId };
}

export async function getCurrentOrganization(): Promise<string | null> {
  return (await getSession())?.activeOrganizationId ?? null;
}

export class UnauthorizedError extends Error {}
export class NoOrganizationError extends Error {}
export class ForbiddenError extends Error {}
