# Nelzzon — Fase 4A: Agenda base odontológica

Base operativa de citas conectada a contacto/paciente/prospecto/conversación/oportunidad. **Sin recordatorios, IA, UI ni drag/drop.**

## Resultado
- **105/105 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + 18 F3B + **20 F4A**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0008_phase4a_agenda.sql`. **0001–0007 intactas** (md5 estables). **No existe 0009.**

## Tablas (RLS+FORCE; grants SELECT/INSERT/UPDATE, sin DELETE)
- `resources` — `kind` (PROFESSIONAL/CHAIR/ROOM), `timezone` (default America/Mexico_City), `linkedUserId` (boundary admin), `active`.
- `appointments` — refs opcionales (contact/patient/conversation/opportunity/professional/chair), `startAt/endAt` (timestamptz/UTC), `status`, `source`, `rescheduledFromId`, campos de cancel/no-show/complete.
- `availability_rules` — plantilla semanal por recurso (weekday 0-6, minutos locales), interpretada en el timezone del recurso.
- `schedule_blocks` — bloqueos manuales por recurso.

## Anti-solapamiento (a nivel BD)
`CREATE EXTENSION IF NOT EXISTS btree_gist` + dos `EXCLUDE USING gist` con `tstzrange(startAt,endAt,'[)')` por `professionalResourceId` y por `chairResourceId`, parciales `WHERE status IN ('SCHEDULED','CONFIRMED')`. CANCELED/NO_SHOW/RESCHEDULED no bloquean. Probado en concurrencia (solo una de dos reservas simultáneas gana).

## Estados / transiciones
SCHEDULED→CONFIRMED→COMPLETED; ramas CANCELED, NO_SHOW, RESCHEDULED. Reagenda **no destructiva** (original→RESCHEDULED + nueva con `rescheduledFromId`). No-show solo si `startAt` pasó. Completar solo desde activa.

## Permisos (asignación final)
- owner/admin: todos.
- front_desk: appointments.view/create/reschedule/cancel/confirm/mark_no_show/complete + resources.view + schedule.block.
- clinician: appointments.view/confirm/mark_no_show/**complete** + resources.view.
- billing/accountant: appointments.view + resources.view.
- `resources.manage` y `availability.manage`: solo owner/admin.

## Eventos
`appointment.scheduled/confirmed/rescheduled/canceled/no_show/completed`. Disponibilidad/bloqueos → auditoría, no evento.

## Auditoría
`appointment.canceled`, `appointment.no_show`, `availability.set`, `schedule.blocked` (siempre), `resource.created`, y `permission.denied` durable.

## Validadores Zod
Enums + rangos (`endAt>startAt`, duración ≤ 8h, weekday 0-6, minutos 0-1440). Fail-closed.

## Disponibilidad y same-org
Disponibilidad exigida al `professionalResourceId`: dentro de `availability_rules` activas (en su timezone) y sin `schedule_blocks`. Resolver puro `resolveAvailability` (huecos libres / slots). Same-org (ajuste F): toda referencia validada por existencia bajo RLS (fail-closed, `OrgRefError`).

## Desde conversación (ajuste C)
`createAppointmentFromConversation` liga `conversationId`, `source=FROM_CONVERSATION`, registra `conversation_action_log` con el nuevo actionType `APPOINTMENT_CREATED` (extensión ADITIVA aprobada del enum de 3B) y **no** crea paciente.

## Pruebas (20)
Crear válida; fuera de disponibilidad; solapamiento (BD); consecutivas no chocan; **solapamiento concurrente**; confirmar/reagendar/cancelar(audit)/no-show(D)/completar(E); **clinician completa**; desde-conversación + action_log + sin paciente; same-org F; clinician sin create (durable); front_desk sin availability.manage pero sí schedule.block (auditado); linkedUserId no-miembro; Zod inválido; RLS A/B; resolver huecos/slots.

## Riesgos reales pendientes
- Disponibilidad se exige al profesional; sillas/salas usan exclusión pero no requieren regla de disponibilidad en 4A.
- Citas que cruzan medianoche local se rechazan (regla simple de 4A).
- `linkedUserId` validado en boundary admin; si se omite el wrapper, no se valida.
- Zona horaria: dominio en UTC, reglas en tz del recurso; presentación local es de UI (fuera de 4A).

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. La extensión `btree_gist` y la exclusión SÍ se probaron en Postgres real.

## Fuera de alcance (NO construido)
Recordatorios, WhatsApp/API real, IA de Follow, Portal, Cobros, Presupuestos, Consulta, Odontograma, Marketing, UI, drag/drop. **No se avanzó a ninguna.**
