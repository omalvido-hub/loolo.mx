"use client";

// Cascarón visual de la aplicación ("app shell"). Compone sidebar colapsable,
// barra superior, contenido y dock inferior con catálogo de módulos.
// Puramente presentacional: todo el estado (colapso, dock, catálogo, modo de vista)
// es local con useState y no se persiste — es la base visual para la futura
// personalización profunda de nelzzon, no el motor de personalización en sí.

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/shell/AppTopbar";
import { AppDock } from "@/components/shell/AppDock";
import { ModuleCatalog } from "@/components/shell/ModuleCatalog";
import { hasPermission } from "@/lib/permissions";
import type { PersonalizationMode } from "@/components/shell/PersonalizationPreviewToggle";

interface AppShellProps {
  roleKey: string;
  orgName: string;
  userName: string;
  userEmail: string;
  roleName: string;
  children: React.ReactNode;
}

export function AppShell({ roleKey, orgName, userName, userEmail, roleName, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mode, setMode] = useState<PersonalizationMode>("interactive");

  const showSearch = hasPermission(roleKey, "patients.view");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        roleKey={roleKey}
        orgName={orgName}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-1 min-w-0 flex-col">
        <AppTopbar
          showSearch={showSearch}
          orgName={orgName}
          userName={userName}
          userEmail={userEmail}
          roleName={roleName}
          mode={mode}
          onModeChange={setMode}
        />
        <main className="flex-1 overflow-auto bg-background pb-20">{children}</main>
      </div>

      <AppDock
        roleKey={roleKey}
        open={dockOpen}
        onToggleOpen={() => setDockOpen((v) => !v)}
        onOpenCatalog={() => setCatalogOpen(true)}
      />

      {catalogOpen && <ModuleCatalog onClose={() => setCatalogOpen(false)} />}
    </div>
  );
}
