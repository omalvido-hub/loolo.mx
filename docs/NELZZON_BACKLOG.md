# Nelzzon — Backlog de continuidad

> Última actualización: 2026-06-07
> Punto de partida: commit `a84e107` (HEAD validado en producción y origin/main)
> Ver `docs/NELZZON_STATE.md` para el detalle de qué existe hoy y qué NO.

Este backlog ordena lo que sigue, sin asumir autorización de ninguna de estas
fases — cada una requiere el mismo proceso de siempre: plan corto → OK de
Oscar → implementar → validar (`tsc` / `npm test` / `npm run build`) → commit
→ push solo si se pide explícitamente.

---

## A. Continuar el Design Studio (Personalizar)

Las fases 0A–0F dejaron el panel honesto, compacto y navegable, pero **sin
ningún tipo de motor real**. Lo que sigue, en orden recomendado por el propio
wireframe (`docs/NELZZON_PERSONALIZAR_WIREFRAME.md`, sección "Fase siguiente
recomendada"):

1. **PERSONALIZAR-1A — Wiring de vista previa ampliada (sin guardado)**
   Conectar más controles "Vista previa local" honestos (los que ya tienen
   badge `preview`) para que cambien algo real *dentro de la sesión actual*
   (p. ej. aplicar el estilo elegido al resto de la UI mientras el panel está
   abierto, no solo dentro del panel). Sigue sin persistencia — es
   "probar antes de comprar", no "guardar".
   Riesgo: tentación de empezar a guardar de verdad — frenar ahí y pedir
   aprobación antes de tocar backend/DB.

2. **PERSONALIZAR-1B — Motor de persistencia (requiere diseño de esquema)**
   Implica: nueva tabla (migración nueva y aditiva, aprobación explícita),
   server actions, RBAC nuevo (`personalization.*`), eventos versionados sin
   datos sensibles. Es un salto grande — **no autónomo, requiere aprobación
   de alcance completo antes de empezar**.

---

## B. Hallazgos colaterales pendientes

3. **SIDEBAR-LINK-SAFETY-1**
   `app-sidebar.tsx` enlaza a `/consultas`, `/tratamiento`, `/configuracion`
   — rutas sin página real (mismo patrón que se corrigió en `AppDock` y
   `ModuleCatalog` en `NELZZON-EXPERIENCE-1B-LINK-SAFETY`, commit `73958d9`).
   Aplicar el mismo tratamiento honesto ("Próximamente"/"En preparación") al
   sidebar. Acotado, bajo riesgo, ya hay precedente de cómo hacerlo.

---

## C. Trabajo funcional pendiente (de sesiones previas, sigue vigente)

Tomado de `docs/NEXT_CHAT_STARTER.md` / `docs/NELZZON_ODONTOLOGIA_BACKLOG.md` —
sigue siendo válido, no se tocó nada de esto en la serie 0A–0F:

4. **GLOBAL-SEARCH-1A**
   Buscador global en la barra de navegación superior — busca pacientes por
   nombre/teléfono/FDI y redirige a `/pacientes/[id]`. Reutilizar dominio
   existente en `src/server/domain/` — no inventar endpoints nuevos.

5. ~~**TOOTH-HISTORY-1**~~ — **Ya cerrado.** Confirmado en `git log`:
   `d334155` (feat: add read-only tooth history panel), `34952e5` (fix: keep
   tooth history fully read only), `d55ead4` (feat: add read-only patient
   timeline). No retomar — evitar duplicar trabajo.

6. **REPAIR-VOID-41**
   Reparar `encounterId=null` en la fila VOIDED de pieza 41 en producción.
   Script ya listo: `npm run repair:voided-encounter` (dry-run primero,
   `--apply` solo con autorización explícita en el VPS).

7. **FVO-UX-1**
   Mejorar presentación de la Ficha Viva del paciente — agrupación visual,
   campos más claros, accesibilidad. Solo presentación, `fvo-write.ts` intacto.

---

## D. Reglas que aplican a TODO lo de arriba (no negociables)

- NO modificar migraciones 0001–0018. Cambios de esquema = migración nueva +
  aprobación explícita.
- NO tocar payments, quotes, RLS, audit sin aprobación explícita.
- NO push/deploy/VPS sin autorización explícita de Oscar.
- NO correr `npm run seed` (duplica orgs/usuarios). Usar `seed:demo`.
- NO subir `ecosystem.config.cjs` (credenciales reales del VPS).
- NO exponer `note`, `lifecycleReason`, `recordedByUserId` en DTOs de UI.
- Dinero siempre en centavos BIGINT. Totales siempre del servidor.
- Después de cualquier cambio: `npx tsc --noEmit` + `npm test` (850/850) +
  `npm run build`.
- NO tocar `.env`, `.env.local`, ni `.env.local.disabled-20260607-051302`.

---

## E. Cómo priorizar (sugerencia, decide Oscar)

- Si el objetivo es **producto/visión**: seguir con A.1 (PERSONALIZAR-1A).
- Si el objetivo es **higiene/consistencia**: B.3 (sidebar link safety) es
  rápido y de bajo riesgo.
- Si el objetivo es **avanzar funcionalidad central**: C.4 (GLOBAL-SEARCH-1A)
  es la pieza pendiente más visible para el usuario final.
