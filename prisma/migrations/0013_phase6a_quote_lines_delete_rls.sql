-- LOOLO — Migración 0013_phase6a_quote_lines_delete_rls
-- Ejecutada por app_admin. SOLO refuerza RLS de quote_lines. No toca 0001-0012.
-- No cambia tablas, modelo ni grants. Mantiene aislamiento por org en SELECT/INSERT/UPDATE
-- y restringe DELETE a líneas cuyo quote padre esté en la MISMA org y en estado DRAFT.
-- Objetivo: que la garantía de inmutabilidad del dinero viva en la BD, no solo en el dominio.

-- Reemplazar la policy ALL por policies por comando (mismo aislamiento por organizationId).
DROP POLICY IF EXISTS tenant_isolation ON "quote_lines";

CREATE POLICY quote_lines_select ON "quote_lines" FOR SELECT
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY quote_lines_insert ON "quote_lines" FOR INSERT
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY quote_lines_update ON "quote_lines" FOR UPDATE
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- DELETE: además del aislamiento por org, exige que el quote padre exista en la misma org
-- y esté en DRAFT. Fuera de DRAFT, ninguna fila es "visible" para borrar → no borra nada.
CREATE POLICY quote_lines_delete ON "quote_lines" FOR DELETE
  USING (
    "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM "quotes" q
      WHERE q."id" = "quote_lines"."quoteId"
        AND q."organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        AND q."status" = 'DRAFT'
    )
  );
