# Nelzzon — Fase 2B-1: Catálogo de módulos, plantillas y configuración

Capa de **configuración** (no funcionalidad). Catálogo global de módulos, plantilla Odontología
general, módulos por organización con superficies múltiples, y operaciones de configuración con
permisos, eventos y auditoría. **Sin diseño visual ni módulos funcionales.**

## Resultado de pruebas
- **40/40 verdes** (10 Fase 1 + 13 Fase 2A + **17 nuevas 2B-1**), sin regresión.
- Typecheck de dominio + seed + tests: **limpio (exit 0)**.

## Archivos creados/modificados
Nuevos (dominio):
- `src/server/domain/modules/catalog-data.ts` — 20 maestros + 9 transversales.
- `src/server/domain/modules/template-data.ts` — plantilla Odontología + mapeo de módulos.
- `src/server/domain/modules/apply-template.ts` — `applyTemplateToOrganization`.
- `src/server/domain/modules/configure.ts` — `enableModule` / `disableModule` / `updateOrganizationModuleVisibility`.
- `prisma/seed-modules.ts` — seed idempotente.
- `tests/phase2b1.test.ts` — 17 pruebas.
- `vitest.config.ts` — ejecución secuencial (evita carreras de catálogo entre archivos).

Modificados (additivo, sin tocar lo congelado):
- `prisma/schema.prisma` — +5 enums, +4 modelos (ModuleCatalog, BusinessTemplate, TemplateModule, OrganizationModule).
- `src/server/domain/events/schemas.ts` — +3 eventos (`template.applied`, `module.enabled`, `module.disabled`).
- `src/server/domain/identity/rbac.ts` — +4 permisos y asignaciones.

## Migración creada
- `prisma/migrations/0004_phase2b1_modules_templates.sql` (las 0001–0003 NO se tocaron).

## Tablas nuevas + campos exactos
**Globales (sin RLS):**
- `module_catalog`: key, name, description, moduleGroup, moduleType, status, isCore, isTransversal, defaultEnabled, defaultVisible, defaultShowInMenu, defaultShowInDock, defaultDashboardAvailable, functionalStatus, timestamps.
- `business_templates`: key, category, groupName, professionUnit, specialtyService, templateName, phase, detailLevel, version, status, timestamps.
- `template_modules`: templateId, moduleId, isRequired, isRecommended, isOptional, defaultEnabled, defaultVisible, defaultShowInMenu, defaultShowInDock, defaultDashboardAvailable, menuSortOrder, labelOverride, iconKey, notes, timestamps. UNIQUE(templateId, moduleId).

**Org-scoped (RLS + FORCE):**
- `organization_modules`: organizationId, moduleId, templateId, appliedTemplateVersion, **enabled, visible, showInMenu, showInDock, dashboardAvailable** (superficies múltiples, NO surface único), menuSortOrder, dockSortOrder, dashboardSortOrder, labelOverride, iconKey, **customized**, configuredBy, configuredAt, timestamps. UNIQUE(organizationId, moduleId).

## RLS aplicado
Solo `organization_modules`: RLS + FORCE con el patrón `NULLIF(current_setting('app.current_tenant_id'))`. Catálogos globales sin RLS (como permissions/roles). `app_user`: DML completo en `organization_modules`, solo SELECT en catálogos.

## Permisos agregados
`modules.view`, `modules.configure`, `templates.view`, `templates.apply`.
Asignación: owner = los 4; admin = los 4; front_desk/clinician/billing/accountant = solo `modules.view` y `templates.view` (sin configure, sin apply).

## Seeds creados
`module_catalog` con los 29 módulos; `business_templates` con `odontologia_general` (Medicina/Salud Clínica · G. Dental · Odontología · Odontología general · Piloto · Completo · v1); `template_modules` enlazando los 29 con tier y defaults. Idempotente (ON CONFLICT por key / por (templateId,moduleId)).

## Eventos agregados (operativos, tipados con Zod)
`template.applied` {templateKey, templateVersion, modulesCreated}, `module.enabled` {moduleKey}, `module.disabled` {moduleKey}.

## Auditoría agregada
`template.applied`, `module.enabled`, `module.disabled`, `module.visibility_changed` (solo auditoría, no evento), y `permission.denied` en intentos sin permiso. Todo en `audit_logs` (append-only).

## Pruebas ejecutadas (17 nuevas)
Catálogo inicializa maestros+transversales; existe `odontologia_general`; `template_modules` enlaza los 29; Inventario opcional y no visible por defecto; Marketing opcional/configurable; `applyTemplateToOrganization` crea 29 módulos; idempotente (segunda vez crea 0); **re-aplicar no pisa customizaciones**; **módulo requerido no se puede deshabilitar**; owner puede configurar/aplicar; front_desk no; `permission.denied` en `audit_logs` y no en `events`; `template.applied`/`module.enabled` como eventos validados; acciones sensibles auditadas; **RLS aísla `organization_modules` entre A y B**.

## Qué quedó programado ahora
La capa de configuración completa: registro de módulos, plantilla dental, aplicación de plantilla, habilitar/deshabilitar/visibilidad, con permisos, eventos y auditoría.

## Qué quedó preparado para después
Los módulos operativos están en el catálogo con `functional_status='prepared_for_later'`: agenda, consulta, odontograma, plan, presupuestos, cobros, facturación, portal, finanzas, integraciones, IA, documentos, notificaciones, catálogos maestros, ajustes, migración, portal_access, **inventario** y **marketing**. Existen como configurables; su funcionalidad no se construyó.

## Qué NO pudo probarse en sandbox
La ejecución vía Prisma de estas operaciones (motor bloqueado por red) y cualquier flujo Next. La lógica equivalente sí está probada vía pg con el mismo rol `app_user`, las mismas políticas RLS y las mismas funciones de dominio.

## Riesgos antes de 2B-2
- **Semántica de re-aplicar:** hoy `apply` solo siembra faltantes (ON CONFLICT DO NOTHING). Si en el futuro se quiere "refrescar defaults de módulos no customizados", hay que diseñarlo explícitamente; no está hecho a propósito.
- **`user_preferences` (2B-2):** requiere el GUC `app.current_user_id` + RLS por usuario, ya acordado; no se tocó aquí.
- **Resolución de navegación/widgets (2B-2):** el resolver completo de menú/dock/dashboard se construye en 2B-2 sobre `organization_modules` (que ya tiene las superficies múltiples).

## Ajustes menores no arquitectónicos
- Agregué la columna `customized` a `organization_modules` (no estaba explícita en el spec) para poder garantizar "re-aplicar no pisa customizaciones". Es la marca que distingue lo que la organización tocó.

---

# Cierre de observaciones 2B-1 (revisión del usuario)

## 1. GRANT de organization_modules — corregido
`app_user` ahora tiene **SELECT, INSERT, UPDATE** (sin DELETE). DELETE revocado en migración
0004 y en la BD. Los módulos no se borran: se deshabilitan/ocultan. Verificado en la BD.

## 2. Enforcement real de permisos — agregado (era un hueco real)
Antes solo probaba que front_desk *carecía* del permiso, no que la operación lo *rechaza*.
Ahora:
- `authorize(ctx, permiso)` es **puro**: lanza `PermissionDeniedError` ANTES de cualquier
  escritura. Lo llaman internamente `applyTemplateToOrganization` (templates.apply),
  `enableModule`/`disableModule`/`updateOrganizationModuleVisibility` (modules.configure).
- `guardConfigOperation(runner, ctx, permiso, work)` enforza en el **límite transaccional**:
  si falta el permiso, registra `permission.denied` en su **propia transacción que SÍ commitea**
  y luego lanza.
- **Aprendizaje clave:** el audit del denegado NO puede ir dentro de la transacción de la
  operación, porque el `throw` provoca ROLLBACK y el audit se revertiría. Por eso el rechazo
  (no escribir) vive en la operación y el audit durable vive en el wrapper/boundary.
- Producción: el server action resuelve permisos (`resolvePermissionKeys`) y envuelve la
  operación con `guardConfigOperation` usando `forTenant` como runner.

Pruebas nuevas (17 en 2B-1): front_desk intenta aplicar plantilla → **rechazado antes de crear
filas (0 creadas) + permission.denied auditado durable**; front_desk intenta habilitar módulo →
rechazado, sin cambios; owner sí puede (control positivo).

## 3. functional_status con criterio estricto — revisado
| módulo | status | qué está construido | qué NO |
|---|---|---|---|
| channels_inbound | programmed_now | captura/almacenamiento de mensaje entrante (Fase 1) | integraciones reales WhatsApp/IG/FB/TikTok |
| contacts_patients | programmed_now | entidades separadas + regla no-auto-paciente (Fase 1) | gestión clínica/CRUD completa |
| identity_rbac | programmed_now | RBAC, enforcement, auditoría, RLS (1/2A) | login real Better Auth (validar en entorno) |
| config_onboarding | programmed_now | catálogo/plantillas/apply/enable/disable/visibilidad (2B-1) | onboarding guiado |
| data_model | programmed_now | esquema/migraciones de la columna vertebral | — |
| support_access | programmed_now | lifecycle de grants + auditoría + RLS (2A) | login del usuario de soporte usando un grant |
| **qa_checklist** | **prepared_for_later** (degradado) | — | módulo de producto; la suite de pruebas dev es infra aparte, no un módulo del tenant |

## Resultado tras correcciones
- **40/40 pruebas verdes** (10 + 13 + 17). Typecheck limpio.
- Migraciones 0001–0003 intactas (md5 estable). NO se avanzó a 2B-2.
