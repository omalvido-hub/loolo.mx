import { readFile } from "node:fs/promises";
import path from "node:path";
import { ZipDashboardClient } from "@/app/dev/zip-dashboard/ZipDashboardClient";

// Vista temporal: muestra el HTML de referencia aprobado
// (docs/visual-references/nelzzon-dashboard.html) literal en un iframe a
// pantalla completa, igual que /dev/zip-dashboard. La autenticación y los
// permisos del rol siguen aplicando vía el layout de (app) — esta página no
// agrega datos reales ni consultas nuevas.
//
// force-dynamic: evita prerender estático al leer el archivo en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const filePath = path.join(process.cwd(), "docs/visual-references/nelzzon-dashboard.html");
  const html = await readFile(filePath, "utf-8");

  return (
    <div className="fixed inset-0 z-50">
      <ZipDashboardClient html={html} />
    </div>
  );
}
