# Nelzzon — Fase 6B: Cobros/Pagos base odontológicos

Registro de pagos contra presupuestos **ACCEPTED**, cálculo de saldo y trazabilidad financiera, mediante un **ledger append-only** (asientos PAYMENT/REVERSAL inmutables). **Sin** facturación, CFDI, pasarelas, portal, PDF ni conciliación.

## Resultado
- **182/182 pruebas verdes** (166 previas + **16 F6B**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0014_phase6b_payments.sql`. **0001–0014 intactas** (md5 estables). **No existe 0015.**

## Tabla (RLS+FORCE, append-only)
- `payments` — `quoteId`, `patientId` (derivado del quote), `entryKind` (PAYMENT/REVERSAL), `amountCents` BIGINT (siempre >0; el signo lo da el tipo), `method`, `status` (CONFIRMED), `reference?`, `reversesPaymentId?` (solo REVERSAL → PAYMENT), `voidReason?`, `recordedByUserId`, `paidAt`. CHECK `amountCents≥1`; CHECK de coherencia de asiento (PAYMENT sin enlace; REVERSAL con enlace). Índice único parcial `UNIQUE(reversesPaymentId) WHERE entryKind='REVERSAL'` (una reversa por pago). Grants `SELECT,INSERT` (sin UPDATE/DELETE).

## Modelo
Ledger inmutable: un PAYMENT nace CONFIRMED y no cambia; corregir = insertar un REVERSAL que apunta al original. "Revertido" se deriva. No hay tabla de pagos con estado mutable.

## Saldo
Derivado siempre (sin caché en `quotes`). Motor puro `computeBalance(quoteTotalCents, entries)` → `{paidCents, balanceCents, liquidado}`; `paidCents = Σ PAYMENT − Σ REVERSAL`; `balanceCents = total − paid`; `liquidado` cuando balance = 0.

## Reglas financieras
- Dinero en centavos MXN; nunca float.
- PAYMENT solo si quote ACCEPTED; REVERSAL permitido siempre (corrige asiento histórico).
- `amountCents ≥ 1`; un pago no excede el saldo disponible; paid ≤ total; balance ≥ 0.
- Inmutabilidad: sin UPDATE/DELETE; corrección solo por REVERSAL (total).
- Reversa: mismo monto del original, no edita el original, no doble reversa, no revertir un REVERSAL.
- `patientId` derivado del quote (coincide con `quote.patientId`).
- Same-org fail-closed: quote, payment, patient.

## Concurrencia (anti sobrepago)
`recordPayment` toma `SELECT … FOR UPDATE` sobre la fila del quote dentro de la transacción y recalcula el saldo antes de insertar. Prueba real: dos pagos simultáneos de 60000 sobre un total de 100000 → solo uno pasa, `paidCents=60000`, nunca sobrepago.

## Métodos
`PaymentMethod`: CASH, CARD, TRANSFER, CHECK, OTHER. Sin datos de tarjeta/PAN/CLABE.

## Permisos
`payment.view/record/reverse`. owner/admin/billing = todos; front_desk = view+record; accountant = view; clinician = ninguno. (front_desk NO revierte; accountant NO revierte en 6B.)

## Eventos (sin montos)
`payment.recorded` {paymentId, quoteId, patientId}; `payment.reversed` {paymentId, reversesPaymentId, quoteId, patientId}.

## Auditoría (metadata financiera, sin texto libre)
`payment.recorded/reversed/viewed` con `amountCents`, `balanceAfterCents`, `method`, `quoteId`, `paymentId`, `entryKind`. **Sin** reference ni texto libre ni datos sensibles. `permission.denied` durable. (El monto en auditoría es deliberado: trazabilidad financiera, mismo criterio aprobado en 6A.)

## Validadores Zod
`amountCents` entero ≥1; `method` enum; `reference` ≤60 con **anti-PAN** (rechaza 13–19 dígitos seguidos); `quoteId` requerido; reversa solo `paymentId`. El monto se valida además contra el saldo en servidor (bajo lock). Fail-closed.

## Operaciones
`recordPayment` (lock + anti-sobrepago + ACCEPTED), `reversePayment` (anti doble-reversa, no revertir REVERSAL), `getQuoteBalance` (derivado, auditado), `listPaymentsForQuote`/`listPaymentsForPatient` (auditados).

## Ubicación de archivos (nota)
Dominio en `src/server/domain/billing/` (`payments.ts`, `payment-schemas.ts`, `payments-calc.ts`), junto a 6A.

## Pruebas (16)
Motor de saldo (suma/resta/liquidado); pago parcial baja saldo; pago exacto liquida; OverpayError; quote no ACCEPTED rechazado; reversa sube saldo + doble reversa + revertir REVERSAL rechazados; append-only UPDATE/DELETE rechazados; **concurrencia** (sin sobrepago); enforcement (clinician/accountant no registran durable, front_desk/billing sí; front_desk no revierte); eventos sin montos; auditoría con amount+balance sin reference; patientId derivado; anti-PAN; quote otra org (OrgRefError); RLS A/B.

## Riesgos reales pendientes
- Sin idempotencia en 6B: doble captura manual posible; se corrige con REVERSAL (documentado). Idempotencia llegará con UI/pasarelas/webhooks.
- Reversa total únicamente (parcial = futuro).
- `reversePayment` también bloquea el quote (FOR UPDATE) por consistencia de lectura; no es estrictamente necesario (la reversa no causa sobrepago) y no añade riesgo.

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. Fuente probada: SQL + motor puro + dominio + concurrencia vía `node-postgres`/RLS.

## Fuera de alcance (NO construido)
Facturación, CFDI, timbrado, pasarelas (Stripe/MP/OpenPay), portal paciente, envío WhatsApp/email, PDF, conciliación bancaria, reembolsos bancarios reales, impuestos avanzados, IA financiera, UI visual, drag/drop. **No se avanzó a ninguna.**
