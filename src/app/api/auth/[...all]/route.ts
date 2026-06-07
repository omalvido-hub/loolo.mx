// NELZZON — Endpoint de autenticación (Better Auth) para Next.js App Router.
// Expone login, logout, sesión y operaciones de organización en /api/auth/*.
import { auth } from "../../../../server/auth/config.js";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
