import { headers } from "next/headers";
import { auth } from "@/server/auth/config";
import { resolveMemberships } from "@/server/db/admin";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getSessionWithMemberships() {
  const session = await getSession();
  if (!session) return null;
  const memberships = await resolveMemberships(session.user.id);
  return { session, memberships };
}

export type SessionWithMemberships = NonNullable<
  Awaited<ReturnType<typeof getSessionWithMemberships>>
>;
