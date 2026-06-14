# Nelzzon — Fase 5A: Consulta clínica base odontológica

Base del expediente/consulta dental ligada a cita, paciente y profesional. Datos de **salud**: acceso estrecho, notas inmutables, contenido fuera de eventos. **Sin odontograma, plan de tratamiento, recetas avanzadas, documentos ni IA.**

## Resultado
- **119/119 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + 18 F3B + 20 F4A + **14 F5A**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0009_phase5a_clinical.sql`. **0001–0008 intactas** (md5 estables). **No existe 0010.**

## Tablas (RLS+FORCE)
- `clinical_encounters` — `patientId` **obligatorio**; `appointmentId?`, `professionalResourceId?`, `status`, `chiefComplaint`, `preliminaryDiagnosis?`, `observations?`, `indications?`, sellos de finalize/cancel. Grants `SELECT/INSERT/UPDATE` (sin DELETE). **No** guarda `contactId` (se deriva de `patients.contactId`).
- `clinical_notes` — **append-only**: grants `SELECT/INSERT` (UPDATE/DELETE revocados a `app_user`). Notas inmutables; corregir/ampliar = nota nueva o addendum (fase futura).

## Estados / inmutabilidad
DRAFT → IN_PROGRESS → FINALIZED; rama CANCELED. Edición de contenido y alta de notas solo en DRAFT/IN_PROGRESS. **FINALIZED inmutable** (no edita ni acepta notas). Cancelada no se finaliza; finalizada no se cancela.

## Permisos (acceso estrecho)
`clinical.view/create/edit/finalize/cancel`, `clinical_notes.add`.
- owner / admin / clinician: todos.
- front_desk / billing / accountant: **ninguno** (sin motivo, notas, diagnóstico, observaciones ni indicaciones).

## Eventos (sin contenido)
`clinical.encounter_created` `{encounterId, patientId}`, `clinical.encounter_finalized` `{encounterId}`, `clinical.encounter_canceled` `{encounterId}`. Nunca incluyen texto clínico.

## Auditoría (sin contenido)
`audit_logs`: created/started/edited/note_added/finalized/canceled, **lectura `clinical.viewed`** (en `getEncounter` y `listEncountersForPatient`), y `permission.denied` durable. Metadata solo IDs/actor/accessType; sin texto clínico.

## Validadores Zod
`EncounterStatus`; longitudes (chiefComplaint 1..500, body 1..5000, diagnóstico/observaciones/indicaciones ≤2000); `patientId` requerido. Fail-closed.

## Operaciones
`createEncounter`, `startEncounter`, `updateEncounter`, `addClinicalNote`, `finalizeEncounter`, `cancelEncounter`, `getEncounter`, `listEncountersForPatient`. Same-org por existencia bajo RLS (fail-closed): paciente obligatorio, profesional opcional misma org (E), y coherencia appointment misma org + mismo paciente (D).

## Pruebas (14)
Crear con paciente válido; Zod motivo vacío; paciente/profesional de otra org → OrgRefError; coherencia cita↔paciente (D); editar solo DRAFT/IN_PROGRESS y FINALIZED inmutable; cancelar bloquea finalizar; notas append-only (UPDATE/DELETE rechazados por grants); front_desk no crea (durable, sin cambios); front_desk/billing no ven; lectura auditada sin contenido; eventos sin contenido; RLS A/B.

## Riesgos reales pendientes
- Datos de salud sin cifrado de columna (fuera de alcance 5A; riesgo aceptado para el piloto).
- FINALIZED inmutable vs. necesidad de addendum formal (queda para fase futura).
- Auditar lecturas eleva el volumen de `audit_logs` (a vigilar).

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. Fuente probada: SQL + dominio vía `node-postgres` con `app_user`/RLS.

## Fuera de alcance (NO construido)
Odontograma, plan de tratamiento, presupuestos, cobros, recetas avanzadas, documentos/consentimientos, portal paciente, IA clínica, recordatorios, WhatsApp/API real, UI. **No se avanzó a ninguna.**
