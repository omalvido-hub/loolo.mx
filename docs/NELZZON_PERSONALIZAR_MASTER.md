# NELZZON · PERSONALIZAR — Documento Maestro

> Versión 1 · Fase NELZZON-PERSONALIZAR-MASTER-0A-V3
> Este documento NO implementa nada. Es el mapa de diseño y producto que guía las
> fases siguientes (0B en adelante). No toca backend, base de datos, Prisma,
> migraciones, auth, `.env` ni VPS — es 100% documentación.

---

## 0. Auditoría previa (4 bloques)

### 0.1 Auditoría UX/UI — Diseñador Senior

**¿Producto real o maqueta?**
Hoy "Personalizar" se siente como una **maqueta educada**: un panel pequeño y
correcto, con buena microcopy ("vista previa", "no se guarda todavía"), pero
de alcance mínimo — un selector de "modo de vista" (3 botones) y una grilla de
4 muestras de color. No transmite la promesa de "haz tuyo tu sistema". Es
honesto (no miente sobre lo que hace), pero es **modesto al punto de no generar
deseo**. El usuario lo abre, ve dos controles, y lo cierra sin sentir que ahí
vive algo importante.

**¿Qué se siente pobre, incompleto o confuso?**
- El panel flota sobre el contenido (esquina superior derecha) como un popover
  cualquiera — el mismo patrón visual que un menú de usuario o notificaciones.
  Para algo que aspira a ser un "Design Studio" es demasiado pequeño y
  efímero.
- No hay jerarquía de categorías: solo dos secciones sueltas ("Modo de vista" y
  "Estilos visuales"). No anticipa que ahí vivirán fondos, tipografías, dock,
  portal, plantillas, IA, etc.
- El "Catálogo de módulos" (ahora "Biblioteca de módulos") vive en un flujo
  separado del panel de Personalizar, abierto desde el botón "Agregar" del
  dock — conceptualmente debería ser **una sección más** del Design Studio
  ("Módulos"), no una experiencia paralela con su propia entrada.
- No existe ningún punto de entrada que comunique "esto va a crecer mucho" —
  ni un banner, ni una sección "próximamente aquí vivirá…", ni una jerarquía
  de navegación interna (tabs, rail, lista de categorías).

**¿Faltan categorías de personalización?**
Sí, casi todas las que importan para que el usuario sienta control real:
fondos/imágenes, tipografía, branding (logo/isotipo/paleta propia), dashboard
(layout, widgets, KPIs), navegación (sidebar/topbar/dock), iconografía/emojis,
portal del paciente, plantillas por profesión, accesibilidad, y — más adelante —
IA de personalización. Hoy solo existen dos categorías muy acotadas: "modo de
vista" y "estilo visual" (4 swatches fijos).

**¿Las opciones actuales bastan para sentir control real?**
No. Cuatro tarjetas de color y tres botones de "modo" son una **vitrina**, no
un taller. Control real significa: "puedo subir mi logo", "puedo elegir qué
widgets veo y en qué orden", "puedo decidir qué módulos viven en mi dock",
"puedo ajustar cómo se ve el portal que ven mis pacientes". Ahí es donde nace
la sensación de "esto es mío".

**Como diseñador, agregaría / quitaría / reorganizaría esto…**
- **Agregaría**: una "casa" propia para Personalizar — no un popover, sino una
  superficie expansiva (panel lateral grande, modal de pantalla completa, o
  vista dedicada tipo `/personalizar`) organizada en secciones navegables
  (rail de categorías + contenido), con una portada ("Inicio/Resumen") que
  muestre de un vistazo el estado de tu personalización y atajos a lo más
  usado. Agregaría también una sección "Marca" como punto de entrada emocional
  (logo, colores, nombre) — es lo primero que un dueño de negocio quiere tocar.
- **Quitaría**: nada de lo que existe hoy es prescindible — pero sí fusionaría
  el flujo de "Biblioteca de módulos" dentro del Design Studio como su sección
  "Módulos", para que deje de sentirse como una experiencia satélite.
- **Reorganizaría**: pasaría de "panel flotante con dos controles" a
  "estructura de secciones con estado declarado" (activo / preview / próximamente
  / requiere motor futuro / bloqueado por plan / solo admin), de forma que el
  usuario entienda exactamente qué puede tocar hoy y qué viene después — sin
  que eso se sienta como limitación, sino como **mapa de un viaje**.

### 0.2 Auditoría Design System

**Tokens visuales futuros necesarios**
- **Color**: paleta de marca propia por organización (primario, secundario,
  acento, superficies), además de los tokens semánticos actuales
  (`--primary`, `--muted`, `--destructive`, etc.). Necesitará un mapeo entre
  "color de marca del cliente" → "tokens semánticos de nelzzon" para no romper
  estados (éxito/error/advertencia deben seguir siendo reconocibles).
- **Tipografía**: token de familia (sans corporativa actual + posibles
  alternativas curadas — no fuentes arbitrarias subidas por el usuario, al
  menos no en una primera etapa), escala tipográfica (tamaño base + ratio),
  pesos permitidos, tracking, line-height, y un token de "fuente para números"
  (importante para finanzas/citas — cifras tabulares legibles).
- **Radios**: ya existe una escala (`--radius` con derivados sm…4xl) — se
  puede exponer como "personalidad de forma" (anguloso / suave / muy suave).
- **Sombras**: catalogar 2–3 niveles (sutil / media / premium) en vez de
  permitir sombras arbitrarias — hoy cada componente define su propio
  `shadow-[...]` arbitrario; esto debería convertirse en tokens reusables.
- **Fondos**: tokens para "superficie base", "superficie elevada", "fondo de
  hero/portada", soporte de imagen + overlay + blur + gradiente, con reglas de
  contraste obligatorias.
- **Densidad**: token de espaciado (cómodo / compacto), que ajuste paddings y
  alturas de fila de forma centralizada (no archivo por archivo).
- **Iconos**: token de "set de iconos" (lineal actual de lucide / relleno /
  glass / emoji), tamaño, contenedor (con o sin badge de color).
- **Glass / blur**: ya se usa `backdrop-blur` puntualmente — formalizarlo como
  token de "intensidad de vidrio" (ninguno / sutil / pronunciado).
- **Animaciones**: token de "movimiento" (estático / sutil / expresivo) y
  soporte obligatorio de `prefers-reduced-motion`.
- **Estados**: vocabulario visual único y reusable para *activo, hover, focus,
  disabled, preview, próximamente, bloqueado* — hoy cada componente improvisa
  su propio estilo para "deshabilitado" o "próximamente" (lo vimos al corregir
  enlaces rotos en 1B). Esto debe convertirse en un **componente de estado**
  compartido (badge + estilo de contenedor).

**Cómo evitar que la personalización rompa la coherencia**
- Definir un **núcleo no-negociable**: tipografía base legible, contraste
  mínimo AA, jerarquía tipográfica, espaciado base — el usuario personaliza
  *dentro* de ese núcleo, no lo reemplaza.
- Cualquier color/imagen de fondo elegido por el usuario debe pasar por un
  **validador de contraste automático** antes de aplicarse (o mostrar
  advertencia "esto puede afectar la legibilidad").
- Limitar personalización profunda (tipografías propias, layouts libres) a
  *plantillas curadas* + *ajustes paramétricos* — no a CSS libre. Esto
  preserva calidad sin sacrificar la sensación de control.
- Vista previa **antes** de aplicar, siempre — nunca un cambio destructivo
  inmediato sin posibilidad de comparar/revertir.

**Reglas propuestas**
1. Todo cambio de apariencia se previsualiza antes de guardar.
2. Todo cambio de apariencia es reversible (deshacer + restaurar default +
   historial de versiones).
3. Ningún color/fondo elegido por el usuario puede bajar el contraste texto/fondo
   de un umbral mínimo — si lo hace, el sistema ajusta o advierte.
4. La tipografía elegible es curada (familia + escala), no libre.
5. Los layouts personalizables (dashboard, dock, sidebar) se mueven dentro de
   una grilla con reglas (snap, tamaños mínimos), nunca en "canvas libre total".
6. Todo elemento personalizable declara su **alcance** (personal, de rol, de
   sucursal, de organización, de portal) para que el usuario entienda a quién
   afecta lo que está cambiando.

### 0.3 Auditoría Técnica Frontend

**Qué existe hoy** (componentes auditados: `AppShell`, `AppTopbar`,
`AppSidebar`/`app-sidebar.tsx`, `AppDock`, `ModuleCatalog`,
`PersonalizationPanel`, `VisualStylePreview`, `PersonalizationPreviewToggle`,
`DashboardKpiGrid`, `DashboardWidgetGrid`, `globals.css`):

| Pieza | Qué hace hoy |
|---|---|
| `AppShell` | Cascarón presentacional. Coordina estado local (`sidebarCollapsed`, `dockOpen`, `catalogOpen`, `personalizationOpen`, `mode`) con `useState`. Nada se persiste. |
| `AppTopbar` | Barra superior: buscador global (si el rol tiene `patients.view`), botón "Personalizar" (`Sparkles`, abre/cierra el panel), menú de usuario. |
| `AppSidebar` | Navegación lateral con permisos por ítem (`hasPermission`), botón "Personalizar" y enlace "Configuración". Colapsable (oculta el aside completo y delega el control de apertura a `SidebarMenuTrigger` en la topbar). |
| `AppDock` | Dock inferior flotante, colapsable, con accesos directos por permiso y botón "Agregar" que abre la biblioteca de módulos. Ya declara `available` por ítem (fase 1B) para no enlazar a rutas inexistentes. |
| `ModuleCatalog` | Modal "Biblioteca de módulos": lista agrupada por categoría, con badges de estado (`Ya en tu dock`, `Agregar al dock`/`Agregado`, `En preparación`, `Próximamente`, `Vista previa`). Toggle de "agregar" es estado local puro. |
| `PersonalizationPanel` | Popover con 2 secciones: `PersonalizationPreviewToggle` (modo de vista) y `VisualStylePreview` (4 presets de color). Badge "Vista previa" en el título. |
| `VisualStylePreview` | Grid de 4 tarjetas con gradiente de muestra; selección guarda el `key` elegido en estado local — **no aplica el estilo a nada**. |
| `PersonalizationPreviewToggle` | Selector tipo segmented control de 3 modos (Plano/Interactivo/Edición) con descripción; cambia estado local — **no cambia el render de ninguna pantalla**. |
| `DashboardKpiGrid` / `DashboardWidgetGrid` | Grids presentacionales con datos `MOCK_*`. No leen preferencias de usuario ni layout — el orden, tamaño y visibilidad están fijos en código. |
| `globals.css` | Define tokens de tema (oklch) para claro/oscuro, tipografía (`--font-sans`, ya corregida de un bug de auto-referencia), radios derivados de `--radius`, y tokens de sidebar/chart. Es la única fuente real de "tema" hoy — y es estática, compartida por todos los tenants. |

**Controles que parecen funcionales pero no hacen nada (botones "vacíos")**
- `PersonalizationPreviewToggle`: cambiar entre "Plano / Interactivo / Edición"
  actualiza `mode` en `AppShell`, pero **ningún componente lee ese valor** para
  cambiar su apariencia o comportamiento. Es un control que aparenta accionar
  algo y no acciona nada visible.
- `VisualStylePreview`: seleccionar un preset cambia `selected` en estado local
  del propio componente — no se propaga a `AppShell`, no cambia ningún color
  real de la interfaz. Es una "muestra de telas", no un selector funcional.
- `ModuleCatalog` → "Agregar al dock"/"Agregado": cambia un booleano en
  `Record<string, boolean>` local — el dock real (`AppDock`) no lo lee ni lo
  refleja. Es deliberadamente una vista previa de la *idea*, declarada como tal
  en la UI (correcto y honesto), pero confirma que **no existe ningún canal**
  entre "lo que el usuario dice que quiere" y "lo que el dock muestra".

**Qué sería solo "local preview" (no requiere backend)**
- Cambiar token de tema en tiempo real dentro de la sesión del navegador
  (CSS custom properties → recalculadas client-side), sin persistir.
- Probar combinaciones de fondo/tipografía/densidad sobre un **lienzo de
  vista previa** (mock del dashboard) sin tocar la app real.
- Reordenar/ocultar widgets dentro de una maqueta interactiva que no afecta al
  dashboard real hasta que el usuario "aplique".
- Explorar plantillas (con datos de muestra) y "probarlas" antes de elegir.

**Qué requeriría backend/persistencia futura (fuera de alcance hoy)**
- Guardar cualquier preferencia más allá de la sesión del navegador: tema,
  layout del dashboard, dock personalizado, widgets visibles/orden,
  preferencias de sidebar/topbar, branding del portal, plantillas guardadas,
  assets subidos (logo, imágenes de fondo), permisos de quién puede cambiar
  qué (personal vs. organización vs. sucursal vs. rol vs. portal), e
  historial/auditoría de cambios con capacidad de revertir versiones.
- Todo esto implica nuevas tablas (ver sección 8), políticas RLS específicas,
  permisos RBAC nuevos (`personalization.*`), eventos/auditoría sin datos
  sensibles, y — para assets — almacenamiento de archivos (fuera del alcance
  de este documento, que es solo de mapeo).

**Hallazgo colateral (fuera del alcance de esta fase, documentado para
trazabilidad):** el sidebar (`app-sidebar.tsx`) referencia `/consultas`,
`/tratamiento` y `/configuracion` como enlaces activos (`Link`), las mismas
tres rutas que en NELZZON-EXPERIENCE-1B-LINK-SAFETY se identificaron como
inexistentes en `src/app` y se neutralizaron en `AppDock`/`ModuleCatalog`. El
sidebar **no fue tocado** en esa fase (no estaba en su alcance) y hoy puede
llevar a un usuario a un 404 si su rol tiene esos permisos. Se deja constancia
aquí para que una fase futura de "link safety" lo revise — no se modifica nada
en este documento.

### 0.4 Auditoría de Producto / Negocio

**Esenciales para diferenciar nelzzon**
- Branding propio (logo, colores, nombre visible) — hace que cada clínica
  sienta que "nelzzon es su sistema", no un genérico con su nombre pegado.
- Configuración de dashboard/widgets/dock — el "cómo trabajo yo" cambia mucho
  entre un dueño, una recepcionista y un doctor; permitirles ajustar su propia
  vista es un diferenciador frente a sistemas rígidos.
- Plantillas por profesión — alinea con la visión de "fábrica de verticales"
  del proyecto (CLAUDE.md §5): cada profesión llega con su propio "vestido".
- Portal del paciente personalizable (al menos branding básico) — visible
  hacia el cliente final, refuerza la marca de la clínica ante sus pacientes.

**Disponible para todos los planes**
- Modo claro/oscuro/automático, densidad cómoda/compacta, tamaño de letra,
  alto contraste, reducir movimiento (accesibilidad: debe ser universal, nunca
  de pago — es una cuestión de inclusión, no de monetización).
- Selección entre un set curado de paletas/temas predefinidos.
- Mostrar/ocultar/reordenar accesos del dock y módulos visibles (dentro de lo
  que el rol ya tiene permitido ver).
- Elegir entre 2–3 layouts de dashboard predefinidos.

**Candidatos a Pro/Premium**
- Subir logo e imágenes propias (branding completo + portal personalizado).
- Paletas de color completamente personalizadas (más allá de las curadas).
- Layouts de dashboard tipo "drag and drop" / canvas libre con widgets
  redimensionables.
- Plantillas avanzadas por profesión + posibilidad de guardar/duplicar/exportar
  plantillas propias.
- Personalización por sucursal (para organizaciones multi-sede).
- IA de personalización ("hazlo más premium", "organiza mi dashboard").

**Por profesión / vertical**
- El **diagrama de inspección** y su catálogo de zonas/términos (ya definido
  como no-negociable en CLAUDE.md §5) es la pieza central que cambia por
  vertical — Personalizar debería exponer, en el futuro, una sección
  "Plantillas" que incluya el "vestido visual" + microcopy + iconografía
  acorde a la profesión (clínico para salud, formal para despachos legales,
  cálido para estética, técnico para talleres, etc.).
- Tono de voz / microcopy del portal (formal, amigable, clínico, premium)
  también varía por vertical y debería vivir en plantillas, no en ajustes
  sueltos.

**Solo owner/admin**
- Branding de organización (logo, colores corporativos, nombre visible).
- Personalización del portal del paciente/cliente (visible hacia afuera —
  cualquier cambio aquí es de marca, no de preferencia individual).
- Reglas de personalización por rol/sucursal (qué puede tocar cada quién).
- Plantillas a nivel organización, historial/auditoría de cambios, y
  exportación/importación de configuración.
- Personalización individual (tema propio, densidad, dashboard propio) debe
  quedar disponible para **cualquier usuario**, sin requerir privilegios admin
  — es la diferencia entre "configurar mi propio espacio" (universal) y
  "definir cómo se ve la organización para todos" (privilegiado).

---

## Reflexión previa al documento (preguntas del diseñador senior)

**¿Falta algo importante?**
Sí: una **narrativa de entrada**. Hoy no existe nada que le diga al usuario
"esto es el lugar donde tu sistema se vuelve tuyo". Falta también un lienzo de
vista previa unificado (ver tus cambios antes de aplicarlos, en contexto) y un
mecanismo claro de "deshacer / restaurar / versiones" — sin eso, "personalizar
mucho" da miedo, no control.

**¿Hay categorías que deberíamos agregar?**
La lista del enunciado ya es extensa y cubre lo esencial. Yo añadiría
explícitamente una sección **"Inicio / Resumen"** como portada del Design
Studio (ya está contemplada en la estructura pedida, sección A) — es la pieza
que falta para que el conjunto se sienta como un lugar y no como una lista de
ajustes sueltos.

**¿Hay algo que sobra o puede confundir?**
El riesgo no es "sobra algo" sino "todo junto, de golpe, abruma". Por eso la
organización en secciones + niveles (básico/avanzado) importa más que el
catálogo de opciones en sí. Un usuario nuevo no debería ver 16 categorías el
primer día — debería ver 3–4 con una invitación clara a explorar más.

**¿Cómo organizarlo para que sea poderoso pero no abrumador?**
Con una estructura de **dos velocidades**: una "vista esencial" (Marca,
Apariencia, Dashboard, Navegación — lo que el 90% usará) siempre visible, y un
modo "Avanzado" donde vive lo profundo (layouts libres, reglas por rol/sucursal,
versiones, IA, API de temas) — accesible pero no impuesto.

**¿Qué debería ver primero un usuario normal?**
Un resumen de su espacio actual ("así se ve tu nelzzon hoy"), accesos directos
a lo más probable que quiera tocar (tema, dashboard, dock), y una invitación a
"explorar plantillas" si no sabe por dónde empezar.

**¿Qué debería quedar en modo avanzado?**
Layout libre / canvas, reglas de personalización por rol/sucursal/usuario,
historial de versiones y auditoría, exportar/importar configuración, y la IA de
personalización en su forma más profunda (acciones que reescriben varias
secciones a la vez).

---

## 1. Visión de Personalizar

Personalizar **no es un panel de ajustes**: es el centro donde nelzzon deja de
ser "un software" y se convierte en "el sistema de esa clínica, ese despacho,
ese estudio". Es, simultáneamente:

- **Design Studio de nelzzon** — el taller visual donde se define identidad y
  estilo.
- **Modo edición visual** — una forma de "entrar" a ajustar la interfaz, no
  solo de leer ajustes en una lista.
- **Centro de marca** — logo, colores, voz, presencia ante el paciente.
- **Constructor de dashboard** — qué ve cada quién al entrar, y cómo.
- **Configurador de navegación** — cómo se mueve cada usuario por su nelzzon
  (sidebar, topbar, dock, accesos, búsqueda).
- **Configurador de módulos** — qué módulos están activos, visibles, agrupados,
  destacados, en preparación.
- **Configurador del portal cliente/paciente** — la cara de la clínica ante
  quienes la visitan.
- **Motor futuro de plantillas por profesión** — el "vestido" que cada
  vertical (dental, veterinaria, estética, legal…) trae de fábrica y puede
  adaptar.
- **Motor futuro de personalización en capas** — por usuario, por rol, por
  sucursal y por organización, sin que esas capas choquen entre sí.

La promesa central: **"convierte nelzzon en tu propio sistema"** — sin que eso
implique romper nada, perder el control, ni sentirse perdido.

---

## 2. Principios UX

1. **Mucho poder, poca confusión** — cada opción nueva se acompaña de
   contexto: para qué sirve, a quién afecta, qué pasa si la cambio.
2. **Simple al inicio, avanzado cuando el usuario lo pida** — vista esencial
   por defecto; profundidad accesible bajo "Avanzado", nunca impuesta.
3. **Nada de botones falsos** — si un control no hace nada todavía, lo dice
   (con un estado declarado), no finge.
4. **Todo indica su estado**: *Activo · Vista previa local · Próximamente ·
   Requiere motor de personalización · Requiere permisos admin · Bloqueado por
   plan · Solo organización · Solo usuario · Afecta al portal · Afecta a
   todos.*
5. **Vista previa antes de guardar** — siempre se puede ver el resultado en
   contexto antes de confirmar.
6. **Deshacer** — toda acción de personalización es reversible en el momento.
7. **Restaurar default** — siempre existe un camino de regreso al estado de
   fábrica, claro y sin penalización.
8. **Versiones** — los cambios de alcance organización/portal quedan
   historiados; se puede ver qué cambió, quién y cuándo, y volver atrás.
9. **No romper permisos** — la personalización nunca otorga ni quita acceso a
   datos; solo cambia presentación dentro de lo que el rol ya puede ver.
10. **No ocultar información crítica sin advertencia** — si una preferencia
    oculta algo importante (p. ej. un widget de cobros pendientes), el sistema
    lo señala antes de aplicar.
11. **No afectar legibilidad** — cualquier combinación elegida pasa controles
    mínimos de contraste y tamaño; el sistema advierte o ajusta si hace falta.
12. **No hacer lento el sistema** — la personalización es presentacional y
    ligera; nunca debe degradar el rendimiento de las pantallas operativas
    (agenda, consulta, cobros).

---

## 3. Estructura del Design Studio

Organización por secciones navegables (rail/menú interno + contenido), con una
portada que ancla todo:

| # | Sección | Rol |
|---|---|---|
| A | **Inicio / Resumen** | Portada: estado actual, atajos, invitación a explorar |
| B | **Marca** | Logo, colores corporativos, nombre visible, firma visual |
| C | **Apariencia** | Tema, estilo general, intensidad visual, sombras/bordes |
| D | **Fondos e imágenes** | Imágenes propias, galerías, patrones, gradientes |
| E | **Tipografías** | Familia, escala, pesos, estilo (clínico/creativo/corporativo) |
| F | **Dashboard** | Layout, widgets/KPIs visibles, orden, vistas por rol |
| G | **Widgets** | Detalle por widget: agregar, quitar, configurar, fuente |
| H | **Navegación** | Sidebar, topbar, dock, buscador, accesos, favoritos |
| I | **Módulos** | Mostrar/ocultar/agrupar/renombrar, estado por módulo |
| J | **Iconos y estilo visual** | Biblioteca de íconos, emojis, color, forma |
| K | **Interacciones** | Animaciones, hover, drag/drop, reducir movimiento |
| L | **Portal cliente/paciente** | Branding y visibilidad del portal externo |
| M | **Plantillas** | Plantillas por profesión/estilo, guardar/duplicar/exportar |
| N | **Accesibilidad** | Contraste, tamaño de letra, modo lectura, atajos |
| O | **Avanzado** | Reglas por rol/sucursal/usuario, versiones, auditoría, API |
| P | **IA de personalización** | Asistente de diseño conversacional (futuro) |

**Vista esencial vs. avanzada**: A–C, F, H, I y N son lo que un usuario normal
explorará primero. D, E, G, J, K, L, M viven "una capa más adentro" (siguen
siendo fáciles de encontrar, no escondidas). O y P son explícitamente
"avanzado / futuro".

---

## 4. Opciones extensas por sección

### B. Marca
Logo, isotipo, nombre visible, colores corporativos, paletas derivadas, banco
de assets de marca, firma visual (frase/lema), branding externo (qué ve el
público), aplicación del branding al portal.

### C. Apariencia
Tema claro/oscuro/automático; estilos curados (profesional, clínico, creativo,
glass, minimalista, premium); ajuste de colores dentro del tema; intensidad de
sombras; estilo de bordes; escala de radios; densidad/espaciado; "intensidad
visual" general (sobrio ↔ expresivo).

### D. Fondos e imágenes
Subir imagen propia, galería curada, fondo específico para dashboard / módulo /
portal, imagen "hero" de portada, patrones, gradientes, control de opacidad y
blur, contraste automático (el sistema ajusta texto/overlay para mantener
legibilidad), reglas de legibilidad explicadas al usuario.

### E. Tipografías
Fuente principal y secundaria (de un set curado), fuente para cifras/números
(tabular, legible en finanzas y agenda), tamaño base, escala tipográfica,
pesos disponibles, tracking, line-height, "personalidad" tipográfica
(corporativo / creativo / clínico).

### F. Dashboard
Widgets y KPIs visibles, orden, tamaño, distribución por columnas o libre
(grid con snap), vistas por rol (dueño, operativo, financiero, clínico,
comercial, recepción), por sucursal y por profesión; capacidad futura de
arrastrar/soltar y redimensionar.

### G. Widgets
Agregar, quitar, renombrar, elegir color e ícono, tamaño, ubicación, fuente de
datos, estado vacío, alerta visual, marcado como bloqueado/próximamente/solo
admin.

### H. Navegación
Sidebar (orden, compacto/expandido, mostrar/ocultar secciones), topbar
(elementos visibles), dock (accesos, orden, posición, abierto/cerrado por
defecto), buscador (alcance, atajos), favoritos y recientes.

### I. Módulos
Mostrar, ocultar, ordenar, agrupar, renombrar, cambiar ícono/color/fondo,
estilo de tarjeta, agregar/quitar del dock, marcar como favorito, y declarar su
estado (activo, en preparación, bloqueado por plan, oculto por permiso,
recomendado por IA).

### J. Iconos y estilo visual
Biblioteca de íconos (lineales, rellenos, estilo "glass"), emojis, iniciales,
posibilidad futura de SVG propio, color, tamaño, forma del contenedor;
aplicable por módulo, widget y portal.

### K. Interacciones
Hover, animaciones, transiciones, modo estático vs. interactivo, soporte de
"reducir movimiento", drag and drop, resize, paneles flotantes, snap, vista
previa instantánea, microinteracciones.

### L. Portal cliente/paciente
Logo, colores, tipografía y fondo propios, mensaje de bienvenida, tono
(formal/amigable/clínico/premium), visibilidad de citas/documentos/pagos/
avances/presupuestos, branding por organización, vista móvil, permisos de
visibilidad por tipo de información.

### M. Plantillas
Plantillas por profesión (dental, veterinaria, legal, belleza, arquitectura,
contable…) y por estilo (clínica premium, despacho formal, negocio creativo,
minimalista…), variantes por rol/sucursal, y acciones de
guardar/duplicar/exportar/importar/restaurar.

### N. Accesibilidad
Tamaño de letra, alto contraste, reducir movimiento, modo lectura, botones
grandes, densidad cómoda/compacta, optimización móvil, atajos de teclado,
labels claros, validación automática de contraste.

### O. Avanzado
Modo edición, layout libre, reglas de personalización por rol/sucursal/usuario,
versiones e historial, auditoría ("quién cambió qué"), restaurar versión
anterior, bloqueo por administrador, límites por plan, exportar/importar
configuración completa, API futura de temas.

### P. IA de personalización
Comandos conversacionales de asistencia: "hazlo más premium / más clínico / más
juvenil / más corporativo", "organiza mi dashboard", "oculta lo que no uso",
"recomiéndame widgets", "crea una vista para recepción / dueño / doctor",
"mejora la legibilidad", "reduce la saturación visual".

---

## 5. Estados obligatorios (badges)

Todo control de Personalizar debe declarar uno de estos estados, de forma
visible y consistente (mismo componente de badge en toda la experiencia):

- **Activo** — el cambio se aplica de verdad, ahora.
- **Vista previa local** — se puede probar, no se guarda ni se aplica fuera de
  esta sesión/lienzo.
- **Próximamente** — la función todavía no existe; no es accionable.
- **Requiere motor de personalización** — depende de persistencia futura
  (backend) que aún no existe.
- **Requiere permisos admin** — solo visible/accionable para owner/admin.
- **Bloqueado por plan** — visible como aspiración, no accionable en el plan
  actual.
- **Solo organización** — el cambio afecta a toda la organización, no solo a
  quien lo hace.
- **Solo usuario** — el cambio es individual, no afecta a nadie más.
- **Afecta portal** — el cambio es visible para pacientes/clientes externos.
- **Afecta a todos** — el cambio tiene alcance amplio (organización, sucursal
  o portal) y debe pedir confirmación explícita antes de aplicarse.

---

## 6. Permisos futuros

**Roles a considerar para personalización** (alineados con CLAUDE.md §4.4 —
RBAC `recurso.acción`):
- owner
- admin
- usuario individual
- recepción
- doctor / clínico
- cobranza
- invitado
- staff externo

**Capas/alcances de personalización** (deben poder coexistir sin chocar):
- **Personal** — preferencias propias del usuario (tema, densidad, dashboard
  propio). Disponible para cualquier rol con sesión.
- **Organización** — branding, paletas, plantilla base, reglas globales. Solo
  owner/admin.
- **Sucursal** — variaciones para organizaciones multi-sede. Owner/admin (y
  posiblemente un rol de "gerente de sucursal" futuro).
- **Rol** — vistas/dashboards recomendados u obligatorios por rol (p. ej.
  "todos los de recepción ven esta vista de agenda por defecto"). Owner/admin.
- **Portal** — todo lo visible hacia pacientes/clientes externos. Owner/admin
  exclusivamente, por ser superficie de marca pública.

**Regla de resolución de conflictos** (a definir con precisión en fase de
implementación): cuando existan capas superpuestas, la preferencia personal del
usuario debe poder *anidarse* sobre la base de organización/rol — nunca
contradecir reglas de seguridad o permisos (RBAC manda siempre sobre estética).

---

## 7. Riesgos técnicos y UX

- **Saturación visual**: 16 secciones es mucho — mitigar con vista esencial +
  avanzado, portada-resumen, y progresividad (mostrar lo siguiente cuando el
  usuario domina lo actual).
- **Demasiadas opciones**: preferir paramétrico-curado (plantillas + ajustes
  acotados) sobre libertad total — más poder percibido con menos riesgo real.
- **Fondos que rompen lectura**: validador de contraste obligatorio antes de
  aplicar cualquier imagen/color de fondo.
- **Tipografías ilegibles**: set curado, no fuentes arbitrarias subidas por el
  usuario (al menos no en las primeras fases).
- **CSS caótico**: todo cambio debe expresarse como tokens (CSS custom
  properties) recalculados centralmente — nunca como overrides puntuales por
  componente. Es la lección directa del bug de `--font-sans` auto-referenciado
  encontrado en DESIGN-SYSTEM-1B: un token mal definido se propaga a *toda* la
  app.
- **Rendimiento**: la personalización debe ser ligera (tokens + clases), nunca
  recalcular layouts pesados en cada render; lazy-load de vistas de
  personalización para no afectar pantallas operativas.
- **Mobile/tablet/desktop**: cada opción debe probarse en los tres — un layout
  libre que luce bien en desktop puede romperse en móvil.
- **Dark mode**: cualquier branding/imagen/color personalizado debe tener
  comportamiento definido en modo oscuro (no asumir que "se ve bien en claro,
  entonces se ve bien en oscuro").
- **Permisos**: la personalización nunca debe ser una puerta trasera para ver
  u ocultar datos fuera de lo que el rol ya permite.
- **Auditoría**: cambios de alcance organización/portal deben quedar
  registrados (quién, qué, cuándo) sin texto libre sensible — igual que el
  resto del sistema (CLAUDE.md §4.5).
- **Rollback**: todo cambio de alcance amplio necesita un camino de regreso
  claro y rápido (versiones + restaurar default).
- **Drag & drop complejo**: alto costo de implementación y de QA — dejarlo para
  una fase madura (3A/3B), después de validar la necesidad con preview
  estático.
- **Conflictos por rol**: necesitar reglas claras de resolución cuando
  organización, rol y usuario proponen configuraciones distintas para el mismo
  elemento.
- **Seguridad al ocultar módulos**: "ocultar" un módulo es presentación, no
  permiso — debe quedar explícito que ocultar ≠ revocar acceso, para que nadie
  asuma seguridad donde solo hay preferencia visual.

---

## 8. Datos futuros necesarios (solo documentación — NO se crean migraciones)

- `organization_theme_settings` — tema/branding a nivel organización.
- `user_theme_preferences` — preferencias visuales individuales.
- `dashboard_layouts` — disposición de dashboard por usuario/rol/sucursal.
- `widget_preferences` — qué widgets, en qué orden, con qué configuración.
- `dock_preferences` — accesos y orden del dock por usuario/rol.
- `sidebar_preferences` — estado y configuración de navegación lateral.
- `topbar_preferences` — elementos visibles/orden de la barra superior.
- `portal_branding` — identidad visual del portal cliente/paciente.
- `module_display_settings` — visibilidad, orden, agrupación de módulos.
- `uploaded_brand_assets` — logos, imágenes, assets subidos por la organización.
- `personalization_versions` — historial de versiones de configuración.
- `personalization_audit_logs` — auditoría de quién cambió qué y cuándo
  (sin texto libre ni datos sensibles, igual que `audit_logs` hoy).

> Nota: cualquier diseño real de estas tablas requerirá nueva migración
> aditiva, políticas RLS (`organizationId` + FORCE), y permisos RBAC
> (`personalization.*`) — y por tanto aprobación explícita de Oscar conforme a
> CLAUDE.md §4 antes de tocar esquema.

---

## 9. Fases recomendadas

| Fase | Objetivo |
|---|---|
| **0A** | Documento maestro (este documento) |
| **0B** | Wireframe textual del panel Personalizar (estructura de pantallas y navegación interna) |
| **0C** | Rediseño visual del panel sin funcionalidad real (solo presentación, "casa" del Design Studio) |
| **1A** | Preview local de tema visual (colores aplicados en vivo, sin guardar) |
| **1B** | Preview local de fondos/gradientes/imágenes "fake" (assets de muestra) |
| **1C** | Preview local de tipografía/densidad |
| **1D** | Preview local de dock/sidebar/topbar (reordenar/ocultar en un lienzo de prueba) |
| **1E** | Preview local de widgets visibles (agregar/quitar/reordenar en maqueta) |
| **1F** | Biblioteca de íconos visual (explorar y elegir, sin aplicar todavía) |
| **2A** | Guardar preferencias de usuario (primera persistencia — requiere aprobación de esquema) |
| **2B** | Guardar preferencias de organización |
| **2C** | Permisos y auditoría de personalización |
| **3A** | Drag and drop de dashboard |
| **3B** | Resize de widgets |
| **3C** | Plantillas por profesión |
| **4A** | Personalización del portal |
| **5A** | IA de personalización |

Cada fase de la "0" y la "1" es **puramente visual/local** (sin backend); la
"2" en adelante requiere persistencia y, por tanto, diseño de esquema +
aprobación explícita conforme a las reglas no-negociables del proyecto.

---

## 10. Opinión profesional del diseñador

**Qué agregaría**: una portada-resumen que cuente "así se ve tu nelzzon hoy" y
sugiera el siguiente paso; un lienzo de vista previa unificado (ver el cambio
en contexto, no en abstracto); un sistema de plantillas como atajo emocional
("empieza por algo que ya se ve increíble y ajústalo a tu gusto" es más
poderoso que "empieza desde cero").

**Qué quitaría**: el patrón actual de "popover pequeño en la esquina" como
única casa de Personalizar — no soporta la ambición de "Design Studio"; merece
una superficie propia (panel grande, vista dedicada, o modal expansivo).

**Qué priorizaría**: Marca y Apariencia primero (impacto emocional inmediato:
"esto ya se siente mío" desde el primer minuto), luego Dashboard y Navegación
(impacto operativo diario), y dejar Portal/Plantillas/IA para cuando la base
esté sólida y persistente.

**Qué NO implementaría todavía**: layout libre tipo canvas, drag&drop completo,
fuentes/colores 100% libres, e IA conversacional — todo esto exige una base de
persistencia, validación y QA que hoy no existe; intentarlo antes de tiempo
generaría exactamente la sensación de "maqueta rota" que se quiere evitar.

**Cómo evitar que se vea maqueta**: que cada control declare su estado con
honestidad (ver sección 5) Y que lo que **sí** funciona (preview local, tokens
en vivo, exploración de plantillas) se sienta pulido, inmediato y satisfactorio
— mejor pocas cosas que se sienten reales que muchas que aparentan.

**Cómo lograr que el usuario sienta control real sin sentirse perdido**: dos
velocidades (esencial / avanzado), vista previa siempre visible, y caminos de
regreso siempre a mano (deshacer, restaurar, versiones) — el control se siente
real cuando el usuario sabe que **nada que toque puede romper algo sin remedio**.

---

## 11. Principio no negociable — Experiencia única

**¿Esto se sentiría único para un dentista, abogado, arquitecto, clínica
estética o despacho?**
Solo si las plantillas y el branding realmente *hablan su idioma*: un
dentista quiere sentirse clínico y confiable; un despacho legal, formal y
sobrio; un estudio de arquitectura, minimalista y elegante; una clínica
estética, cálida y premium. Eso no lo logra un selector de 4 colores — lo
logra un sistema de plantillas curadas por profesión que combine paleta, tono
de voz, iconografía y densidad como un conjunto coherente, listo para usarse y
fácil de afinar.

**¿Qué haría que el usuario diga "este sistema es mío"?**
Ver su logo en el lugar correcto desde el primer momento; abrir su dashboard y
encontrar exactamente lo que necesita primero; que el portal que ven sus
pacientes luzca con su marca, no con la de "otro software". La suma de
pequeños reconocimientos — "esto está donde yo lo dejé", "esto se ve como yo
lo quise" — es lo que construye pertenencia.

**¿Qué falta para que no parezca otro SaaS genérico?**
Una identidad propia de *cómo se siente* personalizar en nelzzon — no un menú
de ajustes clonado de otro producto, sino un recorrido con voz propia: portada
que invita, plantillas que inspiran, vista previa que sorprende gratamente, y
un tono de microcopy cálido y profesional (coherente con "poderoso por dentro,
simple por fuera" de CLAUDE.md §1).

**¿Qué interacción, detalle visual o flujo lo haría memorable?**
Un "antes/después" instantáneo al aplicar una plantilla (transición suave que
deja ver el cambio, no un salto brusco); un resumen visual de "tu espacio" en
la portada que se siente como una "tarjeta de identidad" del negocio; un
asistente (eventualmente IA) que sugiere mejoras con tono de colega experto,
no de robot genérico.

**¿Qué evitar para que no se vuelva confuso o infantil?**
Evitar saturar con iconografía/emojis/colores sin propósito (la línea entre
"vivo" y "infantil" es fina — la marca tono de microcopy debe ser profesional,
cálida, nunca caricaturesca); evitar literal "modo edición" sin guías claras
(arrastrar cosas sin contexto genera ansiedad, no diversión); evitar mostrar
docenas de controles a la vez sin agrupar — la sensación de control se pierde
exactamente en el punto donde empieza el ruido visual.
