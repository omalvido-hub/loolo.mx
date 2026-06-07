"use client";

// Barra superior del app shell. Presentacional: combina el buscador global existente,
// el control de vista previa de personalización y los indicadores de organización/usuario.
// No agrega lógica de negocio ni de permisos nueva — reutiliza GlobalSearch y UserMenu.

import { Sparkles } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserMenu } from "@/components/user-menu";
import {
  PersonalizationPreviewToggle,
  type PersonalizationMode,
} from "@/components/shell/PersonalizationPreviewToggle";
import { APP_NAME } from "@/lib/brand";

interface AppTopbarProps {
  showSearch: boolean;
  orgName: string;
  userName: string;
  userEmail: string;
  roleName: string;
  mode: PersonalizationMode;
  onModeChange: (mode: PersonalizationMode) => void;
}

export function AppTopbar({
  showSearch,
  orgName,
  userName,
  userEmail,
  roleName,
  mode,
  onModeChange,
}: AppTopbarProps) {
  return (
    <header className="flex items-center gap-4 border-b bg-background/80 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex-1 min-w-0">
        {showSearch ? (
          <GlobalSearch
            placeholder={`Buscar pacientes, módulos, acciones en ${APP_NAME}…`}
            className="w-full max-w-2xl"
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
        )}
      </div>

      <PersonalizationPreviewToggle mode={mode} onChange={onModeChange} className="shrink-0" />

      <button
        type="button"
        title="Próximamente: personaliza tu espacio de trabajo"
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Personalizar
      </button>

      <div className="shrink-0 border-l pl-4">
        <UserMenu name={userName} email={userEmail} roleName={roleName} />
      </div>
    </header>
  );
}
