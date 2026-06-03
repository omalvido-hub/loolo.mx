# LOOLO — Fase 5B: Odontograma base odontológico

Registro estructurado del estado dental como **hallazgos clínicos append-only ligados a consulta** (5A); el "odontograma actual" se **deriva** con un resolver. **Sin plan de tratamiento, presupuestos, cobros, imágenes ni UI visual.**

## Resultado
- **133/133 pruebas verdes** (10 F1 + 13 F2A + 17 F2B-1 + 11 F2B-2 + 16 F3A + 18 F3B + 20 F4A + 14 F5A + **14 F5B**).
- Typecheck dominio+seeds+tests: limpio (exit 0).
- Migración: `0010_phase5b_odontogram.sql`. **0001–0009 intactas** (md5 estables). **No existe 0011.**

## Tabla (RLS+FORCE, APPEND-ONLY)
`odontogram_findings` — grants `SELECT/INSERT` (UPDATE/DELETE revocados a `app_user`). Cols: `patientId`, `encounterId`, `toothFdi`, `surface?`, `findingType`, `toothStatus`, `note?`, `supersedesFindingId?`, `recordedByUserId`, `createdAt`. `CHECK fdi_valid` (FDI permanente 11–48: cuadrante 1–4, posición 1–8). Sin `tooth_catalog` (validación FDI en código/Zod).

## Modelo
Append-only + resolver. Corrección = **supersesión encadenada** (`supersedesFindingId`): el hallazgo nuevo reemplaza al previo; el previo queda histórico (nunca UPDATE/DELETE). No existe odontograma mutable por paciente.

## Numeración / superficies / catálogos
FDI permanentes 11–48 (deciduos = futuro aditivo). `ToothSurface`: MESIAL/DISTAL/OCCLUSAL/VESTIBULAR/LINGUAL/INCISAL. `OdontogramFindingType` (10) y `ToothStatus` (6), ampliables aditivos.

## Matriz surface↔findingType (conservadora)
- Exigen surface: CARIES, RESTORATION, SEALANT.
- Prohíben surface (nivel pieza): MISSING, IMPLANT, CROWN, ENDODONTICS, MOBILITY.
- Opcional: FRACTURE, OTHER.

## Permisos (dedicados)
`odontogram.view`, `odontogram.record`. owner/admin/clinician = ambos; front_desk/billing/accountant = **ninguno**.

## Eventos (estructurados, sin note)
`odontogram.finding_recorded` `{findingId, patientId, encounterId, toothFdi, findingType}`, `odontogram.finding_superseded` `{findingId, supersedesFindingId, toothFdi}`. Nunca incluyen `note` ni texto libre.

## Auditoría (sin contenido)
`audit_logs`: finding_recorded/superseded, **lectura `odontogram.viewed`** (en `getOdontogram` y `listFindingsForEncounter`), y `permission.denied` durable. Metadata solo IDs/pieza/actor.

## Validadores Zod
FDI válido; enums; `note` ≤500; matriz surface↔findingType; `patientId`/`encounterId` requeridos. Fail-closed.

## Operaciones
`recordFinding`, `supersedeFinding`, `getOdontogram`, `listFindingsForEncounter` + resolver puro `resolveOdontogram`/`groupByTooth`. Same-org fail-closed: paciente y consulta misma org + consulta del mismo paciente; registro solo en consulta **DRAFT/IN_PROGRESS**; supersesión sobre la misma pieza/superficie.

## Ubicación de archivos (nota)
El dominio de 5B vive en `src/server/domain/clinical/` (`odontogram.ts`, `odontogram-schemas.ts`, `odontogram-resolver.ts`), junto a la consulta de 5A con la que se acopla. No se reubicó a `odontogram/` para no alterar imports/estructura ya probada.

## Pruebas (14)
Registrar válido; FDI inválido; paciente otra org; encounter de otro paciente; surface↔type; no registrar en FINALIZED/CANCELED; append-only (UPDATE/DELETE rechazados); supersede + resolver vigente; supersede en pieza distinta rechazado; resolver puro colapsa cadena; lectura auditada sin note; eventos sin note; front_desk no registra (durable) + billing no ve; RLS A/B.

## Riesgos reales pendientes
- Resolver append-only escala con volumen (índices por paciente/pieza; aceptable piloto).
- Datos de salud sin cifrado de columna (igual que 5A).
- Volumen de auditoría por lecturas.
- Numeración solo permanentes (deciduos = ampliación futura).

## Qué no pudo probarse en sandbox
- Prisma/Next (motor bloqueado). `schema.prisma` actualizado por fidelidad pero sin `prisma validate`. Fuente probada: SQL + dominio vía `node-postgres` con `app_user`/RLS.

## Fuera de alcance (NO construido)
Plan de tratamiento, presupuestos, cobros, documentos, consentimientos, portal paciente, IA clínica, imágenes/radiografías, periodontograma, UI visual, drag/drop. **No se avanzó a ninguna.**
