# Nelzzon — Fase 5C: Plan de tratamiento base odontológico

Plan de tratamiento por paciente, nacido (opcionalmente) en una consulta, con ítems de procedimiento ligados a pieza/superficie y a hallazgos del odontograma. Modelo **mutable por estado** con transiciones controladas. **Sin presupuestos, cobros, portal ni dinero.**

## Resultado
- **147/147 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + 18 F3B + 20 F4A + 14 F5A + 14 F5B + **14 F5C**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0011_phase5c_treatment_plan.sql`. **0001–0010 intactas** (md5 estables). **No existe 0012.**

## Tablas (RLS+FORCE; grants SELECT/INSERT/UPDATE, sin DELETE)
- `treatment_plans` — `patientId` obligatorio, `encounterId?`, `professionalResourceId?`, `status`, `title?`, `notes?`, sellos por estado. **Índice único parcial** `UNIQUE(organizationId,patientId) WHERE status='ACTIVE'`: a lo sumo un plan ACTIVE por paciente.
- `treatment_plan_items` — `planId`, `toothFdi?` (CHECK FDI 11–48), `surface?`, `procedureType`, `status`, `priority`, `sequence` (CHECK ≥0), `note?`, `professionalResourceId?`, `linkedFindingId?`.

## Modelo
Mutable por estado con **matrices de transición explícitas**, puras y testeables; estados terminales inmutables por dominio. Historial de cambios vía `audit_logs` (sin tabla de historial dedicada en 5C). Sin catálogo de procedimientos y sin dinero (precios/costos/pagos = fases futuras).

## Enums
`TreatmentPlanStatus` (DRAFT/PROPOSED/ACCEPTED/ACTIVE/COMPLETED/REJECTED/CANCELED), `TreatmentItemStatus` (PROPOSED/ACCEPTED/IN_PROGRESS/COMPLETED/REJECTED/CANCELED), `TreatmentPriority` (URGENT/HIGH/NORMAL/LOW), `ProcedureType` (12). Ampliables aditivos.

## Transiciones
- Plan: DRAFT→PROPOSED/CANCELED; PROPOSED→ACCEPTED/REJECTED/CANCELED; ACCEPTED→ACTIVE/CANCELED; ACTIVE→COMPLETED/CANCELED. Terminales: COMPLETED/REJECTED/CANCELED.
- Ítem: PROPOSED→ACCEPTED/REJECTED/CANCELED; ACCEPTED→IN_PROGRESS/CANCELED; IN_PROGRESS→COMPLETED/CANCELED. Terminales: COMPLETED/REJECTED/CANCELED.
- Completar plan exige cero ítems vivos (PROPOSED/ACCEPTED/IN_PROGRESS).
- La aceptación/rechazo la registra el staff (sin portal).

## Permisos (dedicados)
`treatment.view/create/edit/propose/accept/complete/cancel`. owner/admin/clinician = todos; front_desk/billing/accountant = **ninguno**.

## Eventos (estructurados, sin texto)
`treatment.plan_created` `{planId,patientId}`, `treatment.plan_status_changed` `{planId,status}`, `treatment.item_added` `{itemId,planId,procedureType,toothFdi?}`, `treatment.item_status_changed` `{itemId,status}`. Nunca incluyen `title/notes/note`.

## Auditoría (sin texto clínico)
`audit_logs`: creación de plan/ítem, cada cambio de estado, **lectura `treatment.viewed`** (getPlan/listPlansForPatient), `permission.denied` durable. Metadata solo IDs/estado/actor.

## Validadores Zod
Enums; FDI 11–48 (reutiliza validador 5B); `title`≤200, `notes`≤2000, `note`≤500; `sequence`≥0; `patientId` requerido. Transiciones validadas en dominio.

## Operaciones
`createPlan`, `addItem`, `updateItem` (solo no-terminal), `setPlanStatus`/`setItemStatus` (transición + permiso por estado destino + auditoría), `getPlan`/`listPlansForPatient`. Same-org fail-closed: paciente, encounter (mismo paciente), professional, linkedFinding, planId. Coherencia `linkedFindingId`↔pieza: mismo paciente, `toothFdi` coincide, surface coincide si el ítem la trae.

## Ubicación de archivos (nota)
Dominio en `src/server/domain/clinical/` (`treatment.ts`, `treatment-schemas.ts`), junto a 5A/5B. No se reubicó.

## Pruebas (14)
Crear válido; paciente otra org; encounter de otro paciente; coherencia linkedFinding↔pieza; transición de plan inválida; flujo completo; transición de ítem inválida + editar terminal; transiciones puras; un solo ACTIVE por paciente; completar con ítems vivos; front_desk no crea (durable) + billing no ve; eventos sin texto; lectura auditada sin contenido; RLS A/B.

## Riesgos reales pendientes
- Modelo mutable (distinto a 5A/5B): mitigado con transiciones controladas + auditoría; terminalidad por dominio.
- "Un ACTIVE por paciente" robusto bajo concurrencia gracias al índice único parcial.
- Datos de salud sin cifrado de columna (igual que 5A/5B).
- Volumen de auditoría por lecturas.

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. Fuente probada: SQL + dominio vía `node-postgres`/RLS.

## Fuera de alcance (NO construido)
Presupuestos, cobros, facturación, portal paciente, documentos, consentimientos, recetas avanzadas, imágenes/radiografías, IA clínica, UI visual, drag/drop, inventario, marketing. **No se avanzó a ninguna.**
