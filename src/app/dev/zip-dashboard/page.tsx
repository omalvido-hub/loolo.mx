import { readFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ZipDashboardClient } from "./ZipDashboardClient";

// Vista aislada de referencia visual: muestra el HTML aprobado
// (docs/visual-references/nelzzon-dashboard.html) literal dentro de un iframe,
// sin tocar el dashboard real ni sus componentes. Solo para revisión interna.
//
// force-dynamic: evita prerender estático, así el chequeo de sesión corre en
// cada request.
export const dynamic = "force-dynamic";

export default async function ZipDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const filePath = path.join(process.cwd(), "docs/visual-references/nelzzon-dashboard.html");
  const html = await readFile(filePath, "utf-8");

  return <ZipDashboardClient html={html} />;
}
