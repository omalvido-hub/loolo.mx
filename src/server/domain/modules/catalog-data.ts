// LOOLO — Datos de catálogo de módulos (fuente de verdad del seed).
// functional_status realista: programmed_now = ya construido; prepared_for_later = estructura lista.
// Keys GENÉRICAS (no hardcodean odontología); el vocabulario dental va en labelOverride de la plantilla.

export type ModuleGroup =
  | "CHANNELS" | "FOLLOW" | "CONTACTS" | "AGENDA" | "CLINICAL" | "ODONTOGRAM"
  | "TREATMENT_PLAN" | "QUOTES" | "PAYMENTS" | "INVOICING" | "PORTAL" | "FOLLOWUP"
  | "REPORTS" | "FINANCE" | "IDENTITY" | "CONFIG" | "INTEGRATIONS" | "DATA_MODEL"
  | "AI_AUTOMATION" | "QA" | "DOCUMENTS" | "NOTIFICATIONS" | "CATALOGS"
  | "ADJUSTMENTS" | "MIGRATION" | "PORTAL_ACCESS" | "SUPPORT" | "INVENTORY" | "MARKETING";

export type ModuleType = "CORE" | "TRANSVERSAL" | "OPERATIONAL";
export type FunctionalStatus = "programmed_now" | "prepared_for_later" | "pending_definition";

export interface ModuleDef {
  key: string;
  name: string;
  description: string;
  moduleGroup: ModuleGroup;
  moduleType: ModuleType;
  isCore?: boolean;
  isTransversal?: boolean;
  functionalStatus: FunctionalStatus;
}

// ── 20 módulos maestros ─────────────────────────────────────────────
export const MASTER_MODULES: ModuleDef[] = [
  { key: "channels_inbound", name: "Canales de entrada", description: "Captura y almacenamiento de mensaje entrante construido y probado (Fase 1). Integraciones reales WhatsApp/IG/FB/TikTok NO construidas.", moduleGroup: "CHANNELS", moduleType: "OPERATIONAL", functionalStatus: "programmed_now" },
  { key: "follow", name: "Follow", description: "Cerebro operativo de conversaciones", moduleGroup: "FOLLOW", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "contacts_patients", name: "Cliente/Paciente", description: "Entidades separadas (contact/prospect/patient/opportunity) y regla no-auto-paciente construidas y probadas (Fase 1). Gestion clinica/CRUD completa NO construida.", moduleGroup: "CONTACTS", moduleType: "OPERATIONAL", functionalStatus: "programmed_now" },
  { key: "agenda", name: "Agenda", description: "Citas y disponibilidad", moduleGroup: "AGENDA", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "clinical_consultation", name: "Consulta", description: "Registro de consulta", moduleGroup: "CLINICAL", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "odontogram", name: "Odontograma", description: "Mapa dental", moduleGroup: "ODONTOGRAM", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "treatment_plan", name: "Plan de tratamiento", description: "Planificación clínica", moduleGroup: "TREATMENT_PLAN", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "quotes", name: "Presupuestos/Cotizaciones", description: "Cotizaciones desde catálogo", moduleGroup: "QUOTES", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "payments", name: "Cobros/Pagos", description: "Cobros y validación de pagos", moduleGroup: "PAYMENTS", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "invoicing", name: "Facturación/Base fiscal", description: "Facturación con datos fiscales", moduleGroup: "INVOICING", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "patient_portal", name: "Portal Paciente", description: "Portal con info autorizada", moduleGroup: "PORTAL", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "followup_tasks", name: "Seguimiento/Tareas/Recuperación", description: "Tareas y recuperación", moduleGroup: "FOLLOWUP", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "reports_dashboard", name: "Reportes/Dashboard", description: "Reportes desde eventos confiables", moduleGroup: "REPORTS", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "finance", name: "Finanzas/Contabilidad/Flujo", description: "Finanzas y flujo", moduleGroup: "FINANCE", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "identity_rbac", name: "Usuarios/Roles/Permisos/Auditoría", description: "RBAC, enforcement de permisos, auditoria y aislamiento RLS construidos y probados (Fases 1/2A). Login real Better Auth pendiente de validar en entorno.", moduleGroup: "IDENTITY", moduleType: "CORE", isCore: true, functionalStatus: "programmed_now" },
  { key: "config_onboarding", name: "Configuración/Onboarding/Catálogos", description: "Configuracion de modulos/plantillas (catalogo, apply, enable/disable/visibilidad) construida y probada (Fase 2B-1). Onboarding guiado NO construido.", moduleGroup: "CONFIG", moduleType: "CORE", isCore: true, functionalStatus: "programmed_now" },
  { key: "integrations", name: "Integraciones/APIs/Infraestructura", description: "Integraciones externas", moduleGroup: "INTEGRATIONS", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "data_model", name: "Base de datos/Modelo de información", description: "Esquema/migraciones de la columna vertebral construidos y probados (Fases 1/2A/2B-1).", moduleGroup: "DATA_MODEL", moduleType: "CORE", isCore: true, functionalStatus: "programmed_now" },
  { key: "ai_automation", name: "IA/Automatización/Validadores", description: "IA copiloto y validadores", moduleGroup: "AI_AUTOMATION", moduleType: "OPERATIONAL", functionalStatus: "prepared_for_later" },
  { key: "qa_checklist", name: "Checklist/Pruebas/Criterios", description: "Como MODULO de producto (checklist/criterios in-app) NO construido. La suite automatizada de pruebas dev existe aparte como infraestructura, no como modulo del tenant.", moduleGroup: "QA", moduleType: "CORE", isCore: true, functionalStatus: "prepared_for_later" },
];

// ── 9 transversales obligatorios ────────────────────────────────────
export const TRANSVERSAL_MODULES: ModuleDef[] = [
  { key: "documents", name: "Documentos/Evidencias/Consentimientos", description: "Documentos sensibles ocultos por defecto", moduleGroup: "DOCUMENTS", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "notifications", name: "Notificaciones/Mensajería saliente", description: "Mensajería saliente", moduleGroup: "NOTIFICATIONS", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "master_catalogs", name: "Catálogos maestros", description: "Precios, servicios, insumos", moduleGroup: "CATALOGS", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "adjustments", name: "Cancelaciones/Reembolsos/Ajustes", description: "Ajustes y reembolsos", moduleGroup: "ADJUSTMENTS", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "data_migration", name: "Importación inicial/Migración", description: "Importación inicial", moduleGroup: "MIGRATION", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "portal_access", name: "Acceso seguro al Portal Paciente", description: "Acceso seguro al portal", moduleGroup: "PORTAL_ACCESS", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "support_access", name: "Protocolo de soporte técnico / acceso restringido", description: "Lifecycle de grants (conceder/revocar/expirar/usar) + auditoria + RLS construidos y probados (Fase 2A). Login del usuario de soporte usando un grant NO construido.", moduleGroup: "SUPPORT", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "programmed_now" },
  { key: "inventory", name: "Inventario / Insumos", description: "Inventario de insumos (configurable)", moduleGroup: "INVENTORY", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
  { key: "marketing", name: "Métricas de Marketing y Campañas Digitales", description: "Campañas: campaña→mensaje→Follow→paciente→agenda→cobro→reporte", moduleGroup: "MARKETING", moduleType: "TRANSVERSAL", isTransversal: true, functionalStatus: "prepared_for_later" },
];

export const ALL_MODULES: ModuleDef[] = [...MASTER_MODULES, ...TRANSVERSAL_MODULES];
