# Nelzzon — Estado de continuidad (post Design Studio)

> Última actualización: 2026-06-07
> Commit HEAD validado en producción y origin/main: `a84e107` — "style: make personalization studio preview friendly"
> Fase recién cerrada: **NELZZON-CONTINUITY-1** (solo documentación, sin tocar código)

Este documento es la foto del estado real al cierre de la serie de fases
**NELZZON-PERSONALIZAR-MASTER-0A → 0E** y **NELZZON-PERSONALIZAR-UX-0F**. Sirve
para que cualquier sesión futura sepa, sin adivinar, qué existe hoy, qué es solo
apariencia y qué sigue pendiente.

---

## 1. Validado al cierre de esta sesión

| Punto | Valor |
|---|---|
| Producción principal | https://nelzzon.com — `/login` responde 200 |
| Dominio de respaldo temporal | https://loolo.mx — vivo, NO redirigir todavía |
| VPS — ruta del proyecto | `~/Desktop/SAAS/loolo` |
| VPS — proceso PM2 | `loolo` — online |
| Puerto | 3000 activo con `next-server` |
| `/dashboard` sin sesión | 307 → `/login` (esperado, normal) |
| Commit validado | `a84e107` (origin/main al día) |
| Pruebas | 850/850 verdes |
| git status (VPS) | solo `?? .env.local.disabled-20260607-051302` (NO tocar — archivo deshabilitado, no es `.env.local` activo) |

---

## 2. Qué se construyó en esta serie de fases (0A → 0F)

Todo bajo el paraguas de **Personalizar → Design Studio**, descrito en:
- `docs/NELZZON_PERSONALIZAR_MASTER.md` (mapa maestro — visión, principios, estados)
- `docs/NELZZON_PERSONALIZAR_WIREFRAME.md` (wireframe textual accionable)

Resultado visible hoy en producción (`src/components/shell/PersonalizationPanel.tsx`):

- Panel "Personalizar nelzzon" rediseñado como **drawer lateral compacto**
  (`w-[min(25rem,92vw)]`, `max-h-[min(33rem,76vh)]`) — no tapa el dashboard.
- Header con título, subtítulo "Haz que el sistema se sienta tuyo", badge
  "Vista previa" y buscador visual local (filtra categorías por texto).
- 14 categorías navegables como fila horizontal de chips (Inicio, Marca,
  Apariencia, Fondos, Tipografías, Dashboard, Widgets, Navegación, Módulos,
  Portal, Plantillas, Accesibilidad, Avanzado, IA).
- Sección **Inicio** rediseñada como portada emocional "Tu nelzzon" con mini
  preview visual (topbar/sidebar/tarjetas/dock en miniatura), tarjetas rápidas
  hacia Apariencia/Fondos/Dashboard/Portal y resumen de estado en badges.
- Cada opción listada lleva un badge honesto de estado: **Vista previa aquí /
  Próximamente / Requiere motor / Solo admin** — nunca aparenta ser un botón
  funcional si no lo es.
- Vista previa real (cambia algo *dentro del panel*, nada se guarda):
  - `PersonalizationPreviewToggle` + `VisualStylePreview` en Apariencia
  - `AccessibilityPreview` (tamaño de letra / alto contraste / reducir
    movimiento) en Accesibilidad — afecta solo una tarjeta de muestra local
  - Botón "Abrir biblioteca" en Módulos — navega a `ModuleCatalog` real
- Footer rediseñado como **texto informativo**, no como botón: "Los cambios
  todavía no se guardan. Guardar es parte del motor de personalización —
  todavía no existe."

### Commits de esta serie (más reciente primero)
```
a84e107 style: make personalization studio preview friendly   (UX-0F)
1daa1fb fix: improve personalization studio scrolling          (0E)
0e159b1 style: enhance personalization studio home             (0D)
3f74297 style: redesign nelzzon personalization studio         (0C)
90a58bf docs: define nelzzon personalization wireframe         (0B)
e6be4e8 docs: define nelzzon personalization master plan       (0A-V3)
```

---

## 3. Lo que NO existe todavía (no asumir lo contrario)

Esto es deliberado y está documentado en el propio panel — **no es deuda oculta**:

- **No hay backend de personalización.** No hay tablas, endpoints, server
  actions ni eventos para guardar preferencias visuales.
- **No hay motor de persistencia real.** "Guardar" no existe — el footer lo
  declara explícitamente como texto informativo.
- **No hay drag-and-drop real, ni upload real, ni IA real.** Todo lo que se ve
  de eso en el panel son tarjetas con badge "Próximamente" / "Requiere motor".
- Todo el estado del panel es `useState` local (modo de vista, estilo elegido,
  categoría activa, búsqueda, controles de accesibilidad) — se pierde al cerrar.
- No se agregaron permisos RBAC nuevos, ni se tocó `hasPermission`.

**Para la siguiente fase: no asumir que "Personalizar" guarda nada, no asumir
que existe un motor real, no asumir que hay backend nuevo que tocar.**

---

## 4. Archivos relevantes de esta serie (referencia, no tocar sin razón)

| Archivo | Rol |
|---|---|
| `src/components/shell/PersonalizationPanel.tsx` | Design Studio — panel principal, 100% presentacional |
| `src/components/shell/VisualStylePreview.tsx` | Vista previa local de estilos curados (genuina) |
| `src/components/shell/PersonalizationPreviewToggle.tsx` | Selector de modo de vista (genuino, local) |
| `src/components/shell/AppShell.tsx` | Cascarón — posiciona el panel como drawer lateral |
| `src/components/shell/ModuleCatalog.tsx` | Biblioteca de módulos (vinculada desde "Módulos") |
| `src/components/shell/AppDock.tsx` | Dock inferior — fuente de `DOCK_HREFS` |
| `docs/NELZZON_PERSONALIZAR_MASTER.md` | Mapa maestro de Personalizar (visión completa) |
| `docs/NELZZON_PERSONALIZAR_WIREFRAME.md` | Wireframe textual accionable |
| `docs/NELZZON_PRODUCTION_BASELINE.md` | Línea base de producción (dominio, PM2, env) |

---

## 5. Hallazgos colaterales pendientes (documentados, no resueltos)

- `app-sidebar.tsx` contiene enlaces a `/consultas`, `/tratamiento`,
  `/configuracion` — rutas que todavía no existen como páginas reales (mismo
  hallazgo que se corrigió en `AppDock`/`ModuleCatalog` durante
  `NELZZON-EXPERIENCE-1B-LINK-SAFETY`, commit `73958d9`). Pendiente una pasada
  de "link safety" sobre el sidebar — fuera de alcance de esta serie.
- El archivo `.env.local.disabled-20260607-051302` aparece como `??` en
  `git status` del VPS — es un archivo deshabilitado intencionalmente, **no
  tocar** (puede romper auth si se confunde con `.env.local` activo).

---

## 6. Recomendación de siguiente paso

Ver `docs/NELZZON_BACKLOG.md` para el detalle priorizado. En resumen: la
siguiente fase candidata natural es continuar el plan de Personalizar (fase 1A
de "wiring" según el wireframe) **o** retomar trabajo funcional pendiente
(p. ej. GLOBAL-SEARCH-1A, TOOTH-HISTORY-1, link-safety del sidebar) — a
decisión de Oscar, no autónomo.
