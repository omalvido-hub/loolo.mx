# NELZZON_STYLE_GUIDE.md — Guía de estilo visual (Fase 1)

> Estado: **BORRADOR — documento de referencia. No implica implementación.**
> Este documento no autoriza código, commits, push ni deploy.
> Basado únicamente en:
> - `docs/NELZZON_UX_REBUILD_PLAN.md`
> - `docs/NELZZON_VISUAL_REFERENCES.md`
> - `docs/visual-references/nelzzon-dashboard.html` (REF-001, REF-002, REF-003, REF-006)

---

## 1. Propósito y alcance

Esta guía define los tokens visuales (color, tipografía, espaciado, radios, iconografía) y los patrones de componentes (tarjeta, badge, botón, sidebar, topbar, drawer) que se usarán como **única fuente de verdad** a partir de la Fase 1 del rebuild de UX (`docs/NELZZON_UX_REBUILD_PLAN.md`, secciones 3 y 21).

Alcance de este documento:
- Es **solo documentación**. No crea, modifica ni elimina componentes reales, páginas, rutas, backend, RBAC, migraciones ni producción.
- Sirve como insumo para una futura implementación de `/dev/styleguide` (sección 15), que requiere su propia aprobación separada.
- No cubre tablas/listados ni formularios (secciones 13 y 14) por falta de referencia real aprobada (REF-004 y REF-005).

---

## 2. Origen de la referencia visual

Según `docs/NELZZON_VISUAL_REFERENCES.md`:

| Referencia | Cubre | Archivo real |
|---|---|---|
| REF-001 | Dashboard | `docs/visual-references/nelzzon-dashboard.html` |
| REF-002 | AppShell / navegación | `docs/visual-references/nelzzon-dashboard.html` |
| REF-003 | Tarjetas / cards | `docs/visual-references/nelzzon-dashboard.html` |
| REF-006 | Drawer / modal lateral | `docs/visual-references/nelzzon-dashboard.html` |
| REF-004 | Tablas / listados | **pendiente** |
| REF-005 | Formularios | **pendiente** |

Todos los tokens y patrones de las secciones 3 a 12 de esta guía se extraen directamente del archivo `nelzzon-dashboard.html` (mockup HTML/CSS estático), sin interpretación libre, según la regla "no se diseña a ojo" (`docs/NELZZON_VISUAL_REFERENCES.md`, sección 2).

---

## 3. Paleta de colores

Tokens definidos en `:root` de `nelzzon-dashboard.html`:

| Token | Valor | Uso |
|---|---|---|
| `--accent` | `#4f46e5` | Color de marca / acción principal |
| `--accent-2` | `#6366f1` | Variante de acento |
| `--accent-soft` | `#eef2ff` | Fondo suave de acento (estados activos, tiles) |
| `--bg` | `#f5f6f8` | Fondo general de la app |
| `--surface` | `#ffffff` | Fondo de sidebar, topbar, tarjetas |
| `--card-bg` | `#ffffff` | Fondo de tarjeta |
| `--ink` | `#161a23` | Texto principal |
| `--muted` | `#6b7280` | Texto secundario |
| `--faint` | `#9aa1ad` | Texto terciario / iconos discretos |
| `--line` | `#ecedf1` | Bordes suaves |
| `--line-2` | `#e3e5ea` | Bordes de inputs/botones |
| `--green` / `--green-soft` | `#059669` / `#ecfdf5` | Estado positivo / "Activo", "Saludable" |
| `--amber` / `--amber-soft` | `#d97706` / `#fff7ed` | Estado de advertencia / "Pendiente" |
| `--rose` / `--rose-soft` | `#e11d48` / `#fff1f3` | Estado crítico/negativo |
| `--violet` / `--violet-soft` | `#7c3aed` / `#f5f3ff` | Categoría secundaria (tratamientos) |
| `--sky` / `--sky-soft` | `#0284c7` / `#eff8ff` | Categoría secundaria (agenda/metas) |
| `--shadow` | `0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.05)` | Sombra estándar de tarjeta |

**Nota:** estos colores son los del mockup de referencia. Cualquier mapeo a estados reales del negocio (por ejemplo, qué color corresponde a qué estado de presupuesto o cita) se define en fases posteriores, con datos reales del backend — no se inventa aquí.

---

## 4. Tipografía

- **Familia:** Plus Jakarta Sans (pesos 400, 500, 600, 700), con `system-ui, sans-serif` como respaldo.
- **Escala observada en el mockup:**
  - Valor KPI principal (`.kval`): 30px / peso 700 / letter-spacing `-.02em`.
  - Valor KPI compacto (`.kval` en `body.compact`): 26px.
  - Etiqueta de KPI (`.klabel`): 12.5px / peso 600 / mayúsculas / letter-spacing `.02em`.
  - Subtexto (`.ksub`): 13px / `--muted`.
  - Texto de marca (sidebar `.brand b`): 18px / peso 700.
  - Enlaces de navegación (`.nav a`): 14.5px / peso 500 (600 si activo).
  - Saludo de topbar (`.greet b`): 16px / peso 600.
  - Texto de buscador/input: 14.5px.
  - Badges: 12px / peso 600.

---

## 5. Espaciado y radios

| Token | Valor | Uso |
|---|---|---|
| `--radius` | `16px` | Radio estándar de tarjeta |
| `--pad-card` | `20px` | Padding interno de tarjeta |
| `--side-w` | `248px` | Ancho de sidebar |
| Radio de botones/inputs | `11px`–`13px` | `.btn-accent`, `.icon-btn`, `.search input`, `.sect` |
| Radio de badges/pills | `8px` (badge), `999px` (pill flotante) | `.badge`, `.fab-pill` |
| Gap entre tarjetas (`.grid`) | `18px` | Separación de grid de KPIs y filas secundarias |
| Padding de drawer (`.drawer-body`, `.drawer-top`) | `18px 20px` | Contenido del drawer lateral |
| Ancho de drawer abierto (`.drawer.open`) | `336px` | Panel "Personalizar" |

---

## 6. Iconografía

- **Librería:** Tabler Icons (`tabler-icons.min.css`, vía CDN en el mockup).
- **Tamaños observados:**
  - Iconos de navegación (`.nav a i`): 20px.
  - Iconos de tile en tarjeta (`.tile i`): 23px (20px en modo compacto).
  - Iconos de topbar (`.icon-btn`, `.greet i`): 19px–21px.
  - Iconos de badge: 14px.
  - Iconos de sección del drawer (`.sect-h .si`): 17px.
- **Estilo:** lineales (`ti-*`), un solo color por contexto (heredado de `--accent`, `--muted`, `--faint` o el color semántico del tile/badge).

---

## 7. Componente: Tarjeta / card

Patrón base (`.card`):
- Fondo `--card-bg`, borde `1px solid var(--line)`, radio `--radius` (16px), padding `--pad-card` (20px), sombra `--shadow`.
- Hover: `translateY(-2px)`.

**Variante KPI** (tarjetas de la fila superior):
- Encabezado (`.card-head`): tile de icono (46x46px, radio 13px, color semántico `t-sky`/`t-green`/`t-violet`/`t-amber`/`t-rose`/`t-accent`) + icono de información (`ti-info-circle`) alineado a la derecha.
- Etiqueta (`.klabel`): texto corto en mayúsculas, color `--faint`.
- Valor principal (`.kval`): número grande, con sufijo opcional pequeño (ej. "MXN").
- Subtexto (`.ksub`): detalle adicional, puede incluir un `.delta` en verde para variaciones positivas.
- Badge de estado opcional al final (`.badge`, ver sección 8).

**Variante secundaria con progreso** (fila "Meta mensual"):
- Misma estructura de encabezado + etiqueta + valor.
- Incluye una barra de progreso (`.progress`, 9px de alto, radio 6px, relleno `--accent`) en lugar de (o además de) un badge.

---

## 8. Componente: Badge de estado

Patrón base (`.badge`):
- `display:inline-flex`, gap 5px, font 12px peso 600, padding `4px 11px`, radio 8px.
- Opcionalmente incluye un icono Tabler de 14px.

Variantes de color observadas:
| Clase | Fondo | Texto | Ejemplo de uso en el mockup |
|---|---|---|---|
| `.b-green` | `--green-soft` | `--green` | "Activo", "Saludable" |
| `.b-amber` | `--amber-soft` | `--amber` | "Pendiente" |
| `.b-sky` | `--sky-soft` | `--sky` | "En progreso" |
| `.b-gray` | `--bg` | `--muted` | "Objetivo $X" (informativo, sin connotación de estado) |

**Nota:** el mapeo de estos colores a estados reales del backend (ej. `PENDING`, `ACTIVE`, `FINALIZED`) se define en fases posteriores con datos reales — esta sección solo documenta el patrón visual y los colores disponibles.

---

## 9. Componente: Botón

**Botón primario** (`.btn-accent`):
- Altura 40px, padding horizontal 16px, radio 11px, sin borde.
- Fondo `--accent`, texto blanco, peso 600, tamaño 14px.
- Sombra sutil `0 1px 2px rgba(79,70,229,.25)`.
- Hover: `filter:brightness(1.06)`.
- Puede incluir un icono Tabler de 18px antes del texto.
- Ejemplo en el mockup: botón "Personalizar" en el topbar.

**Botón icono** (`.icon-btn`):
- 38x38px, radio 10px, borde `1px solid var(--line-2)`, fondo `--surface`.
- Color de icono `--muted`, hover cambia a fondo `--bg` y color `--ink`.
- Ejemplo: botón de menú lateral en el topbar, botón de cierre del drawer.

**Botones del pie del drawer** (`.drawer-foot button`):
- Altura 42px, radio 11px, peso 600, tamaño 13.5px, ocupan espacio flexible (`flex:1`).
- Variante `.ghost`: borde `1px solid var(--line-2)`, fondo `--surface`, texto `--muted` (acción secundaria, ej. "Cancelar").
- Variante `.solid`: sin borde, fondo `--accent`, texto blanco (acción primaria, ej. "Guardar").

---

## 10. Componente: Sidebar / navegación

- Ancho fijo `--side-w` (248px), fondo `--surface`, borde derecho `1px solid var(--line)`, padding `18px 14px`.
- **Marca** (`.brand`): logo cuadrado 34x34px (radio 10px, fondo `--accent`, inicial en blanco) + nombre en texto 18px peso 700.
- **Navegación** (`.nav a`): items verticales, gap 2px, padding `10px 12px`, radio 11px, icono (20px) + texto (14.5px peso 500).
  - Estado normal: color `--muted`.
  - Hover: fondo `--bg`, color `--ink`.
  - Estado activo (`.active`): fondo `--accent-soft`, color `--accent`, peso 600.
  - Separador (`.sep`): línea horizontal `1px` color `--line` con márgenes.
- **Pie de sidebar** (`.side-foot`): bloque informativo (ej. nombre de organización + plan), fondo `--bg`, radio 12px, texto 12.5px color `--muted`.
- Items de navegación del mockup (solo como referencia de estructura, **no son la lista final de módulos de Nelzzon** — esa la define el RBAC/config existente): Inicio, Pacientes, Agenda, Consultas, Tratamientos, Cobros, separador, Documentos, Reportes, Configuración.

---

## 11. Componente: Topbar

- `display:flex`, gap 14px, padding `14px 26px`, fondo `--surface`, borde inferior `1px solid var(--line)`.
- Elementos de izquierda a derecha:
  1. Botón de menú (`.icon-btn`) para colapsar sidebar.
  2. Saludo (`.greet`): icono + texto ("Buenos días, {usuario}").
  3. Buscador (`.search`): input de 42px de alto, radio 12px, fondo `--bg`, icono de lupa a la izquierda, placeholder en `--faint`; al enfocar cambia a fondo `--surface`, borde `--accent` y halo `0 0 0 4px var(--accent-soft)`.
  4. Sección derecha (`.top-right`, `margin-left:auto`): botón primario de acción (ej. "Personalizar") + bloque de usuario.
- **Bloque de usuario** (`.user`): avatar circular 40px (iniciales, fondo `--accent-soft`, texto `--accent`) + nombre (14px peso 600) y rol/cargo (12.5px, color `--accent`).

---

## 12. Componente: Drawer lateral

- Contenedor (`.drawer`): ancho 0 por defecto, se expande a 336px cuando está abierto (`.drawer.open`), transición de 0.28s, fondo `--surface`, borde izquierdo `1px solid var(--line)`.
- **Encabezado** (`.drawer-top`): título con icono (16px peso 700) + botón de cierre (`.icon-btn` de 34x34px).
- **Cuerpo** (`.drawer-body`): padding `18px 20px`, scrollable.
  - Puede incluir una etiqueta de estado "en vivo" (`.live-tag`): texto 12px peso 600, color `--green`, fondo `--green-soft`, radio 8px, con un punto animado (`.dot`, pulso).
  - Contenido organizado en **secciones colapsables** (`.sect`): borde `1px solid var(--line)`, radio 13px, encabezado clickeable con icono (32x32px, fondo `--accent-soft`), título + subtítulo, y chevron que rota al abrir/cerrar.
- **Pie** (`.drawer-foot`): padding `14px 20px`, borde superior `1px solid var(--line)`, dos botones (`.ghost` + `.solid`, ver sección 9).

Este patrón (overlay/panel lateral con header + secciones + footer de 2 acciones) es la base para la variante "lateral" del componente de drawer/modal descrito en `docs/NELZZON_UX_REBUILD_PLAN.md` sección 10, y para el futuro "Personalizar simple" (sección 20 del mismo plan).

---

## 13. Pendiente: Tablas / listados (bloqueado)

**REF-004 (Tablas / listados) no tiene archivo real registrado** en `docs/NELZZON_VISUAL_REFERENCES.md`.

`nelzzon-dashboard.html` no contiene ningún patrón de tabla o lista. Por lo tanto:
- Esta guía **no define** estilos de encabezados de tabla, filas, paginación, ni estados vacíos de listas.
- No se construye ningún componente de tabla/listado hasta que Oscar apruebe y registre una referencia real para REF-004, según la regla "no se diseña a ojo" (`docs/NELZZON_VISUAL_REFERENCES.md`, sección 2).

---

## 14. Pendiente: Formularios (bloqueado)

**REF-005 (Formularios) no tiene archivo real registrado** en `docs/NELZZON_VISUAL_REFERENCES.md`.

`nelzzon-dashboard.html` no contiene ningún formulario (solo un input de búsqueda, ya documentado en la sección 11 como parte del topbar). Por lo tanto:
- Esta guía **no define** estilos de inputs de formulario, selects, textareas, checkboxes, radios, ni estados de validación/error/éxito.
- No se construye ningún componente de formulario hasta que Oscar apruebe y registre una referencia real para REF-005, según la misma regla.

---

## 15. Reglas para futura implementación en `/dev/styleguide`

Estas reglas aplican **cuando** se implemente la página de estilo aislada (`docs/NELZZON_UX_REBUILD_PLAN.md`, sección 3 y 21, Fase 1) — no aplican a este documento, que es solo Markdown.

- `/dev/styleguide` (o ruta equivalente) debe estar **protegida por sesión autenticada**, igual que el resto de `(app)` — no se expone públicamente.
- Debe marcarse como **temporal/interna** y **no enlazarse desde la navegación real** hasta que Oscar lo autorice explícitamente.
- Los datos mostrados deben ser **datos de ejemplo claramente etiquetados como tales** — nunca presentados como datos reales de una organización, paciente o monto.
- Solo incluye los componentes ya definidos en esta guía (secciones 3 a 12). Las secciones 13 y 14 (tablas, formularios) quedan fuera hasta tener referencia real.
- No se cambia RBAC, navegación real, ni se toca ninguna pantalla existente para construir esta página.

---

## 16. Reglas para evitar errores de Client/Server Components

Contexto: en una serie de commits previos del dashboard (`feat: add draggable dashboard layout`, `feat: dashboard final adjustments...`), se intentó envolver tarjetas con datos obtenidos en el servidor (componente `async` de servidor) dentro de un layout interactivo de cliente (drag-and-drop con `localStorage`), lo que provocó errores y tuvo que revertirse dos veces.

Para no repetirlo, la futura implementación de `/dev/styleguide` debe seguir:

- Usar **datos de ejemplo estáticos/hardcodeados** dentro de la propia página de estilo — sin `await` a dominios del backend, sin fetching de servidor que combinar con interactividad.
- Cualquier interactividad (hover del drawer, toggle de secciones colapsables, cambio de tema de ejemplo) se aísla en componentes marcados `"use client"` **desde su propia hoja del árbol**, sin envolver subárboles que mezclen datos async de servidor con lógica de cliente.
- No se reintroduce drag-and-drop ni persistencia en `localStorage` en esta fase.
- Antes de proponer cualquier commit de implementación: `npx tsc --noEmit` **y** `npm run build` (el build de Next.js detecta errores de límite Client/Server que `npm test` no detecta necesariamente).

---

## 17. Checklist antes de implementar Fase 1

Antes de pedir aprobación para crear `/dev/styleguide` o cualquier componente basado en esta guía, según `docs/NELZZON_UX_REBUILD_PLAN.md` sección 23.1:

- [ ] Plan corto de qué archivos se crearán/modificarán, presentado y aprobado por Oscar.
- [ ] Confirmar que los componentes a construir están cubiertos por esta guía (secciones 3 a 12) — si algo no está cubierto, no se construye sin antes actualizar esta guía con la referencia correspondiente.
- [ ] Confirmar que tablas y formularios (secciones 13 y 14) siguen excluidos, salvo que REF-004/REF-005 ya tengan archivo real registrado.
- [ ] `npm test` → resultado completo (X/X) antes y después del cambio.
- [ ] `npx tsc --noEmit` → limpio.
- [ ] `npm run build` → exitoso.
- [ ] `git diff --stat` del cambio propuesto.
- [ ] Lista exacta de archivos tocados (creados/modificados/eliminados).
- [ ] Confirmar que no se tocó backend, RBAC, migraciones, `.claude/settings.local.json`, ni ninguna pantalla real existente.
- [ ] Propuesta de rollback específica (qué commit(s) revertir y qué queda intacto).

Sin este checklist completo, no se solicita ni se realiza commit.
