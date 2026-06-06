// LOOLO — Catálogo RBAC (global del sistema, sin RLS de tenant).
// Convención ÚNICA: "recurso.accion" (punto). Estandarizado en Fase 2A.
// Fase 2B EXTIENDE PERMISSIONS con claves operativas (patients.*, agenda.*, billing.*, etc.).
// El vínculo por organización ocurre en membership_roles.

export const PERMISSIONS: { key: string; description: string }[] = [
  // Acceso base
  { key: "app_shell.view", description: "Entrar a la aplicación autenticada" },
  // Organización
  { key: "organization.view", description: "Ver la organización" },
  { key: "organization.select", description: "Seleccionar/cambiar de organización" },
  { key: "organization.manage", description: "Administrar datos de la organización" },
  { key: "organization.members.view", description: "Ver miembros" },
  { key: "organization.members.invite", description: "Invitar miembros" },
  { key: "organization.members.update_role", description: "Cambiar el rol de un miembro" },
  { key: "organization.members.remove", description: "Quitar miembros" },
  // Observabilidad
  { key: "audit.view", description: "Ver bitacora de auditoria" },
  { key: "events.view", description: "Ver eventos operativos" },
  // Configuracion
  { key: "settings.view", description: "Ver configuracion" },
  { key: "settings.manage", description: "Gestionar configuracion" },
  // Acceso de soporte (capacidad del dueno para conceder/revocar acceso tecnico)
  { key: "support_access.view", description: "Ver accesos de soporte concedidos" },
  { key: "support_access.grant", description: "Conceder acceso temporal de soporte" },
  { key: "support_access.revoke", description: "Revocar acceso de soporte" },
  // Capacidad del usuario de SOPORTE una vez tiene un grant activo (no es rol de org)
  { key: "support.read_logs", description: "Ver logs tecnicos anonimizados (plataforma)" },
  // ── Fase 2B-1: configuracion de modulos/plantillas ──
  { key: "modules.view", description: "Ver modulos de la organizacion" },
  { key: "modules.configure", description: "Habilitar/deshabilitar y configurar modulos" },
  { key: "templates.view", description: "Ver plantillas disponibles" },
  { key: "templates.apply", description: "Aplicar una plantilla a la organizacion" },
  // Fase 2B-2: dashboard / widgets / preferencias
  { key: "dashboard.view", description: "Ver dashboard" },
  { key: "dashboard.configure_own", description: "Configurar el dashboard propio" },
  { key: "dashboard.configure_org", description: "Configurar el dashboard a nivel organizacion" },
  { key: "user_preferences.view", description: "Ver preferencias propias" },
  { key: "user_preferences.update", description: "Actualizar preferencias propias" },
  // Fase 3A: identidad operativa
  { key: "contacts.view", description: "Ver contactos" },
  { key: "contacts.manage", description: "Crear/editar/gestionar contactos" },
  { key: "contacts.merge", description: "Fusionar contactos (alto riesgo; solo owner/admin)" },
  { key: "conversations.view", description: "Ver conversaciones" },
  { key: "conversations.manage", description: "Gestionar conversaciones" },
  { key: "prospects.view", description: "Ver prospectos" },
  { key: "prospects.manage", description: "Promover/gestionar prospectos" },
  { key: "patients.view", description: "Ver pacientes" },
  { key: "patients.manage", description: "Promover/gestionar pacientes" },
  { key: "opportunities.view", description: "Ver oportunidades" },
  { key: "opportunities.manage", description: "Crear/gestionar oportunidades" },
  // Fase 3B: Follow operativo
  { key: "conversations.assign", description: "Asignar conversación a un responsable" },
  { key: "conversations.classify", description: "Clasificar/priorizar conversación" },
  { key: "conversations.close", description: "Cerrar/reabrir conversación" },
  { key: "tasks.view", description: "Ver tareas de seguimiento" },
  { key: "tasks.manage", description: "Crear/completar/cancelar/asignar tareas" },
  { key: "suggested_actions.execute", description: "Ejecutar (registrar) una acción sugerida manual" },
  // Fase 4A: Agenda base
  { key: "appointments.view", description: "Ver citas" },
  { key: "appointments.create", description: "Crear citas" },
  { key: "appointments.reschedule", description: "Reagendar citas" },
  { key: "appointments.cancel", description: "Cancelar citas" },
  { key: "appointments.confirm", description: "Confirmar citas" },
  { key: "appointments.mark_no_show", description: "Marcar no-show" },
  { key: "appointments.complete", description: "Completar citas" },
  { key: "resources.view", description: "Ver recursos" },
  { key: "resources.manage", description: "Crear/editar recursos" },
  { key: "availability.manage", description: "Configurar disponibilidad semanal" },
  { key: "schedule.block", description: "Bloquear horarios manualmente" },
  // Fase 5A: Consulta clínica (datos de salud, acceso estrecho)
  { key: "clinical.view", description: "Ver expediente/consulta clínica" },
  { key: "clinical.create", description: "Crear consulta clínica" },
  { key: "clinical.edit", description: "Editar consulta no finalizada" },
  { key: "clinical.finalize", description: "Finalizar consulta" },
  { key: "clinical.cancel", description: "Cancelar consulta" },
  { key: "clinical_notes.add", description: "Agregar nota clínica (append-only)" },
  // Fase 5B: Odontograma (datos de salud, acceso estrecho)
  { key: "odontogram.view", description: "Ver odontograma del paciente" },
  { key: "odontogram.record", description: "Registrar/superseder hallazgos del odontograma" },
  { key: "odontogram.void", description: "Anular hallazgo de odontograma (exige motivo; permiso más estricto que record)" },
  // Fase 5C: Plan de tratamiento (datos de salud, acceso estrecho)
  { key: "treatment.view", description: "Ver plan de tratamiento" },
  { key: "treatment.create", description: "Crear plan/ítems de tratamiento" },
  { key: "treatment.edit", description: "Editar plan/ítems no terminales" },
  { key: "treatment.propose", description: "Proponer plan al paciente" },
  { key: "treatment.accept", description: "Registrar aceptación/rechazo y activar" },
  { key: "treatment.complete", description: "Completar plan/ítems" },
  { key: "treatment.cancel", description: "Cancelar plan/ítems" },
  // Fase 6A: Presupuestos (comercial/financiero)
  { key: "quote.view", description: "Ver presupuestos" },
  { key: "quote.create", description: "Crear presupuestos y líneas" },
  { key: "quote.edit", description: "Editar presupuesto en DRAFT" },
  { key: "quote.propose", description: "Proponer presupuesto" },
  { key: "quote.accept", description: "Registrar aceptación/rechazo" },
  { key: "quote.cancel", description: "Cancelar/expirar presupuesto" },
  // Fase 6B: Cobros/Pagos (financiero)
  { key: "payment.view", description: "Ver pagos y saldos" },
  { key: "payment.record", description: "Registrar pagos" },
  { key: "payment.reverse", description: "Revertir/anular pagos" },
  // Fase 7A: Configuración / Catálogos / Onboarding
  { key: "config.view", description: "Ver configuración y catálogos" },
  { key: "config.manage", description: "Editar configuración general (formas de pago, reglas de presupuesto, notificaciones)" },
  { key: "catalog.manage", description: "Crear/editar servicios, medicamentos y plantillas de documentos" },
  { key: "pricing.manage", description: "Editar precios base del catálogo de servicios" },
  { key: "import.run", description: "Ejecutar importaciones (pacientes, servicios)" },
  { key: "tax_profile.view", description: "Ver datos fiscales de la clínica (sensible)" },
  { key: "tax_profile.manage", description: "Editar datos fiscales de la clínica (sensible)" },
  // FVO-1: Ficha Viva Odontológica — datos extendidos del paciente
  { key: "patient.demographics.view", description: "Ver datos demográficos del paciente: fecha nac., sexo, domicilio, tutor, contacto de emergencia, origen comercial, consentimiento" },
  { key: "patient.clinical_profile.view", description: "Ver perfil clínico del paciente: alergias, medicamentos, antecedentes, alertas médicas detalle (datos de salud, acceso estrecho)" },
  { key: "patient.tax.view", description: "Ver datos fiscales del paciente: RFC, régimen fiscal, uso CFDI" },
  // FVO-1a: Escritura de datos del paciente
  { key: "patient.demographics.edit", description: "Editar datos demográficos, domicilio y origen comercial del paciente" },
  { key: "patient.clinical_profile.edit", description: "Editar perfil clínico y alertas médicas del paciente (datos de salud, acceso estrecho)" },
  { key: "patient.tax.edit", description: "Editar datos fiscales del paciente (sensible)" },
  { key: "patient.guardian.edit", description: "Crear/editar tutores o responsables legales del paciente" },
  { key: "patient.emergency_contact.edit", description: "Crear/editar contactos de emergencia del paciente" },
  { key: "patient.consent.manage", description: "Registrar y revocar consentimientos de tratamiento de datos (LFPDPPP)" },
];

export interface RoleDef {
  key: string;
  name: string;
  scope: "ORG" | "PLATFORM";
  assignable: boolean;
  permissions: string[];
}

// Asignaciones de Fase 2A. 2B agregara permisos operativos a estos mismos roles.
export const ROLES: RoleDef[] = [
  {
    key: "owner",
    name: "Propietario",
    scope: "ORG",
    assignable: true,
    permissions: [
      "app_shell.view", "organization.view", "organization.select", "organization.manage",
      "organization.members.view", "organization.members.invite",
      "organization.members.update_role", "organization.members.remove",
      "audit.view", "events.view", "settings.view", "settings.manage",
      "support_access.view", "support_access.grant", "support_access.revoke",
      "modules.view", "modules.configure", "templates.view", "templates.apply",
      "dashboard.view", "dashboard.configure_own", "dashboard.configure_org",
      "user_preferences.view", "user_preferences.update",
      "contacts.view", "contacts.manage", "contacts.merge", "conversations.view", "conversations.manage", "prospects.view", "prospects.manage", "patients.view", "patients.manage", "opportunities.view", "opportunities.manage", "conversations.assign", "conversations.classify", "conversations.close", "tasks.view", "tasks.manage", "suggested_actions.execute", "appointments.view", "appointments.create", "appointments.reschedule", "appointments.cancel", "appointments.confirm", "appointments.mark_no_show", "appointments.complete", "resources.view", "resources.manage", "availability.manage", "schedule.block", "clinical.view", "clinical.create", "clinical.edit", "clinical.finalize", "clinical.cancel", "clinical_notes.add", "odontogram.view", "odontogram.record", "odontogram.void", "treatment.view", "treatment.create", "treatment.edit", "treatment.propose", "treatment.accept", "treatment.complete", "treatment.cancel", "quote.view", "quote.create", "quote.edit", "quote.propose", "quote.accept", "quote.cancel", "payment.view", "payment.record", "payment.reverse",
      "config.view", "config.manage", "catalog.manage", "pricing.manage", "import.run", "tax_profile.view", "tax_profile.manage",
      "patient.demographics.view", "patient.clinical_profile.view", "patient.tax.view",
      "patient.demographics.edit", "patient.clinical_profile.edit", "patient.tax.edit",
      "patient.guardian.edit", "patient.emergency_contact.edit", "patient.consent.manage",
    ],
  },
  {
    key: "admin",
    name: "Administrador",
    scope: "ORG",
    assignable: true,
    permissions: [
      "app_shell.view", "organization.view", "organization.select", "organization.manage",
      "organization.members.view", "organization.members.invite",
      "organization.members.update_role", "organization.members.remove",
      "audit.view", "events.view", "settings.view", "settings.manage",
      "support_access.view",
      "modules.view", "modules.configure", "templates.view", "templates.apply",
      "dashboard.view", "dashboard.configure_own", "dashboard.configure_org",
      "user_preferences.view", "user_preferences.update",
      "contacts.view", "contacts.manage", "contacts.merge", "conversations.view", "conversations.manage", "prospects.view", "prospects.manage", "patients.view", "patients.manage", "opportunities.view", "opportunities.manage", "conversations.assign", "conversations.classify", "conversations.close", "tasks.view", "tasks.manage", "suggested_actions.execute", "appointments.view", "appointments.create", "appointments.reschedule", "appointments.cancel", "appointments.confirm", "appointments.mark_no_show", "appointments.complete", "resources.view", "resources.manage", "availability.manage", "schedule.block", "clinical.view", "clinical.create", "clinical.edit", "clinical.finalize", "clinical.cancel", "clinical_notes.add", "odontogram.view", "odontogram.record", "odontogram.void", "treatment.view", "treatment.create", "treatment.edit", "treatment.propose", "treatment.accept", "treatment.complete", "treatment.cancel", "quote.view", "quote.create", "quote.edit", "quote.propose", "quote.accept", "quote.cancel", "payment.view", "payment.record", "payment.reverse",
      "config.view", "config.manage", "catalog.manage", "pricing.manage", "import.run", "tax_profile.view", "tax_profile.manage",
      "patient.demographics.view", "patient.clinical_profile.view", "patient.tax.view",
      "patient.demographics.edit", "patient.clinical_profile.edit", "patient.tax.edit",
      "patient.guardian.edit", "patient.emergency_contact.edit", "patient.consent.manage",
    ],
  },
  {
    key: "front_desk",
    name: "Recepcion",
    scope: "ORG",
    assignable: true,
    permissions: ["app_shell.view", "organization.view", "organization.members.view", "modules.view", "templates.view", "dashboard.view", "dashboard.configure_own", "user_preferences.view", "user_preferences.update", "contacts.view", "contacts.manage", "patients.view", "conversations.view", "conversations.manage", "prospects.view", "opportunities.view", "conversations.assign", "conversations.classify", "conversations.close", "tasks.view", "tasks.manage", "suggested_actions.execute", "appointments.view", "appointments.create", "appointments.reschedule", "appointments.cancel", "appointments.confirm", "appointments.mark_no_show", "appointments.complete", "resources.view", "schedule.block", "quote.view", "quote.create", "quote.edit", "quote.propose", "payment.view", "payment.record",
      "config.view",
      "patient.demographics.view",
      "patient.demographics.edit", "patient.guardian.edit", "patient.emergency_contact.edit", "patient.consent.manage",
    ]
  },
  {
    key: "clinician",
    name: "Clinico",
    scope: "ORG",
    assignable: true,
    permissions: ["app_shell.view", "organization.view", "modules.view", "templates.view", "dashboard.view", "dashboard.configure_own", "user_preferences.view", "user_preferences.update", "contacts.view", "patients.view", "patients.manage", "conversations.view", "tasks.view", "tasks.manage", "suggested_actions.execute", "appointments.view", "appointments.confirm", "appointments.mark_no_show", "appointments.complete", "resources.view", "clinical.view", "clinical.create", "clinical.edit", "clinical.finalize", "clinical.cancel", "clinical_notes.add", "odontogram.view", "odontogram.record", "odontogram.void", "treatment.view", "treatment.create", "treatment.edit", "treatment.propose", "treatment.accept", "treatment.complete", "treatment.cancel", "quote.view",
      "config.view",
      "patient.demographics.view", "patient.clinical_profile.view",
      "patient.clinical_profile.edit",
    ]
  },
  {
    key: "billing",
    name: "Cobranza",
    scope: "ORG",
    assignable: true,
    permissions: ["app_shell.view", "organization.view", "modules.view", "templates.view", "dashboard.view", "dashboard.configure_own", "user_preferences.view", "user_preferences.update", "contacts.view", "opportunities.view", "conversations.view", "appointments.view", "resources.view", "quote.view", "quote.create", "quote.edit", "quote.propose", "quote.accept", "quote.cancel", "payment.view", "payment.record", "payment.reverse",
      "config.view", "tax_profile.view",
      "patient.demographics.view", "patient.tax.view",
      "patient.tax.edit",
    ]
  },
  {
    key: "accountant",
    name: "Contabilidad",
    scope: "ORG",
    assignable: true,
    permissions: ["app_shell.view", "organization.view", "audit.view", "events.view", "modules.view", "templates.view", "dashboard.view", "dashboard.configure_own", "user_preferences.view", "user_preferences.update", "contacts.view", "opportunities.view", "conversations.view", "appointments.view", "resources.view", "quote.view", "payment.view",
      "config.view", "tax_profile.view", "tax_profile.manage",
      "patient.tax.view",
      "patient.tax.edit",
    ]
  },
  {
    key: "support_restricted",
    name: "Soporte (plataforma)",
    scope: "PLATFORM",
    assignable: false,
    permissions: ["support.read_logs"],
  },
];
