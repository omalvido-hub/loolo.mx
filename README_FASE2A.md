# Nelzzon — Fase 2A: Columna de seguridad operativa

Auth real (código), selección segura de organización, enforcement de permisos en servidor,
acceso de soporte temporal/auditado, y auditoría con `actorType`. **Sin diseño visual.**

## Resultado de pruebas
- **23/23 tests verdes** (10 Fase 1 sin regresión + 13 Fase 2A).
- Typecheck de dominio + tests: **limpio (exit 0)**.

## 1. Archivos creados/modificados
Nuevos (dominio, puro y probado):
- `src/server/domain/identity/permissions.ts` — `can` / `assertCan` / `canAll`.
- `src/server/domain/identity/organizations.ts` — guard de selección + decisión por defecto.
- `src/server/domain/identity/support-access.ts` — estado efectivo + lifecycle de grants.
- `src/server/domain/audit/record.ts` — builder Zod, `recordAudit`, `recordPermissionDenied`.

Nuevos (auth/producción — validación en tu entorno):
- `src/server/auth/session.ts` — `getCurrentUser` / `requireAuth` / `requireOrganization` / `getCurrentOrganization`.
- `src/server/auth/permissions.ts` — `resolvePermissionKeys` (cliente identidad) + `requirePermission` (audita denegados).
- `src/server/auth/organization.ts` — `selectOrganization` (guard de membresía + persistencia en sesión).
- `src/app/api/auth/[...all]/route.ts` — handler Better Auth.

Modificados:
- `prisma/schema.prisma` — enums `ActorType`, `SupportGrantStatus`; `AuditLog.actorType`; modelo `SupportAccessGrant`.
- `src/server/domain/identity/rbac.ts` — **reescrito a notación punto** (estandarización) + matriz 2A.

## 2. Migraciones
- `prisma/migrations/0003_phase2a_security.sql` — `actorType` en `audit_logs` + tabla `support_access_grants` con RLS+FORCE.

## 3. Tablas nuevas / cambios de esquema
- **Nueva:** `support_access_grants` (org-scoped, RLS, sin DELETE para `app_user`).
- **Cambio:** `audit_logs.actorType` (`USER` / `SYSTEM` / `AI` / `SUPPORT`, default `USER`).

## 4. Cambios a audit_logs / events
- `audit_logs`: + `actorType`; recibe `permission.denied`, `organization.selected`,
  `support_access.granted/revoked/used`, cambios de rol (hechos de SEGURIDAD).
- `events`: **sin cambios** — se mantiene lean y tipado. Decisión deliberada: las acciones de
  2A son de seguridad, no eventos operativos de negocio; van a auditoría, no a `events`.

## 5. Permisos implementados (notación punto)
`app_shell.view`, `organization.view/select/manage`,
`organization.members.view/invite/update_role/remove`, `audit.view`, `events.view`,
`settings.view/manage`, `support_access.view/grant/revoke`, `support.read_logs`.

Asignación: owner = todo (incl. grant/revoke soporte); admin = todo salvo grant/revoke soporte;
front_desk/clinician/billing/accountant = acceso base (lo operativo llega en 2B);
**support_restricted = PLATFORM, no asignable**.

## 6. Pruebas ejecutadas (13 en Fase 2A)
- Permisos: owner gestiona y concede soporte; admin cambia roles pero NO concede soporte;
  front_desk y billing NO cambian roles.
- Selección de org: permite la propia; **rechaza la ajena (FORBIDDEN)**; auto/none/choose.
- Auditoría: `permission.denied` se registra en `audit_logs` y NO existe como tipo de evento;
  `actorType=SUPPORT` persiste.
- Soporte: conceder→ACTIVE; revocar→no usable; expirado→no usable; uso incrementa `useCount`;
  usar un grant revocado lanza error; **RLS: B no ve grants de A**.

## 7–9. Cómo correr
```bash
npm install
# Postgres con roles app_admin (BYPASSRLS) y app_user (sin bypass)
psql ... -f prisma/migrations/0001_init.sql
psql ... -f prisma/migrations/0002_rls_policies.sql
psql ... -f prisma/migrations/0003_phase2a_security.sql
npx prisma generate        # en tu entorno (engine alcanzable)
npm test                   # 23 pruebas
```

## 10. Qué SÍ quedó probado en sandbox
Matriz de permisos, guard de organización, RLS de `support_access_grants`, ciclo completo de
soporte (grant/revoke/expire/use), `permission.denied` auditado, `actorType`, y separación
events↔audit. Todo contra Postgres 16 real con el rol `app_user` (RLS forzado).

## 11. Qué NO pudo probarse end-to-end aquí (validar en tu entorno)
- Login/logout reales de Better Auth y protección de rutas: requieren servidor Next corriendo.
- `resolvePermissionKeys` / `selectOrganization` vía Prisma: el motor de Prisma está bloqueado
  por red en el sandbox. La **lógica equivalente** (mismos joins, mismo guard) sí está probada
  vía pg con el mismo rol y políticas.
- El handler `/api/auth/[...all]` y `next/headers`: Next no está instalado en el sandbox.

## 12. Campos extra que agregué a support_access_grants (justificación)
- `scope` (default `read_logs_anonymized`): mínimo privilegio — un grant declara QUÉ permite,
  no acceso total. Preparado para que soporte solo vea logs anonimizados.
- `useCount`: auditoría de uso repetido (no basta con `usedAt`; importa cuántas veces se usó).

## 13. Riesgos / pendientes para 2B
- **Rendimiento de permisos:** `resolvePermissionKeys` hace varios joins por acción sensible.
  Correcto, pero en 2B conviene cachear el set de permisos por sesión.
- **Migración de catálogo:** se estandarizó a notación punto; cualquier referencia vieja a
  `recurso:accion` debe actualizarse (no había uso real fuera del seed ilustrativo de Fase 1).
- **Uso real del grant de soporte:** el login del usuario de soporte usando un grant activo es
  flujo de plataforma; 2A deja la estructura y el lifecycle, no el login de soporte.
- **2B construye encima:** module_catalog, templates, organization_modules, dashboard/nav/widgets,
  Odontología, Inventario y Marketing — ya con permisos sólidos debajo.
