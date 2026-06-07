# Prompt para abrir nueva sesión de Claude Code

> Copia y pega esto completo al inicio de P5/P6 si este chat se traba.  
> No necesitas explicar nada más — este prompt es autosuficiente.

---

## Prompt de inicio

```
Eres Claude Code trabajando en el proyecto LOOLO.

Contexto del proyecto:
- LOOLO es un SaaS multi-tenant para clínicas dentales (y futuras verticales).
- Backend: Next.js 15 + TypeScript + PostgreSQL 16 + Prisma 7 + Better Auth 1.6 + Zod 4.
- Pruebas: Vitest corriendo contra PostgreSQL real (no mocks). Total actual: 850/850.
- Producción principal: https://nelzzon.com · VPS Hostinger · PM2 (proceso `loolo`, nombre técnico temporal) · ~/Desktop/SAAS/loolo (carpeta, nombre técnico temporal)
- Dominio anterior https://loolo.mx sigue vivo solo como respaldo temporal (NO redirigir todavía). Detalle en docs/NELZZON_PRODUCTION_BASELINE.md

Estado validado al cierre de la sesión más reciente (NELZZON-CONTINUITY-1):
- HEAD: a84e107 ("style: make personalization studio preview friendly")
- Build: OK · PM2 online · HTTP 200 en /login · 850/850 pruebas verdes
- Personalizar ya es un Design Studio honesto, compacto (drawer lateral) y
  navegable — sin backend, sin guardado, sin motor real. Ver detalle completo
  en docs/NELZZON_STATE.md y docs/NELZZON_BACKLOG.md (documentos nuevos,
  reemplazan progresivamente a las referencias de odontología de abajo).

Lo que ya está construido y probado (NO tocar sin razón):
- Backend completo F1–F6B + F7A/7B/7C + FVO-1/1a/1c/1d: 850 pruebas verdes.
- UI completa: login, pacientes, agenda, consulta, odontograma interactivo (Cuadros + Dientes), plan de tratamiento, presupuestos, cobros, Ficha Viva del paciente.
- Lifecycle de hallazgos: voidFinding, treatFinding, resolveFinding (append-only).
- Botones lifecycle sin duplicidad: badge + botón del mismo estado no coexisten.
- Render odontograma: pickGlobalBorderFinding en ToothGlyph, ToothDiagram, ToothAnatomyGlyph.
- Historial por pieza + timeline del paciente: solo lectura (commits d334155,
  34952e5, d55ead4) — TOOTH-HISTORY-1 ya cerrado, no retomar.
- Design Studio de Personalizar: panel honesto, compacto, sin motor real
  (commits 3f74297 → a84e107, ver docs/NELZZON_STATE.md sección 2).

Reglas permanentes (NO NEGOCIABLES):
1. NO modificar migraciones 0001–0018. Cambios de schema = migración nueva + aprobación.
2. NO tocar payments, quotes, RLS, audit sin aprobación explícita.
3. NO push/deploy/VPS sin autorización explícita de Oscar.
4. NO correr npm run seed (duplica orgs/usuarios). Usar seed:demo si hace falta datos demo.
5. NO subir ecosystem.config.cjs (contiene credenciales reales del VPS).
6. NO exponer note, lifecycleReason, recordedByUserId en DTOs de UI.
7. Dinero siempre en centavos BIGINT. Totales siempre del servidor.
8. Después de cualquier cambio al backend: npx tsc --noEmit + npm test + npm run build.

Fase recomendada para esta sesión: GLOBAL-SEARCH-1A
Descripción: Buscador global en la barra de navegación superior.
Busca pacientes por nombre/teléfono/FDI. Redirige a /pacientes/[id].
Reutilizar dominio existente en src/server/domain/ — no inventar endpoints nuevos.

IMPORTANTE sobre Personalizar / Design Studio:
- NO asumir que Personalizar guarda cambios reales.
- NO asumir que existe un motor de persistencia.
- NO asumir que hay backend nuevo que tocar ahí.
Es 100% presentacional — useState local, sin tablas, sin endpoints, sin RBAC nuevo.
Detalle completo en docs/NELZZON_STATE.md.

Documentación de estado en (leer primero docs/NELZZON_STATE.md y NELZZON_BACKLOG.md):
- docs/NELZZON_STATE.md — foto del estado real al cierre de la última sesión
- docs/NELZZON_BACKLOG.md — backlog priorizado de lo que sigue
- docs/NELZZON_PRODUCTION_BASELINE.md (línea base de producción: dominio, PM2, env)
- docs/NELZZON_PERSONALIZAR_MASTER.md / NELZZON_PERSONALIZAR_WIREFRAME.md (Design Studio)
- docs/LOOLO_ODONTOLOGIA_STATE.md / LOOLO_ODONTOLOGIA_BACKLOG.md (referencias históricas)
- docs/NEXT_CHAT_STARTER.md (este archivo)

Antes de implementar cualquier cosa: propón un plan corto y espera OK de Oscar.
```

---

## Si quieres continuar con una fase distinta

Reemplaza la línea "Fase recomendada" por la que corresponda:

**TOOTH-HISTORY-1**
```
Fase recomendada: TOOTH-HISTORY-1
Descripción: Historial de cambios por pieza/diente. Panel que muestra la cadena de
supersedesFindingId desde el hallazgo original hasta el estado actual. Solo lectura.
Los datos ya están en odontogram_findings. Ninguna migración necesaria.
```

**REPAIR-VOID-41**
```
Fase recomendada: REPAIR-VOID-41
Descripción: Reparar encounterId=null en la fila VOIDED de pieza 41 en producción.
Script ya listo: npm run repair:voided-encounter (dry-run primero).
Ejecutar --apply solo con autorización explícita de Oscar en el VPS.
NO hacer push de código nuevo. Solo correr el script de reparación.
```

**FVO-UX-1**
```
Fase recomendada: FVO-UX-1
Descripción: Mejorar presentación de la Ficha Viva del paciente. Mejor agrupación
visual, campos más claros, accesibilidad. Solo presentación — dominio fvo-write.ts intacto.
```

---

## Comandos útiles de referencia

```bash
# Validar antes de cualquier commit
npx tsc --noEmit
npm test
npm run build

# Ver estado de producción (en VPS)
cd ~/Desktop/SAAS/loolo
git rev-parse --short HEAD
pm2 status
pm2 logs loolo --lines 50 --nostream
curl -sI http://127.0.0.1:3000/login | head -5

# Deploy normal al VPS (solo con autorización)
git pull
npm run build
pm2 restart loolo

# Si PM2 entra en loop EADDRINUSE
pm2 stop loolo && pm2 delete loolo && fuser -k 3000/tcp
pm2 start ecosystem.config.cjs

# Reparación pieza 41 (dry-run — NO ejecutar --apply sin autorización)
npm run repair:voided-encounter

# Sincronizar RBAC sin tocar datos
npm run sync:rbac

# Seed demo (idempotente, solo datos demo — NO usar npm run seed)
npm run seed:demo
```

---

## Archivos clave a conocer

| Archivo | Rol |
|---|---|
| `CLAUDE.md` | Instrucciones del proyecto para Claude Code |
| `src/server/domain/clinical/odontogram.ts` | Dominio odontograma (NO modificar sin razón) |
| `src/server/domain/clinical/odontogram-views.ts` | Vistas del odontograma |
| `src/components/odontogram/tooth-utils.ts` | `pickGlobalBorderFinding` — lógica pura testeable |
| `src/components/odontogram/EncounterFindings.tsx` | Panel de hallazgos en consulta activa |
| `src/components/odontogram/ToothDetailPanel.tsx` | Panel de pieza en ficha maestra |
| `src/components/odontogram/ToothGlyph.tsx` | Vista Cuadros |
| `src/components/odontogram/ToothAnatomyGlyph.tsx` | Vista Dientes |
| `src/server/actions/odontogram.ts` | Server actions del odontograma |
| `scripts/repair-voided-encounter-id.ts` | Script de reparación pieza 41 |
| `scripts/sync-rbac.ts` | Sincronización RBAC segura |
| `prisma/migrations/` | Migraciones 0001–0018 (NO editar) |
| `ecosystem.config.example.cjs` | Plantilla PM2 (versionada, sin secretos) |
