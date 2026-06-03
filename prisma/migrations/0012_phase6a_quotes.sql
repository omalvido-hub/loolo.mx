-- LOOLO — Migración 0012_phase6a_quotes
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0011.
-- Presupuestos base. DINERO: enteros en centavos MXN (sin float). Snapshot por línea.
-- Inmutable fuera de DRAFT (por dominio). Totales persistidos = suma de líneas (redondeo por línea).

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELED');
CREATE TYPE "Currency" AS ENUM ('MXN');

-- ── quotes (org-scoped → RLS). Totales en centavos, persistidos. ──
CREATE TABLE "quotes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "treatmentPlanId" UUID,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" "Currency" NOT NULL DEFAULT 'MXN',
  "quoteNumber" TEXT,
  "validUntil" TIMESTAMPTZ,
  "subtotalCents" BIGINT NOT NULL DEFAULT 0,
  "discountTotalCents" BIGINT NOT NULL DEFAULT 0,
  "taxTotalCents" BIGINT NOT NULL DEFAULT 0,
  "totalCents" BIGINT NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdBy" UUID NOT NULL,
  "proposedAt" TIMESTAMPTZ,
  "acceptedAt" TIMESTAMPTZ,
  "rejectedAt" TIMESTAMPTZ,
  "expiredAt" TIMESTAMPTZ,
  "canceledAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "quote_totals_nonneg" CHECK (
    "subtotalCents" >= 0 AND "discountTotalCents" >= 0 AND "taxTotalCents" >= 0 AND "totalCents" >= 0
  )
);
CREATE INDEX "quotes_patient_idx" ON "quotes"("organizationId", "patientId");
CREATE INDEX "quotes_plan_idx" ON "quotes"("treatmentPlanId");

-- ── quote_lines (org-scoped → RLS). SNAPSHOT autosuficiente; montos en centavos. ──
CREATE TABLE "quote_lines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "treatmentPlanItemId" UUID,
  "description" TEXT NOT NULL,                 -- snapshot
  "procedureType" "ProcedureType",            -- snapshot (opcional)
  "toothFdi" SMALLINT,                         -- snapshot (opcional)
  "surface" "ToothSurface",                    -- snapshot (opcional)
  "quantity" INTEGER NOT NULL,
  "unitPriceCents" BIGINT NOT NULL,
  "discountCents" BIGINT NOT NULL DEFAULT 0,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,     -- puntos base: 1600 = 16%
  "subtotalCents" BIGINT NOT NULL,             -- unitPrice * quantity
  "taxCents" BIGINT NOT NULL,                  -- round_half_up((subtotal-discount) * bps/10000)
  "totalCents" BIGINT NOT NULL,                -- (subtotal-discount) + tax
  "currency" "Currency" NOT NULL DEFAULT 'MXN',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "line_qty_positive" CHECK ("quantity" >= 1),
  CONSTRAINT "line_money_nonneg" CHECK (
    "unitPriceCents" >= 0 AND "discountCents" >= 0 AND "taxRateBps" >= 0
    AND "subtotalCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0
  ),
  CONSTRAINT "line_discount_le_subtotal" CHECK ("discountCents" <= "subtotalCents"),
  CONSTRAINT "line_fdi_valid" CHECK (
    "toothFdi" IS NULL OR (
      "toothFdi" BETWEEN 11 AND 48
      AND ("toothFdi" % 10) BETWEEN 1 AND 8
      AND ("toothFdi" / 10) BETWEEN 1 AND 4
    )
  )
);
CREATE INDEX "quote_lines_quote_idx" ON "quote_lines"("organizationId", "quoteId", "sortOrder");
CREATE INDEX "quote_lines_item_idx" ON "quote_lines"("treatmentPlanItemId");

-- ── Grants. quotes: sin DELETE (cancelar = estado). quote_lines: con DELETE
--    (en DRAFT se pueden quitar líneas; fuera de DRAFT lo impide el dominio). ──
GRANT SELECT, INSERT, UPDATE ON "quotes" TO app_user;
REVOKE DELETE ON "quotes" FROM app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "quote_lines" TO app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "quotes"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "quote_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_lines" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "quote_lines"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
