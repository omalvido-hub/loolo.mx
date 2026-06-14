# Nelzzon — Fase 2B-2: Dashboard / widgets / preferencias / resolver

Capa de configuración de dashboard desde datos. **Sin UI final, sin drag/drop, sin KPIs reales.**

## Resultado
- **51/51 pruebas verdes** (10 Fase 1 + 13 Fase 2A + 17 Fase 2B-1 + **11 Fase 2B-2**), sin regresión.
- Typecheck de dominio + seeds + tests: limpio (exit 0).

## Migración
- `prisma/migrations/0005_phase2b2_dashboard_preferences.sql` (0001–0004 NO se tocaron).

## Tablas
- `dashboard_widget_catalog` — global, sin RLS. `key, name, description, sourceModuleKey, widgetType, requiredPermissions[], configSchemaKey, functionalStatus`.
- `organization_dashboard_widgets` — RLS+FORCE por `organizationId`. `widgetKey, enabled, visible, size, sortOrder, configJson, customized, configuredBy`. Grants `SELECT/INSERT/UPDATE` (sin DELETE).
- `user_preferences` — **doble RLS** (`organizationId` + `userId`). `preferenceKey, preferenceValueJson`. Grants `SELECT/INSERT/UPDATE` (sin DELETE).

## RLS / GUC
- `forTenantAsUser(orgId, userId, work)` fija `app.current_tenant_id` **y** `app.current_user_id` (locales a la transacción).
- `user_preferences` exige ambos GUC → **fail-closed** si falta el de usuario (0 filas).

## Permisos
`dashboard.view`, `dashboard.configure_own`, `dashboard.configure_org`, `user_preferences.view`, `user_preferences.update`.
owner/admin = todos; front_desk/clinician/billing/accountant = todos menos `dashboard.configure_org`.

## Operaciones (con enforcement)
- `enableOrganizationWidget` / `disableOrganizationWidget` / `updateOrganizationWidgetConfig` → exigen `dashboard.configure_org`.
- `updateUserPreference` → exige `user_preferences.update`, solo el mismo `userId` (forzado por RLS).

## Validadores Zod
- Preferencias: set CERRADO (`ui.density`, `nav.left_sidebar_collapsed`, `dock.collapsed`, `dashboard.personal_hidden_widgets`, `dashboard.personal_widget_order`).
- `configJson`: validado por `configSchemaKey` (placeholder = strict). Inválido → no persiste.

## Resolver
`resolveNavigationAndWidgets` puro. Orden **permisos → organización → preferencia personal**. La preferencia solo oculta/reordena; nunca expone módulo/widget negado por permiso u organización.

## Eventos
Solo `dashboard.widget_enabled` / `dashboard.widget_disabled`. Preferencias personales NO emiten evento.

## Auditoría
Cambios org-level auditados; `permission.denied` durable vía `guardConfigOperation`; preferencias personales de bajo riesgo no se auditan.

## Widgets semilla (placeholders, `prepared_for_later`)
`executive_summary_placeholder` (requiere `audit.view`), `pending_followups_placeholder`, `upcoming_appointments_placeholder`. Sin datos reales.

## Pruebas 2B-2 (11)
RLS widgets A/B; doble RLS user_preferences; fail-closed sin user GUC; X no ve prefs de Y; `configJson`/`preferenceValueJson` inválidos rechazados; widget sin permiso no aparece; widget/módulo negado por org o permiso no aparece aunque la preferencia lo pida; preferencia reordena/oculta lo permitido; front_desk no puede `configure_org` (rechazo + audit durable + sin cambios); `widget_enabled` solo con acción permitida + evento; preferencia personal no genera evento.

## Ajuste menor (aprobado)
`organization_dashboard_widgets` usa `sortOrder` + `size`; se omitió `position` (orden por `sortOrder`). Posición de grid se agregaría en una fase visual futura.

## Riesgos reales pendientes
- Validar Prisma/Next en entorno real (motor/Next bloqueados en sandbox; probado el equivalente vía pg con mismo rol, políticas y doble GUC).
- Los widgets son placeholders: no calculan datos.
- Cuando se construyan KPIs reales, el cálculo debe **revalidar permisos**, no apoyarse solo en el resolver.

## Fuera de alcance (no construido)
UI final, drag/drop, branding, KPIs reales, Agenda, Cobros, Portal, Marketing APIs, Inventario operativo, reportes reales, navegación avanzada fuera del resolver base. **No existe 0006 ni avance fuera de fase.**
