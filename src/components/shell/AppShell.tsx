"use client";

// Cascarón visual de la aplicación ("app shell"). Compone sidebar colapsable,
// barra superior, contenido, dock inferior con catálogo de módulos y panel de
// personalización. Puramente presentacional: todo el estado (colapso, dock,
// catálogo, panel, modo de vista) es local con useState y no se persiste — es la
// base visual para la futura personalización profunda de nelzzon, no el motor en sí.

import { useState } from "react";
import { AppSidebar, SidebarMenuTrigger } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/shell/AppTopbar";
import { AppDock } from "@/components/shell/AppDock";
import { ModuleCatalog } from "@/components/shell/ModuleCatalog";
import { PersonalizationPanel } from "@/components/shell/PersonalizationPanel";
import { hasPermission } from "@/lib/permissions";
import { VisualPreferencesProvider } from "@/lib/visual-preferences";
import { ModuleIdentityProvider } from "@/lib/module-identity";
import { isValidHexColor, readableForeground } from "@/lib/color";
import type { PersonalizationMode } from "@/components/shell/PersonalizationPreviewToggle";

interface AppShellProps {
  roleKey: string;
  orgName: string;
  orgLogo?: string | null;
  orgBrandColor?: string | null;
  userName: string;
  userEmail: string;
  roleName: string;
  children: React.ReactNode;
}

export function AppShell({ roleKey, orgName, orgLogo, orgBrandColor, userName, userEmail, roleName, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [mode, setMode] = useState<PersonalizationMode>("interactive");

  const showSearch = hasPermission(roleKey, "patients.view");
  const toggleSidebarCollapse = () => setSidebarCollapsed((v) => !v);

  // Color de marca de la clínica: opcional. Si no está configurado, no se
  // fija ningún estilo y --primary/--primary-foreground quedan en sus
  // valores por defecto (cero cambio visual para clínicas sin marca propia).
  const brandStyle = isValidHexColor(orgBrandColor)
    ? ({ "--primary": orgBrandColor, "--primary-foreground": readableForeground(orgBrandColor) } as React.CSSProperties)
    : undefined;

  return (
    <VisualPreferencesProvider>
    <ModuleIdentityProvider>
      <div className="flex min-h-screen bg-background" style={brandStyle}>
        <AppSidebar
          roleKey={roleKey}
          orgName={orgName}
          orgLogo={orgLogo}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onOpenPersonalization={() => setPersonalizationOpen(true)}
        />

        <div className="flex flex-1 min-w-0 flex-col">
          <AppTopbar
            showSearch={showSearch}
            orgName={orgName}
            orgBrandColor={isValidHexColor(orgBrandColor) ? orgBrandColor : null}
            userName={userName}
            userEmail={userEmail}
            roleName={roleName}
            personalizationOpen={personalizationOpen}
            onTogglePersonalization={() => setPersonalizationOpen((v) => !v)}
            menuTrigger={sidebarCollapsed ? <SidebarMenuTrigger onClick={toggleSidebarCollapse} /> : null}
          />
          <main className="flex-1 overflow-auto bg-background pb-20">{children}</main>
        </div>

        <AppDock
          roleKey={roleKey}
          open={dockOpen}
          onToggleOpen={() => setDockOpen((v) => !v)}
          onOpenCatalog={() => setCatalogOpen(true)}
        />

        {personalizationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
            <PersonalizationPanel
              mode={mode}
              onChange={setMode}
              onClose={() => setPersonalizationOpen(false)}
              onOpenModuleLibrary={() => {
                setPersonalizationOpen(false);
                setCatalogOpen(true);
              }}
            />
          </div>
        )}

        {catalogOpen && <ModuleCatalog onClose={() => setCatalogOpen(false)} />}
      </div>
    </ModuleIdentityProvider>
    </VisualPreferencesProvider>
  );
}
