// NELZZON — Plantilla "Odontología general" (fuente de verdad del seed).
// Mapea módulos del catálogo con su rol en la plantilla y defaults de superficie.
// El vocabulario dental vive en labelOverride (el sistema NO queda hardcodeado a odontología).

export interface TemplateDef {
  key: string;
  category: string;
  groupName: string;
  professionUnit: string;
  specialtyService: string;
  templateName: string;
  phase: "PILOTO" | "BETA" | "PRODUCCION";
  detailLevel: "BASICO" | "COMPLETO";
  version: number;
}

export const ODONTOLOGIA_TEMPLATE: TemplateDef = {
  key: "odontologia_general",
  category: "Medicina / Salud Clínica",
  groupName: "G. Dental",
  professionUnit: "Odontología",
  specialtyService: "Odontología general",
  templateName: "Plantilla Odontología general",
  phase: "PILOTO",
  detailLevel: "COMPLETO",
  version: 1,
};

export type Tier = "required" | "recommended" | "optional";

export interface TemplateModuleDef {
  moduleKey: string;
  tier: Tier;
  enabled: boolean;
  visible: boolean;
  showInMenu: boolean;
  showInDock: boolean;
  dashboardAvailable: boolean;
  menuSortOrder?: number;
  labelOverride?: string;
}

// Helpers de legibilidad
const req = (moduleKey: string, order: number, labelOverride?: string): TemplateModuleDef =>
  ({ moduleKey, tier: "required", enabled: true, visible: true, showInMenu: true, showInDock: false, dashboardAvailable: true, menuSortOrder: order, labelOverride });
const rec = (moduleKey: string, order: number, labelOverride?: string): TemplateModuleDef =>
  ({ moduleKey, tier: "recommended", enabled: true, visible: true, showInMenu: true, showInDock: false, dashboardAvailable: true, menuSortOrder: order, labelOverride });
const optHidden = (moduleKey: string): TemplateModuleDef =>
  ({ moduleKey, tier: "optional", enabled: false, visible: false, showInMenu: false, showInDock: false, dashboardAvailable: false });

export const ODONTOLOGIA_TEMPLATE_MODULES: TemplateModuleDef[] = [
  // Requeridos para operar una clínica dental
  req("channels_inbound", 10, "Canales"),
  req("follow", 20, "FOLLOW"),
  req("contacts_patients", 30, "Pacientes"),
  req("agenda", 40, "Agenda"),
  req("clinical_consultation", 50, "Consulta dental"),
  req("odontogram", 60, "Odontograma"),
  req("treatment_plan", 70, "Plan de tratamiento"),
  req("quotes", 80, "Presupuestos"),
  req("payments", 90, "Cobros"),
  req("identity_rbac", 200, "Usuarios y permisos"),
  req("config_onboarding", 210, "Configuración"),
  // Recomendados (encendidos pero no obligatorios)
  rec("invoicing", 100, "Facturación"),
  rec("patient_portal", 110, "Portal Paciente"),
  rec("followup_tasks", 120, "Seguimiento"),
  rec("reports_dashboard", 130, "Reportes"),
  rec("finance", 140, "Finanzas"),
  rec("documents", 150, "Documentos"),
  rec("notifications", 160, "Notificaciones"),
  rec("master_catalogs", 170, "Catálogos"),
  rec("support_access", 220, "Soporte"),
  // Inventario: opcional/recomendado pero NO visible por defecto (regla aprobada)
  { moduleKey: "inventory", tier: "optional", enabled: false, visible: false, showInMenu: false, showInDock: false, dashboardAvailable: false, menuSortOrder: 180, labelOverride: "Inventario" },
  // Marketing: configurable, apagado por defecto, sin integraciones reales
  { moduleKey: "marketing", tier: "optional", enabled: false, visible: false, showInMenu: false, showInDock: false, dashboardAvailable: false, menuSortOrder: 190, labelOverride: "Marketing" },
  // Infraestructura/transversales backend: disponibles pero ocultos de operación diaria
  optHidden("integrations"),
  optHidden("data_model"),
  optHidden("ai_automation"),
  optHidden("qa_checklist"),
  optHidden("adjustments"),
  optHidden("data_migration"),
  optHidden("portal_access"),
];
