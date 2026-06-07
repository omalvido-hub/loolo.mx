# Auditoría: catálogo de módulos / navegación de UI (NELZZON-MODULE-CATALOG-1A)

> Fecha de auditoría: fase NELZZON-MODULE-CATALOG-1A-AUDIT (post `9f75bcd`).
> Objetivo de este documento: dejar registro del estado actual para que cualquier
> cambio futuro a una ruta dispare manualmente la revisión de los lugares listados
> aquí, evitando la desincronización que ya causó un bug real (ver sección 4).

---

## 1. Dos catálogos distintos — no mezclar

Existen **dos cosas llamadas "catálogo de módulos"** en este repo. No tienen
relación entre sí y no deben fusionarse ni reusarse una por la otra.

### (A) Catálogo de navegación de UI (sidebar / dock / biblioteca)
No existe como tal — es un patrón `available: boolean` **duplicado a mano en
tres componentes distintos** (ver sección 2). Decide qué accesos del menú,
dock inferior y biblioteca de módulos se muestran como link activo o como
"Próximamente" (`<span aria-disabled>`).

### (B) Catálogo backend de módulos (seed de BD — Fase 2B-1)
Vive en `src/server/domain/modules/catalog-data.ts`:
`ModuleDef`, `ALL_MODULES`, `MASTER_MODULES`, `TRANSVERSAL_MODULES`,
con `ModuleGroup`, `ModuleType` (`CORE | TRANSVERSAL | OPERATIONAL`) y
`FunctionalStatus` (`programmed_now | prepared_for_later | pending_definition`).

Es la "fuente de verdad del seed" para el sistema de módulos/plantillas
configurables por organización (Fase 2B). Su **único consumidor** es
`tests/phase2b1.test.ts` (verifica que el seed cubra `ALL_MODULES.length`).
**No lo consume ningún componente de navegación de UI.**

---

## 2. Catálogo de navegación de UI — los tres lugares duplicados

El patrón `available: boolean` (establecido en `73958d9`,
NELZZON-EXPERIENCE-1B-LINK-SAFETY) es correcto y está probado en producción.
El problema no es el patrón: es que **vive copiado tres veces**, cada una con
su propio arreglo de label / ícono / ruta / permiso / `available`.

| Archivo | Arreglo | Entradas | Notas |
|---|---|---|---|
| `src/components/app-sidebar.tsx` | `NAV_ITEMS` + `SETTINGS_ITEM` | 8 | Incluye Inicio, Plan de tratamiento y Configuración |
| `src/components/shell/AppDock.tsx` | `DOCK_ITEMS` | 5 | Subconjunto distinto: sin Inicio, Plan de tratamiento ni Configuración |
| `src/components/shell/ModuleCatalog.tsx` | (arreglo agrupado por categoría) | 7 | El subconjunto más completo después del sidebar |

Cada uno define su propia copia de la misma información. Si se agrega una
página nueva en `src/app/`, hay que recordar actualizar **los tres arreglos**
o alguno quedará desincronizado.

---

## 3. Estado de rutas (a la fecha de esta auditoría)

### Rutas reales (tienen `page.tsx`, deben mostrarse como link activo)
- `/dashboard`
- `/pacientes` (+ `/pacientes/[id]`, `/pacientes/[id]/consultas/[encounterId]`)
- `/agenda`
- `/presupuestos`
- `/cobros`

### Rutas próximas (sin `page.tsx` real — deben mostrarse como "Próximamente", nunca como link)
- `/consultas`
- `/tratamiento`
- `/configuracion`

---

## 4. Riesgo observado (ya materializado una vez)

Esta exacta duplicación causó el bug corregido en **NELZZON-MODULE-SAFETY-1A**
(commit `9f75bcd`): `app-sidebar.tsx` no tenía la propiedad `available` —
por lo que `/consultas`, `/tratamiento` y `/configuracion` se renderizaban
como `<Link>` clicables que llevaban a un 404 — mientras que `AppDock.tsx`
y `ModuleCatalog.tsx` ya la tenían desde la fase `73958d9`. Alguien agregó
la propiedad en dos lugares y se olvidó del tercero.

**Mientras existan tres copias independientes, este tipo de drift puede
volver a pasar** cada vez que se agregue, renombre o publique una ruta.

---

## 5. Recomendación para una fase futura (NO implementar ahora)

Cuando se decida invertir en consolidar esto, el camino de menor riesgo
sería crear un archivo de constantes compartido **aditivo**
(p. ej. `src/lib/nav-routes.ts`) que declare una sola vez label / ícono /
ruta / permiso / `available`, y migrar **uno por uno** los tres consumidores
(`app-sidebar.tsx`, `AppDock.tsx`, `ModuleCatalog.tsx`) — sin tocarlos los
tres a la vez, para no arriesgar la navegación en producción.

Esa fase **no se ha aprobado ni se ha planificado** — este documento solo
deja la base para decidirla con información completa cuando llegue el momento.

**No reusar `catalog-data.ts` / `ALL_MODULES` para esto** — pertenece a un
sistema completamente distinto (seed de BD del catálogo de módulos
configurables, Fase 2B-1) y mezclarlo requeriría un rediseño mucho más
grande y riesgoso del que justifica este problema.
