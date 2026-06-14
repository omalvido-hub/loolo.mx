# Nelzzon — Fase 6A: Presupuestos base odontológicos

Presupuestos/cotizaciones por paciente, derivados del plan de tratamiento, con líneas autosuficientes (snapshot), totales calculados/persistidos en el servidor, moneda MXN y ciclo de vida con aceptación/rechazo por staff. **Primera fase con dinero.** Sin cobros, pagos, facturación, portal ni PDF.

## Resultado
- **166/166 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + 18 F3B + 20 F4A + 14 F5A + 14 F5B + 14 F5C + **19 F6A**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migraciones: `0012_phase6a_quotes.sql` + `0013_phase6a_quote_lines_delete_rls.sql`. **0001–0013 intactas** (md5 estables). **No existe 0014.**

## Tablas (RLS+FORCE)
- `quotes` — `patientId` obligatorio, `treatmentPlanId?`, `status`, `currency` (enum MXN), `validUntil?`, totales persistidos en **centavos** (`subtotalCents/discountTotalCents/taxTotalCents/totalCents`, BIGINT), sellos por estado. CHECK totales ≥0. Grants `SELECT/INSERT/UPDATE` (sin DELETE).
- `quote_lines` — **snapshot autosuficiente**: `description`, `procedureType?`, `toothFdi?`, `surface?`, `quantity`, `unitPriceCents`, `discountCents`, `taxRateBps`, `subtotalCents`, `taxCents`, `totalCents`, `currency`. CHECKs: qty≥1, montos≥0, `discountCents ≤ subtotalCents`, FDI válido. Grants `SELECT/INSERT/UPDATE/DELETE`.

## Dinero (exactitud)
Enteros en **centavos MXN** (sin float). Motor puro `computeLine`/`computeTotals`/`divRoundHalfUp`: **redondeo half-up por línea**, encabezado = **suma de líneas**, recalculado siempre en servidor (nunca se confía en montos del cliente). Sin descuento global. `taxCents = round_half_up((subtotal − discount) · bps / 10000)`.

## Snapshot histórico
Cada línea congela los datos necesarios al crearse. Si se liga `treatmentPlanItemId`, se copia snapshot (procedureType/toothFdi/surface) del ítem, pero el precio se captura en la línea. Cambiar el plan/ítem después **no** altera la línea (probado).

## Estados / inmutabilidad
DRAFT → PROPOSED → ACCEPTED; ramas REJECTED/EXPIRED/CANCELED (matriz explícita; EXPIRED manual). Editable solo en **DRAFT**. Al salir de DRAFT, add/update/remove de líneas → `FrozenError`.

## RLS reforzada de DELETE (0013)
La policy `ALL` de `quote_lines` se sustituyó por policies **por comando**: SELECT/INSERT/UPDATE conservan el aislamiento por `organizationId`; **DELETE** exige además que el quote padre esté en la misma org y en `status='DRAFT'`. Así la inmutabilidad del dinero vive en la BD, no solo en el dominio: un DELETE crudo de `app_user` sobre una línea de quote no-DRAFT no borra nada (probado).

## Permisos comerciales (nuevos)
`quote.view/create/edit/propose/accept/cancel`. owner/admin/billing = todos; front_desk = view/create/edit/propose; accountant = view; clinician = view. El dinero lo ven roles administrativos sin acceder a contenido clínico libre.

## Eventos (sin montos ni texto)
`quote.created`{quoteId,patientId}, `quote.proposed/accepted/rejected/expired/canceled`{quoteId}.

## Auditoría
`audit_logs`: creación, edición de línea en DRAFT, cada transición, **lectura `quote.viewed`**, `permission.denied` durable. Metadata con `totalCents`+`status` (trazabilidad financiera) y **sin** texto libre (notes/description).

## Validadores Zod
Enums; centavos enteros ≥0; qty≥1; `taxRateBps` 0..100000; `description` 1..200; FDI 11–48; totales nunca del cliente. Fail-closed.

## Operaciones
`createQuote`, `addLine`, `updateLine`, `removeLine` (solo DRAFT; recalculan), `setQuoteStatus` (transición+permiso por destino+auditoría), `getQuote`/`listQuotesForPatient` (auditadas). Same-org fail-closed: paciente/plan/ítem/quote/line. Coherencia línea↔ítem del plan.

## Ubicación de archivos (nota)
Dominio en `src/server/domain/billing/` (`quotes.ts`, `schemas.ts`, `calc.ts`).

## Pruebas (19)
Motor de cálculo (redondeo half-up, subtotal/descuento/impuesto/total, descuento>subtotal lanza, totales=suma); crear+persistir totales; paciente otra org; snapshot intacto tras editar ítem; ítem de otro paciente (CoherenceError); inmutabilidad fuera de DRAFT; transición inválida/válida; enforcement (clinician/accountant no crean, front_desk/billing sí; accountant ve); eventos sin montos; lectura auditada sin texto; RLS A/B; **refuerzo DELETE 0013**: removeLine DRAFT + audita sin texto, DELETE crudo en PROPOSED no borra, DELETE crudo en DRAFT sí, SELECT/INSERT/UPDATE intactos.

## Riesgos reales pendientes
- Redondeo fijado por línea half-up (congelado en motor + pruebas; cambiarlo descuadraría históricos).
- Impuestos = una tasa por línea (IVA típico); regímenes/retenciones/IEPS/CFDI = facturación futura.
- Datos comerciales sensibles: montos fuera de eventos; en auditoría con metadata mínima.

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. Fuente probada: SQL + motor puro + dominio vía `node-postgres`/RLS.

## Fuera de alcance (NO construido)
Cobros, pagos, facturación, CFDI, portal paciente, envío WhatsApp/email, pasarelas, PDF, firma/consentimiento, IA financiera, UI visual, drag/drop. **No se avanzó a ninguna.**
