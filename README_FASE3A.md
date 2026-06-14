# Nelzzon — Fase 3A: Identidad operativa (contacto / conversación / prospecto / paciente / oportunidad)

Convierte un mensaje entrante en registros operativos **deduplicados y confiables**, sin automatizar nada (sin IA, sin respuestas, sin agenda). Promoción a paciente/oportunidad **explícita**, nunca automática.

## Resultado
- **67/67 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + **16 F3A**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0006_phase3a_identity_ops.sql`. **0001–0005 intactas** (md5 estables). **No existe 0007.**

## 1. Qué quedó programado
- Ampliación (ALTER aditivo) de `contacts`, `conversations`, `messages`, `prospects`, `patients`, `opportunities`.
- Tablas nuevas `contact_identifiers` (dedup) y `contact_merges` (registro de fusiones), ambas RLS+FORCE.
- Ingesta de mensaje entrante → contacto + conversación (OPEN) + mensaje, con dedup e idempotencia.
- Promoción explícita a prospecto/paciente y creación de oportunidad (con permiso, idempotentes).
- Fusión de contactos manual, conservadora y auditada.
- Permisos, eventos operativos (Zod) y auditoría sensible.

## 2. Qué quedó preparado para después
- `initialIntent` existe pero por defecto **UNKNOWN** (no se infiere; se fijará con Follow/IA futuro).
- `OpportunityStage` como etiqueta (sin lógica de cobros/presupuestos).
- `prospects/patients.status` y `source` definidos; gestión clínica/CRUD completa NO construida.
- Sin fuzzy dedup, sin unmerge, sin flujo de resolución manual de conflictos (solo bloqueo seguro).

## 3. Permisos finales (3A)
`contacts.view/manage/**merge**`, `conversations.view/manage`, `prospects.view/manage`, `patients.view/manage`, `opportunities.view/manage`.
- `contacts.manage` = editar/gestionar; `contacts.merge` = **fusionar (alto riesgo)**.
- Asignación `contacts.merge`: **owner ✓, admin ✓**; front_desk/clinician/billing/accountant ✗.
- Promoción a paciente exige `patients.manage`; crear oportunidad exige `opportunities.manage`.

## 4. Reglas finales de merge (v1 conservadora)
- Exige `contacts.merge`. Manual, transaccional, atómico (throw → ROLLBACK; nada parcial).
- **Bloqueo PATIENT_PRESENT:** el absorbido tiene paciente/dato clínico.
- **Bloqueo CONTACT_MERGE_CONFLICT:** sobreviviente y absorbido tienen **ambos** prospect ACTIVE, o **ambos** opportunity activa (etapa ≠ WON/LOST). No re-apunta, no duplica, no deja huérfanos.
- Permitido: si el absorbido solo tiene identificadores/conversaciones/mensajes o prospect/opportunity no activo/no conflictivo → re-apunta al sobreviviente, marca `mergedIntoId` + `ARCHIVED`, registra en `contact_merges`, emite `contact.merged`.
- **Auditoría durable** vía `performMerge` (tx propia): `contact.merge_blocked` en bloqueos y `permission.denied` en rechazo por permiso. (Auditar dentro de la tx que aborta se revierte; por eso vive en el límite transaccional.)
- `contact.merged` se emite **solo si el merge se completa**.

## 5. Deduplicación con contact_identifiers
- Fuente única de verdad (sin `dedupeKey` en `contacts`). `UNIQUE(organizationId, kind, valueNormalized)`.
- Tipos: PHONE/EMAIL/WHATSAPP/INSTAGRAM/FACEBOOK/TIKTOK/OTROS.
- Teléfono normalizado a E.164 con `libphonenumber-js` (default MX, parametrizable a futuro). Inválido → **fail-closed**: no se crea identificador telefónico.
- Match **exacto** por identificador normalizado (sin fuzzy en 3A).

## 6. Idempotencia de mensajes
- Índice parcial `UNIQUE(organizationId, channelId, externalId) WHERE externalId IS NOT NULL`.
- `externalId` es único **solo dentro de canal/proveedor**; un webhook repetido no duplica.
- `externalId` NULL no bloquea múltiples mensajes legítimos.

## 7. Riesgos pendientes
- **Merge** es el punto más delicado (combina datos de dos personas): mitigado con permiso dedicado, bloqueos conservadores, atomicidad y auditoría durable; aun así requiere vigilancia al crecer.
- Webhooks sin `externalId` → riesgo de duplicado documentado (se acepta en v1).
- Sin fuzzy dedup: duplicados con identificadores distintos no se detectan automáticamente.
- Definición de "opportunity activa" = etapa ≠ WON/LOST; revisar si en fases de cobros cambia el criterio.

## 8. Qué no pudo probarse en sandbox
- Ejecución vía **Prisma** (motor bloqueado por red) y flujos **Next**. Validado el equivalente vía `node-postgres` con el rol `app_user`, las mismas políticas RLS y las mismas funciones de dominio (RLS probada por app_user aplica también a Prisma).

## Fuera de alcance (NO construido)
Agenda, Follow IA, respuestas automáticas, Portal, Cobros, Presupuestos, Consulta clínica, Odontograma, Marketing APIs, UI/diseño. **No se avanzó a ninguna de estas.**
