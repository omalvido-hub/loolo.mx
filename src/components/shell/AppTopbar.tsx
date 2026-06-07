"use client";

// Barra superior del app shell. Limpia y discreta a propósito: buscador global,
// botón "Personalizar" (abre PersonalizationPanel) e indicadores de usuario.
// No agrega lógica de negocio ni de permisos nueva — reutiliza GlobalSearch y UserMenu.

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserMenu } from "@/components/user-menu";
import { APP_NAME } from "@/lib/brand";

interface AppTopbarProps {
  showSearch: boolean;
  orgName: string;
  userName: string;
  userEmail: string;
  roleName: string;
  personalizationOpen: boolean;
  onTogglePersonalization: () => void;
  menuTrigger?: React.ReactNode;
}

export function AppTopbar({
  showSearch,
  orgName,
  userName,
  userEmail,
  roleName,
  personalizationOpen,
  onTogglePersonalization,
  menuTrigger,
}: AppTopbarProps) {
  return (
    <header className="flex items-center gap-3 border-b bg-background/80 px-6 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {menuTrigger}
      <div className="flex flex-1 min-w-0">
        {showSearch ? (
          <GlobalSearch
            placeholder={`Buscar pacientes, módulos, acciones en ${APP_NAME}…`}
            className="w-full max-w-xl mx-auto lg:mx-0"
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onTogglePersonalization}
        aria-pressed={personalizationOpen}
        title="Personalizar tu espacio (vista previa)"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          personalizationOpen
            ? "border-primary/25 bg-primary/[0.06] text-primary"
            : "border-dashed text-muted-foreground hover:border-foreground/20 hover:text-foreground"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Personalizar
      </button>

      <div className="shrink-0 border-l pl-3.5">
        <UserMenu name={userName} email={userEmail} roleName={roleName} />
      </div>
    </header>
  );
}
