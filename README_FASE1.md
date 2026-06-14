# Nelzzon — Fase 1: Columna vertebral técnica

Base multi-tenant con aislamiento a nivel de motor, RBAC, eventos tipados, auditoría
append-only y el flujo de entrada mínimo. **Sin UI** (eso es fase posterior, por diseño).

## Stack
- Next.js + TypeScript (estructura lista; UI pendiente)
- PostgreSQL 16 + Prisma 7 (driver-adapter `pg`)
- Better Auth 1.6 (auth, sesiones, organizaciones, membresías)
- Zod 4 (validadores y eventos tipados)
- Vitest (pruebas)

## Decisiones clave (acordadas)
1. Multi-tenant = `organizationId` **+ Row-Level Security de Postgres** (defensa en profundidad).
2. Dos roles de BD: `app_admin` (BYPASSRLS, solo identidad/migraciones) y `app_user`
   (runtime, SIN bypass, sujeto a RLS).
3. Better Auth dueño de `users / organizations / organization_memberships / sessions /
   accounts / invitations`. Nelzzon dueño de la capa fina `roles / permissions /
   role_permissions / membership_roles` (catálogos **globales**; el vínculo por org es
   `membership_roles`).
4. `events` (hechos tipados con Zod, versionados) ≠ `audit_logs` (rastro). Ambos **append-only**.
5. Lógica de negocio en `src/server/domain` (pura, sin framework). UI sin reglas críticas.
6. `support_restricted` = rol de **plataforma no asignable** a membresía normal; su acceso
   real será un grant temporal auditado (fase posterior).
7. Soft delete (`archivedAt` / `deletedAt`) en datos sensibles/clínicos.

## Roles sembrados
Organización: `owner`, `admin`, `front_desk`, `clinician`, `billing`, `accountant`.
Plataforma (no asignable): `support_restricted`.

## Estructura
```
prisma/
  schema.prisma              # fuente de diseño (Prisma)
  migrations/
    0001_init.sql            # tablas
    0002_rls_policies.sql    # RLS + FORCE + grants mínimos + append-only
  seed.ts                    # flujo de entrada end-to-end
src/server/
  db/{admin,tenant}.ts       # cliente privilegiado vs cliente tenant-scoped (forTenant)
  auth/config.ts             # Better Auth + plugin organización
  domain/
    shared/status.ts         # máquina de estados + Result (fail-closed)
    events/schemas.ts        # eventos Zod versionados
    conversations/receive-inbound.ts  # Follow: planificador puro (reglas 7,8,9,13)
    identity/rbac.ts         # catálogo de permisos y roles
tests/
  harness.ts                 # pools pg + forTenantPg (réplica de tenant.ts)
  tenant-isolation.test.ts   # 10 pruebas
```

## Pruebas (10/10 ✓)
1. Lectura aislada por tenant.
2. Acceso por id ajeno → bloqueado.
3. INSERT cruzado → rechazado por `WITH CHECK`.
4. UPDATE cruzado → 0 filas (RLS oculta).
5. Sin tenant → 0 filas (fail-closed, vía `NULLIF`).
6. `audit_logs` / `events` rechazan UPDATE/DELETE (append-only).
7. Tablas de Better Auth no expuestas a `app_user`.
8. Mensaje entrante NO crea paciente ni oportunidad; sin canal → `MISSING_DATA`;
   evento con payload inválido NO se emite.

## ⚠️ Nota sobre el sandbox de construcción
En el entorno donde se construyó esto, `binaries.prisma.sh` está bloqueado por red, así que
la **CLI de Prisma no pudo migrar/generar aquí**. Por eso:
- Las migraciones son **SQL explícito** (`0001`, `0002`) — que de todos modos es lo correcto
  para RLS.
- La prueba ejecutable usa `node-postgres` conectando como `app_user`, con las **mismas
  políticas RLS y el mismo patrón transaccional** que el cliente Prisma de producción.
  Una garantía de RLS es a nivel de BD: probarla con `app_user` la prueba para Prisma.

En tu entorno (con `binaries.prisma.sh` accesible) puedes usar Prisma directamente.

## Cómo correr en tu entorno
```bash
npm install
# Postgres con dos roles: app_admin (BYPASSRLS) y app_user (sin bypass)
psql ... -f prisma/migrations/0001_init.sql
psql ... -f prisma/migrations/0002_rls_policies.sql
npx prisma generate          # genera el cliente (engine alcanzable)
npm run seed                 # flujo de entrada
npm test                     # 10 pruebas
```
