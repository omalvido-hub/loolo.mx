# Nelzzon — Estado validado · Odontología

> Última actualización: 2026-06-06  
> Commit HEAD: `127aa1c`  
> Producción principal: https://nelzzon.com · HTTP 200 · PM2 online  
> Dominio anterior https://loolo.mx vivo solo como respaldo temporal (ver [docs/NELZZON_PRODUCTION_BASELINE.md](./NELZZON_PRODUCTION_BASELINE.md))

---

## Producción validada

| Punto | Estado |
|---|---|
| HEAD en VPS | `127aa1c` ✅ |
| PM2 | online · 0 unstable restarts |
| HTTP 200 público (principal) | https://nelzzon.com/login ✅ |
| HTTP 200 público (respaldo temporal) | https://loolo.mx/login ✅ |
| HTTP 200 local VPS | http://127.0.0.1:3000/login ✅ |
| Error log | Sin actividad desde último arranque ✅ |

---

## Módulos de UI completados

### UI-1 — Esqueleto + login
Login, layout con menú lateral, conexión con backend.

### UI-2 — Pacientes + agenda
Lista de pacientes, ficha, agenda básica.

### UI-3 — Consulta clínica solo lectura
Vista de encuentros, notas clínicas. `encounters.ts` sin tocar.

### UI-4 — Odontograma dental solo lectura
Odontograma FDI 11–48, vista Cuadros y Dientes. `odontogram.ts` sin tocar.

### UI-5 — Plan de tratamiento solo lectura
Vista de ítems de tratamiento. `treatment.ts` sin tocar.

### UI-6 / UI-6A — Billing completo
Presupuestos (DRAFT→PROPOSED→ACCEPTED), cobros, reversos, páginas `/presupuestos` y `/cobros`.

### UI-7A — Ficha Viva del paciente (FVO)
6 secciones editables (admin): datos personales, alergias, medicamentos, antecedentes, contactos de emergencia, tutores. Permisos canX. Dos pasos para revocar consentimiento.

### UI-7B — Odontograma interactivo
Vista Cuadros y Dientes interactivas. Registro de hallazgos desde consulta activa. Selección visual conectada al formulario.

---

## Lifecycle de hallazgos (Lifecycle-1A + 1B)

- Migración `0018` aplicada en producción: columna `lifecycleStatus`, `supersedesFindingId`, `lifecycleReason`.
- Dominio: `voidFinding`, `treatFinding`, `resolveFinding` — append-only, inmutables.
- RBAC: permiso `odontogram.void` (owner/admin/clinician).
- UI: botones Tratar / Resuelto / Controlado / Obs. / Anular en:
  - `EncounterFindings.tsx` (consulta activa, panel de pieza seleccionada)
  - `ToothDetailPanel.tsx` (ficha maestra, panel de pieza seleccionada)
- Regla activa: el botón cuya acción representa el estado actual se oculta (no duplicidad badge+botón).

---

## Renderizado odontograma

### Vista Cuadros (`ToothGlyph`)
- 5 zonas rectangulares (V/M/O/D/L).
- Hallazgo global (sin superficie): borde coloreado del `<rect>` con prioridad `globalBorderFinding > isSelected`.
- Selección: `ring-2 ring-blue-400` del `div`.

### Vista Dientes (`ToothAnatomyGlyph`)
- Silueta orgánica (corona + raíz) con clipPath.
- Mismo mecanismo: contorno de corona coloreado cuando hay hallazgo global + zona central ocupada.
- `strokeWidth=3` para el contorno orgánico.

### Lógica compartida (`tooth-utils.ts`)
- `pickGlobalBorderFinding(findings)` — prioridad: CROWN > ENDODONTICS > IMPLANT > MOBILITY > FRACTURE > OTHER.
- Testeable con vitest (sin JSX).

---

## Vistas del odontograma

| Vista | Componente | Estado |
|---|---|---|
| Master (ficha paciente) | `OdontogramMasterView` → `ToothGlyph` | ✅ |
| Dientes (ficha paciente) | `ToothAnatomyGlyph` | ✅ |
| Encuentro activo | `EncounterFindings` → `OdontogramChartInteractive` | ✅ |
| Detalle de pieza | `ToothDetailPanel` | ✅ |
| Diagrama expandido | `ToothDiagram` | ✅ |

---

## Datos de prueba

- **Demo org:** Clínica Demo LOOLO
- **Paciente demo:** Ana García López
- **Script idempotente:** `npm run seed:demo` (DELETE+INSERT, no duplica)

---

## Scripts disponibles

| Script | Propósito |
|---|---|
| `npm test` | Vitest (850/850 pruebas verdes) |
| `npm run build` | Build de producción Next.js |
| `npm run sync:rbac` | Sincronizar catálogo RBAC sin tocar datos |
| `npm run repair:voided-encounter` | Dry-run: busca VOIDED con encounterId=null |
| `npm run repair:voided-encounter -- --apply` | APPLY: repara encounterId (solo con autorización) |
| `npm run seed:demo` | Seed demo idempotente |

---

## Pruebas

- **Total:** 850/850
- **Archivos:** 33 test files
- **DB real:** PostgreSQL 16 local (no mocks)
- Suite: Vitest · `npm test`

---

## Deuda técnica conocida

| Item | Descripción | Riesgo |
|---|---|---|
| Pieza 41 · encounterId=null | Fila VOIDED creada antes del fix; solo visible en vista de consulta activa de esa sesión | Bajo · script de reparación ya listo |
| Botones lifecycle en `FindingRow` | `FindingRow.tsx` es solo presentacional, sin botones — nada que corregir | — |
