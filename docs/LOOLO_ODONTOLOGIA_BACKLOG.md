# LOOLO — Backlog · Odontología

> Actualizado: 2026-06-06 · HEAD: `eded45a`  
> Orden: prioridad de negocio, dependencias técnicas, complejidad.

---

## Fase siguiente recomendada: GLOBAL-SEARCH-1A

---

## Backlog ordenado

### P1 · GLOBAL-SEARCH-1A — Buscador global superior
**Descripción:** Campo de búsqueda en la barra de navegación superior. Busca pacientes por nombre, teléfono o FDI. Redirige a `/pacientes/[id]` al seleccionar.  
**Complejidad:** Media.  
**Dependencias:** Ninguna. Backend `contacts` ya está construido.  
**Riesgo:** Bajo. Solo UI + server action de búsqueda.  
**NO hacer:** No inventar endpoint nuevo; usar `contacts.search` del dominio existente o query directa sobre `contacts`.

---

### P2 · TOOTH-HISTORY-1 — Historial de cambios por pieza/diente
**Descripción:** Panel o modal que muestra la cadena completa de supersesión de un hallazgo: desde el registro original hasta cada cambio de estado (ACTIVE → CONTROLLED → TREATED…), con fecha, quién lo hizo y el motivo.  
**Complejidad:** Media.  
**Dependencias:** Ninguna de migración. Los datos ya están en `odontogram_findings` vía `supersedesFindingId`.  
**Riesgo:** Bajo. Solo lectura, sin escritura.  
**Nota:** Actualmente "Ver consulta" en `FindingRow` es el único link disponible al origen del hallazgo.

---

### P3 · TREATMENT-HISTORY-1 — Historial de plan de tratamiento
**Descripción:** Vista de evolución del plan de tratamiento: ítems completados, fechas, estados anteriores.  
**Complejidad:** Media.  
**Dependencias:** Ninguna. Dominio `treatment.ts` ya construido.

---

### P4 · PATIENT-HISTORY-1 — Historial general del paciente
**Descripción:** Timeline del paciente: consultas, hallazgos, cambios de estado, pagos realizados.  
**Complejidad:** Alta.  
**Dependencias:** P2 y P3 recomendados primero para reutilizar patrones.

---

### P5 · FVO-UX-1 — Ficha Viva más clara
**Descripción:** Mejorar la presentación de la Ficha Viva del paciente (datos personales, alergias, medicamentos). Mejor agrupación visual, accesibilidad, campos más claros.  
**Complejidad:** Baja-media. Solo presentación.  
**Dependencias:** Ninguna. Dominio `fvo-write.ts` ya construido.

---

### P6 · ODONTO-ADVANCED-1 — Odontograma avanzado
**Descripción:** Mejoras al odontograma: colores de hallazgo más ricos, leyenda interactiva, filtro por tipo de hallazgo, zoom de pieza.  
**Complejidad:** Alta.  
**Dependencias:** Ninguna de backend.

---

### P7 · AUDIT-VIEW-1 — Auditoría visible
**Descripción:** Vista de auditoría para owners/admins: quién hizo qué, cuándo, con qué resultado.  
**Complejidad:** Media.  
**Dependencias:** Ninguna. `audit_logs` ya tiene datos.  
**Restricción NO NEGOCIABLE:** Sin texto clínico libre, sin montos sensibles, sin PAN/CLABE en `audit_logs`.

---

### P8 · PATIENT-PORTAL-1 — Portal paciente (futuro)
**Descripción:** Vista solo-lectura para el paciente: su historial, sus presupuestos, sus pagos.  
**Complejidad:** Muy alta.  
**Dependencias:** Autenticación separada para pacientes. No planificado aún.

---

## Reparaciones pendientes

### REPAIR-VOID-41 — Pieza 41 en producción
**Descripción:** La fila VOIDED de pieza 41 tiene `encounterId=null` (creada antes del fix). Solo afecta la vista de esa consulta activa específica.  
**Script listo:** `npm run repair:voided-encounter` (dry-run) → `-- --apply` con autorización.  
**Riesgo:** Bajo. Script seguro, idempotente, solo toca `encounterId` en filas VOIDED.  
**Cuándo:** En la próxima ventana de mantenimiento, con autorización explícita de Oscar.

---

## Reglas permanentes (nunca negociables)

1. **Aislamiento RLS** — Nunca bypassear. Seguridad vive en la DB.
2. **Dinero en centavos BIGINT** — Nunca float. Totales siempre del servidor.
3. **Inmutabilidad financiera y clínica** — Pagos y odontograma son append-only. Errores se corrigen con nuevas filas, nunca editando.
4. **RBAC** — Toda operación sensible verifica permiso antes de escribir.
5. **Tres bitácoras** — `events`, `audit_logs`, logs específicos. Sin texto clínico, PAN/CLABE ni montos sensibles en eventos.
6. **No reescribir dominio** — El backend está construido y probado. La UI consume `src/server/domain/`.
7. **Migraciones nuevas, nunca editar las 14 existentes (0001–0014)**.
8. **Tests verdes** — Cualquier cambio que toque backend debe mantener o incrementar el total de pruebas.

---

## Lo que NO debe hacerse (sin aprobación explícita de Oscar)

- Modificar migraciones existentes (0001–0018).
- Cambiar el schema Prisma sin nueva migración aprobada.
- Usar `--apply` en scripts de reparación sin autorización.
- Hacer deploy al VPS sin autorización.
- Correr `npm run seed` (crea orgs/usuarios, puede duplicar).
- Subir `ecosystem.config.cjs` al repositorio (contiene credenciales).
- Exponer `note`, `lifecycleReason`, `recordedByUserId`, `createdBy` en DTOs de UI.
- Confiar en montos del cliente; siempre recalcular en servidor.
