-- NELZZON — Migración 0022_organization_finance_periods
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001–0021.
-- Meta mensual y costos fijos de la organización, POR PERIODO (año/mes) —
-- no una fila fija única, para poder comparar meses en Reportes más adelante.
-- Alimenta el Panel (META %, FLUJO NETO SOBRE LO COBRADO, PUNTO DE EQUILIBRIO).
-- Dinero en centavos MXN (BIGINT), igual que quotes/payments.

CREATE TABLE "organization_finance_periods" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId"           UUID NOT NULL,
  "periodYear"               SMALLINT NOT NULL,
  "periodMonth"              SMALLINT NOT NULL,
  "monthlyGoalCents"         BIGINT NOT NULL DEFAULT 0,
  "fixedCostRentCents"       BIGINT NOT NULL DEFAULT 0,
  "fixedCostPayrollCents"    BIGINT NOT NULL DEFAULT 0,
  "fixedCostUtilitiesCents"  BIGINT NOT NULL DEFAULT 0,
  "fixedCostSuppliesCents"   BIGINT NOT NULL DEFAULT 0,
  "createdAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "finance_period_month_valid" CHECK ("periodMonth" BETWEEN 1 AND 12),
  CONSTRAINT "finance_period_amounts_nonneg" CHECK (
    "monthlyGoalCents" >= 0 AND "fixedCostRentCents" >= 0 AND "fixedCostPayrollCents" >= 0 AND
    "fixedCostUtilitiesCents" >= 0 AND "fixedCostSuppliesCents" >= 0
  ),
  UNIQUE ("organizationId", "periodYear", "periodMonth")
);
CREATE INDEX "org_finance_periods_org_idx" ON "organization_finance_periods"("organizationId");

-- Config editable (como quote_setting/service_catalog): sin DELETE para app_user,
-- un periodo mal capturado se corrige con UPDATE, no se borra.
GRANT SELECT, INSERT, UPDATE ON "organization_finance_periods" TO app_user;
REVOKE DELETE ON "organization_finance_periods" FROM app_user;

ALTER TABLE "organization_finance_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_finance_periods" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_finance_periods"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
