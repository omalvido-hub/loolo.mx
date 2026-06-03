// LOOLO — Resolver de navegacion/dashboard (Fase 2B-2). PURO, testeable sin DB.
// ORDEN OBLIGATORIO: permisos → configuracion de organizacion → preferencia personal.
// La preferencia personal NUNCA puede exponer un modulo/widget negado por permiso u organizacion;
// solo puede ocultar y reordenar lo que ya esta permitido y habilitado.

export interface ResolvedModule {
  moduleKey: string;
  enabled: boolean;
  visible: boolean;
  showInMenu: boolean;
  showInDock: boolean;
  menuSortOrder: number | null;
  dockSortOrder: number | null;
  labelOverride: string | null;
}

export interface ResolvedWidget {
  widgetKey: string;
  enabled: boolean;
  visible: boolean;
  requiredPermissions: string[];
  sortOrder: number | null;
  size: string;
}

export interface UserPrefs {
  density?: "comfortable" | "compact" | "spacious";
  sidebarCollapsed?: boolean;
  dockCollapsed?: boolean;
  hiddenWidgets?: string[];
  widgetOrder?: string[];
}

export interface ResolverInput {
  modules: ResolvedModule[];
  widgets: ResolvedWidget[];
  prefs: UserPrefs;
  permissions: ReadonlySet<string> | readonly string[];
}

export interface NavItem { key: string; label: string | null; order: number; }
export interface WidgetItem { key: string; size: string; order: number; }
export interface ResolvedNavigation {
  menu: NavItem[];
  dock: NavItem[];
  dashboardWidgets: WidgetItem[];
  ui: { density: string; sidebarCollapsed: boolean; dockCollapsed: boolean };
}

const hasPerm = (perms: ReadonlySet<string> | readonly string[], k: string) =>
  Array.isArray(perms) ? perms.includes(k) : (perms as ReadonlySet<string>).has(k);
const hasAll = (perms: ReadonlySet<string> | readonly string[], req: string[]) =>
  req.every((r) => hasPerm(perms, r));

export function resolveNavigationAndWidgets(input: ResolverInput): ResolvedNavigation {
  const { modules, widgets, prefs, permissions } = input;

  // Modulos: gate por organizacion (enabled+visible+surface). Orden por *SortOrder.
  const enabledModules = modules.filter((m) => m.enabled && m.visible);
  const menu = enabledModules
    .filter((m) => m.showInMenu)
    .sort((a, b) => (a.menuSortOrder ?? 1e9) - (b.menuSortOrder ?? 1e9))
    .map((m, i) => ({ key: m.moduleKey, label: m.labelOverride, order: m.menuSortOrder ?? i }));
  const dock = enabledModules
    .filter((m) => m.showInDock)
    .sort((a, b) => (a.dockSortOrder ?? 1e9) - (b.dockSortOrder ?? 1e9))
    .map((m, i) => ({ key: m.moduleKey, label: m.labelOverride, order: m.dockSortOrder ?? i }));

  // Widgets: 1) PERMISO  2) ORG (enabled+visible)  3) PREFERENCIA (ocultar/reordenar).
  const hidden = new Set(prefs.hiddenWidgets ?? []);
  const allowed = widgets
    .filter((w) => hasAll(permissions, w.requiredPermissions)) // permiso
    .filter((w) => w.enabled && w.visible)                      // organizacion
    .filter((w) => !hidden.has(w.widgetKey));                   // preferencia (solo oculta)

  // Reorden por preferencia: el orden personal SOLO reordena lo ya permitido;
  // claves en widgetOrder que apuntan a widgets excluidos se ignoran (no exponen nada).
  const order = prefs.widgetOrder ?? [];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? 1e9 : i;
  };
  const dashboardWidgets = allowed
    .sort((a, b) => (rank(a.widgetKey) - rank(b.widgetKey)) || ((a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9)))
    .map((w, i) => ({ key: w.widgetKey, size: w.size, order: i }));

  return {
    menu,
    dock,
    dashboardWidgets,
    ui: {
      density: prefs.density ?? "comfortable",
      sidebarCollapsed: prefs.sidebarCollapsed ?? false,
      dockCollapsed: prefs.dockCollapsed ?? false,
    },
  };
}
