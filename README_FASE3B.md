# Nelzzon — Fase 3B: Follow operativo (bandeja, tareas, trazabilidad, acciones inertes)

Convierte conversaciones ya registradas (3A) en una **bandeja accionable**: asignar, clasificar, priorizar, cerrar/reabrir, crear/completar/cancelar tareas y registrar acciones manuales. **Sin IA, sin automatismos, sin canal real, sin UI.**

## Resultado
- **85/85 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + **18 F3B**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0007_phase3b_follow_ops.sql`. **0001–0006 intactas** (md5 estables). **No existe 0008.**

## Tablas/columnas
- `conversations` +`assignedToUserId/assignedAt/category/priority(default NORMAL)/firstResponseAt/closedAt/closedByUserId`.
- `conversation_tasks` — RLS+FORCE. Grants `SELECT/INSERT/UPDATE` (sin DELETE: cancelar es cambio de estado).
- `conversation_action_log` — RLS+FORCE. **Append-only**: `SELECT/INSERT` (sin UPDATE/DELETE). Tercera bitácora: trazabilidad **humana** operativa, separada de `events` (reportable) y `audit_logs` (seguridad).
- `suggested_action_catalog` — global, **inerte**: `key, label, description, requiredPermission, isSensitive, status, timestamps`.

## Permisos (separados de conversations.manage)
`conversations.assign/classify/close`, `tasks.view/manage`, `suggested_actions.execute`.
- owner/admin: todos. front_desk: los 6. clinician: `tasks.view/manage` + `suggested_actions.execute` + `conversations.view`. billing/accountant: `conversations.view`.

## Operaciones (enforcement antes de escribir)
`assignConversation` (+ wrapper `assignConversationWithMembershipCheck`), `classifyConversation`, `setPriority` (usa `conversations.classify`), `closeConversation`/`reopenConversation`, `createTask`/`completeTask`/`cancelTask`, `executeSuggestedAction`. Resolver puro `resolveInbox`.

## Validación de membresía (Opción A)
La membresía de `assignedToUserId` se valida en el **límite con cliente admin/identidad** (`organization_memberships`), nunca con `app_user` (que no tiene acceso a identidad). `assignConversation` solo corre si el boundary confirmó membresía en la misma org. Replica el patrón de permisos. Denegados (`permission.denied`, `assignment.denied`) auditados **durables** en tx propia.

## Eventos
`conversation.assigned/classified/closed/reopened`, `task.created/completed`. Cambios menores (priority, cancelTask) y acciones sugeridas → NO emiten evento (solo trazabilidad/auditoría).

## Auditoría
Sensible → `audit_logs`: asignación, cierre/reapertura, acción sugerida con `isSensitive=true`, `permission.denied`/`assignment.denied` durables. Clasificación y tareas normales → evento + `conversation_action_log`, sin auditoría.

## Validadores Zod
Enums (priority/category/taskStatus) + payloads (assign/classify/priority/close/createTask/executeAction) + filtros de bandeja. Falla cerrado.

## Acciones sugeridas (inertes)
`executeSuggestedAction` valida `actionKey` en catálogo y el `requiredPermission` de la acción; si `isSensitive` audita; registra en `conversation_action_log`. **Nunca** genera efecto colateral (no mensajes, no citas, no IA).

## Pruebas (18)
Matriz de permisos; rechazo de close con **billing** (no front_desk) + `permission.denied` durable + sin cambios; billing sin `tasks.manage` no crea tarea; assign a miembro funciona + evento; assign a no-miembro y a usuario de otra org fallan (sin cambios, sin evento, `assignment.denied` durable); app_user no lee `organization_memberships`; close registra note + `closedAt`, reopen lo limpia; classify+priority; tareas crear/completar/cancelar; acciones (key inexistente rechazada, válida sin colateral, `requiredPermission` con clinician, sensible audita); `conversation_action_log` append-only; RLS A/B; resolver fail-closed + filtros/orden.

## Riesgos reales pendientes
- La garantía "no asignar a externo" vive en el **boundary** (no en la operación pura): el wrapper es el único punto de entrada; si un caller llamara `assignConversation` directo, no revalida membresía.
- "Miembro activo" = existe membresía (no hay flag de estado en `organization_memberships`); si se añade soft-delete de membresías, endurecer.
- Tres bitácoras coexisten (events/audit_logs/conversation_action_log); respetar la separación de propósito.

## Qué no pudo probarse en sandbox
- Ejecución vía Prisma (motor bloqueado) y Next. `schema.prisma` se actualizó por fidelidad de diseño pero no se pudo `prisma validate`; la fuente probada es la migración SQL + dominio + tests vía `node-postgres` con `app_user`, RLS y cliente admin para identidad.

## Fuera de alcance (NO construido)
Agenda, IA de Follow, respuestas automáticas, WhatsApp/API real, Portal, Cobros, Presupuestos, Consulta, Odontograma, Marketing, UI. **No se avanzó a ninguna.**
