-- LOOLO — Migración 0002_rls_policies
-- Defensa en profundidad. Ejecutada por app_admin (dueño).
-- Política de tenant: organizationId == current_setting('app.current_tenant_id').
-- La variable se fija LOCAL a la transacción (ver src/server/db/tenant.ts) → segura con pooling.

-- ───────────────────────────────────────────────────────────────────
-- 1) Permisos base de esquema para el rol runtime (app_user, SIN bypass)
-- ───────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO app_user;

-- Catálogos RBAC: solo lectura (no se editan en runtime en Fase 1)
GRANT SELECT ON "permissions", "roles", "role_permissions", "membership_roles" TO app_user;

-- Tablas Better Auth: app_user NO las toca directamente (las opera la capa de identidad
-- con app_admin). No otorgamos privilegios → acceso denegado por defecto.

-- ───────────────────────────────────────────────────────────────────
-- 2) Helper: aplica RLS de tenant (lectura+escritura) a una tabla de dominio
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  domain_tables TEXT[] := ARRAY[
    'contacts','prospects','patients','opportunities',
    'channels','conversations','messages'
  ];
BEGIN
  FOREACH t IN ARRAY domain_tables LOOP
    -- DML completo para app_user (sujeto a RLS)
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_user;', t);

    -- Activar y FORZAR RLS (FORCE: ni el dueño se la salta)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY;', t);

    -- Política de aislamiento por tenant (lectura y escritura)
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    $f$, t);
  END LOOP;
END$$;

-- ───────────────────────────────────────────────────────────────────
-- 3) events: org-scoped + APPEND-ONLY (hechos inmutables → reportes confiables, regla 21)
-- ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON "events" TO app_user;          -- sin UPDATE ni DELETE
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "events"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ───────────────────────────────────────────────────────────────────
-- 4) audit_logs: org-scoped + APPEND-ONLY (regla 22). app_user solo INSERT/SELECT.
--    Sin UPDATE/DELETE: la bitácora es inmutable a nivel de motor (regla 23).
-- ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON "audit_logs" TO app_user;      -- sin UPDATE ni DELETE
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE  ROW LEVEL SECURITY;
-- app_user solo ve/inserta auditoría de SU organización (las de organización NULL son de plataforma)
CREATE POLICY tenant_isolation ON "audit_logs"
  USING      ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ───────────────────────────────────────────────────────────────────
-- 5) Garantía explícita anti-bypass: app_user NO debe poder modificar la bitácora.
--    (REVOKE redundante por claridad/intención.)
-- ───────────────────────────────────────────────────────────────────
REVOKE UPDATE, DELETE ON "audit_logs" FROM app_user;
REVOKE UPDATE, DELETE ON "events"     FROM app_user;
