import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { StyleguideClient } from "./StyleguideClient";

// Página interna de estilo. Sin datos del dominio, sin llamadas al backend de
// negocio: solo renderiza ejemplos estáticos definidos en
// StyleguideClient/fixtures, según docs/NELZZON_STYLE_GUIDE.md (secciones 3 a 12).
//
// force-dynamic: evita que Next prerenderice esta ruta como página estática,
// lo que impedía aplicar el chequeo de sesión en cada request.
export const dynamic = "force-dynamic";

export default async function StyleguidePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <StyleguideClient />;
}
