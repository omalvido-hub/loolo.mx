-- LOOLO — Migración 0014_phase6b_payments
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001-0013.
-- Cobros/Pagos base. LEDGER append-only (PAYMENT/REVERSAL) inmutable. Centavos MXN, sin float.
-- Saldo derivado (sin caché). PAYMENT solo si quote ACCEPTED. Reversa total, una por pago.

CREATE TYPE "PaymentEntryKind" AS ENUM ('PAYMENT', 'REVERSAL');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('CONFIRMED');  -- ledger inmutable: nace CONFIRMED; "revertido" se deriva

-- ── payments (org-scoped → RLS, APPEND-ONLY). amountCents siempre > 0; el signo lo da entryKind. ──
CREATE TABLE "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "patientId" UUID NOT NULL,                  -- derivado del quote (no del cliente)
  "entryKind" "PaymentEntryKind" NOT NULL,
  "amountCents" BIGINT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
  "reference" TEXT,
  "reversesPaymentId" UUID,                    -- solo en REVERSAL → PAYMENT original
  "voidReason" TEXT,
  "recordedByUserId" UUID NOT NULL,
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payment_amount_positive" CHECK ("amountCents" >= 1),
  -- coherencia de asiento: PAYMENT no apunta a otro; REVERSAL debe apuntar a uno.
  CONSTRAINT "payment_reversal_link" CHECK (
    ("entryKind" = 'PAYMENT'  AND "reversesPaymentId" IS NULL) OR
    ("entryKind" = 'REVERSAL' AND "reversesPaymentId" IS NOT NULL)
  )
);
CREATE INDEX "payments_quote_idx" ON "payments"("organizationId", "quoteId");
CREATE INDEX "payments_patient_idx" ON "payments"("organizationId", "patientId");
-- Ajuste D: a lo sumo UN REVERSAL por PAYMENT original (declarativo, anti doble-reversa concurrente).
CREATE UNIQUE INDEX "payments_one_reversal" ON "payments"("reversesPaymentId") WHERE "entryKind" = 'REVERSAL';

-- ── Grants APPEND-ONLY (ajuste A): sin UPDATE, sin DELETE ──
GRANT SELECT, INSERT ON "payments" TO app_user;
REVOKE UPDATE, DELETE ON "payments" FROM app_user;

-- ── RLS (tenant isolation, patrón probado) ──
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
