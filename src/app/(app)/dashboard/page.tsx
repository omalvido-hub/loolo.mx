import { ZipDashboardReactClient } from "@/app/dev/zip-dashboard-react/ZipDashboardReactClient";

// Vista temporal: muestra la versión React del diseño aprobado del ZIP
// (ver /dev/zip-dashboard-react), a pantalla completa sobre el AppShell
// viejo. La autenticación y los permisos del rol siguen aplicando vía el
// layout de (app) — esta página no agrega datos reales ni consultas nuevas.
export default function DashboardPage() {
  return (
    <div className="fixed inset-0 z-50">
      <ZipDashboardReactClient />
    </div>
  );
}
