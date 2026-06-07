# NELZZON · PERSONALIZAR — Wireframe Textual

> Versión 1 · Fase NELZZON-PERSONALIZAR-MASTER-0B
> Este documento traduce `docs/NELZZON_PERSONALIZAR_MASTER.md` en un wireframe
> textual accionable. NO implementa nada, NO modifica componentes. Es el plano
> que guiará el rediseño visual de la fase 0C (sin funcionalidad real) y las
> fases de preview local 1A–1F.

---

## 0. Contexto de partida

Este wireframe parte de lo declarado en `NELZZON_PERSONALIZAR_MASTER.md`:
Personalizar debe convertirse en un **Design Studio / Centro de Control Visual
y Operativo**, hoy implementado como un popover pequeño (`PersonalizationPanel`)
con dos controles que no propagan ningún cambio real:

- `PersonalizationPreviewToggle` — selector de "modo de vista" (Plano /
  Interactivo / Edición); cambia un estado que ningún componente lee.
- `VisualStylePreview` — 4 tarjetas de muestra de color; la selección no sale
  del propio componente.

Se abre desde dos puntos (botón "Personalizar" en `AppTopbar`, y entrada
"Personalizar" en `AppSidebar`), ambos controlados por `personalizationOpen`
en `AppShell`, y se renderiza como un panel flotante anclado a
`fixed right-4 top-16`. El "Catálogo de módulos" (`ModuleCatalog`) vive en un
flujo paralelo, abierto desde "Agregar" en `AppDock` — fuera del panel de
Personalizar, aunque conceptualmente debería ser una de sus secciones.

`DashboardKpiGrid` y `DashboardWidgetGrid` son grids presentacionales con datos
`MOCK_*` fijos — no leen ninguna preferencia, así que hoy no existe ningún
"lienzo" que un futuro panel de Personalizar pueda usar como vista previa en
contexto.

---

## 1. Entrada a Personalizar

### Desde dónde se abre hoy
- Botón **"Personalizar"** en `AppTopbar` (ícono `Sparkles`, badge de estado
  "vista previa" en su `title`).
- Entrada **"Personalizar"** al pie del menú expandido de `AppSidebar`.
- Ambos abren/cierran el mismo `personalizationOpen` en `AppShell`.

### ¿Panel lateral, modal grande, página completa o modo edición?

**Recomendación profesional del diseñador: panel lateral grande (drawer),
con posibilidad de expandirse a vista completa.**

Razonamiento:
- Un **popover pequeño** (lo actual) no soporta la ambición de "Design Studio"
  — se siente como un menú de ajustes, no como un taller.
- Un **modal centrado** interrumpe el contexto: tapa el contenido y obliga a
  cerrar para ver el resultado — mal encaje con "vista previa en contexto".
- Una **página completa dedicada** (`/personalizar`) es poderosa pero rompe el
  flujo: el usuario "sale" de su trabajo para entrar a configurar, lo cual es
  correcto para sesiones largas de diseño pero incómodo para ajustes rápidos.
- Un **drawer lateral grande** (ocupa ~38–46% del ancho en desktop, desde el
  borde derecho) resuelve ambos mundos: el contenido operativo permanece
  visible y "vivo" detrás (sirviendo de vista previa real, no simulada), y el
  usuario siente que está *ajustando su espacio* sin abandonarlo.

**Patrón híbrido recomendado**:
1. **Modo rápido** (drawer lateral) — para ajustes frecuentes: tema, modo
   claro/oscuro, accesos del dock, densidad. Vive sobre el contenido actual,
   que sigue siendo la vista previa viva.
2. **Modo estudio** (vista expandida a pantalla completa / ruta dedicada) —
   accesible con un botón "Abrir Design Studio completo" dentro del drawer,
   para sesiones de personalización profundas (Marca, Plantillas, Portal,
   Avanzado). Aquí el lienzo de vista previa se vuelve protagonista (mockup
   interactivo del dashboard/portal, no la app real).

Esta combinación evita dos errores opuestos: un panel tan chico que no cabe el
"Design Studio" prometido, y una experiencia tan grande/intrusiva que se sienta
como salir de nelzzon para "ir a configurarlo".

---

## 2. Estructura principal del Design Studio

### Header
- Título **"Personalizar tu nelzzon"** (o el nombre que se decida para la
  experiencia) + badge de estado general ("Vista previa" mientras no haya
  motor de persistencia).
- Indicador de alcance activo: *"Editando: tu vista personal"* /
  *"Editando: toda la organización"* — crítico para que el usuario sepa a
  quién afecta lo que está por tocar (principio "no afectar a todos sin
  advertencia").
- Botón de cierre, y — en modo estudio — botón para volver al modo rápido.

### Buscador de personalización
- Campo de búsqueda dentro del propio Design Studio: *"Busca un ajuste — logo,
  color, dashboard, dock…"*. Permite saltar directo a una sección/control sin
  navegar el árbol completo — imprescindible cuando existan 16 secciones.
- Resultados agrupados por sección, mostrando también su estado (Activo /
  Próximamente / Requiere admin, etc.) para no generar expectativas falsas
  desde la búsqueda misma.

### Secciones principales
Rail de navegación interna (columna izquierda) con las 16 secciones definidas
en el documento maestro (Inicio, Marca, Apariencia, Fondos e imágenes,
Tipografías, Dashboard, Widgets, Navegación, Módulos, Iconos, Interacciones,
Portal, Plantillas, Accesibilidad, Avanzado, IA), agrupadas visualmente en dos
bloques: **Esencial** (siempre visible) y **Más opciones** (expandible) —
ver detalle de agrupación en la sección 4 de este documento.

### Vista previa
- En **modo rápido** (drawer): la vista previa *es* el contenido real detrás
  del drawer — los cambios de tema/densidad se podrían reflejar en vivo sobre
  la app (cuando exista el motor de preview local de la fase 1A).
- En **modo estudio** (pantalla completa): un **lienzo dedicado** — un mockup
  interactivo del dashboard, del portal, o de la sección que se esté editando
  — donde se prueban combinaciones sin afectar la app real hasta "Aplicar".
- El lienzo siempre debe poder alternar entre 2–3 contextos de muestra
  (Dashboard / Portal / Módulo) para que el usuario vea el efecto donde más le
  importa.

### Acciones globales
Barra de acciones persistente (pie del panel o del lienzo):
- **Vista previa** (ya aplicada mientras se ajustan controles — no requiere
  botón aparte, es continua).
- **Guardar** — confirma el cambio (cuando exista motor de persistencia;
  mientras tanto, declarado como "Requiere motor de personalización").
- **Descartar** — vuelve al último estado guardado / al estado antes de abrir
  la sesión de edición.
- **Restaurar valores de fábrica** — vuelve al default de nelzzon, con
  confirmación explícita si el alcance es de organización/portal.
- **Deshacer / Rehacer** — historial corto de la sesión actual (no requiere
  backend: puede vivir en memoria/sessionStorage durante la fase de preview
  local).
- **Historial de versiones** — solo visible en alcance organización/portal y
  en modo "Avanzado"; "Requiere motor de personalización".

---

## 3. Layout recomendado

### Desktop (modo estudio — pantalla completa o drawer expandido)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header: "Personalizar tu nelzzon"  ·  [Editando: mi vista]  [Buscar]  │
├───────────────┬───────────────────────────────┬──────────────────────┤
│  CATEGORÍAS   │   CONTROLES DE LA SECCIÓN     │   VISTA PREVIA       │
│               │                               │                      │
│  ● Inicio     │  Marca                        │  ┌────────────────┐  │
│  ● Marca      │  ─────────────────────────    │  │  [lienzo vivo  │  │
│  ○ Apariencia │  Logo            [subir] 🔒   │  │   o mockup]    │  │
│  ○ Fondos     │  Nombre visible  [_______]    │  │                │  │
│  ○ Tipografía │  Colores         ●●●●  [+]    │  │  Dashboard ▾   │  │
│  ○ Dashboard  │  Firma visual    [_______]    │  └────────────────┘  │
│  ○ Widgets    │                               │                      │
│  ○ Navegación │  [Activo] [Vista previa]      │  Alternar contexto:  │
│  ○ Módulos    │  [Solo admin] [Afecta a todos]│  Dashboard / Portal  │
│  ───────────  │                               │  / Módulo            │
│  Más opciones │                               │                      │
│  ○ Iconos     │                               │                      │
│  ○ Interac.   │                               │                      │
│  ○ Portal     │                               │                      │
│  ○ Plantillas │                               │                      │
│  ○ Accesib.   │                               │                      │
│  ○ Avanzado   │                               │                      │
│  ○ IA         │                               │                      │
├───────────────┴───────────────────────────────┴──────────────────────┤
│  [Restaurar default]      [Deshacer]   [Descartar]      [Guardar]    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Columna izquierda (categorías)**: rail compacto con las 16 secciones,
  agrupadas en "Esencial" y "Más opciones"; cada ítem puede llevar un badge
  pequeño de estado (p. ej. punto de color para "tiene cambios sin guardar").
- **Centro (controles)**: el contenido de la sección activa, organizado en
  grupos con encabezados claros, cada control con su badge de estado visible
  (ver sección 7).
- **Derecha (vista previa)**: lienzo con selector de contexto (Dashboard /
  Portal / Módulo / Dock…), para ver el efecto del cambio donde más importa.

### Drawer lateral (modo rápido — uso diario)

```
                              ┌───────────────────────────┐
                              │ Personalizar  [Vista previa]│
                              │ Editando: mi vista          │
                              ├───────────────────────────┤
  (contenido real de la app   │ Tema      ○ Claro ● Auto   │
   detrás, sirviendo de       │ Estilo    [Clínico ▾]      │
   vista previa en vivo)      │ Densidad  ○ Cómoda ● Compacta│
                              │ Dock      [editar accesos] │
                              │ Dashboard [editar widgets] │
                              │                            │
                              │ → Abrir Design Studio      │
                              ├───────────────────────────┤
                              │ [Restaurar]  [Deshacer] [Guardar]│
                              └───────────────────────────┘
```

### Alternativa móvil / tablet

- El drawer lateral se convierte en una **hoja inferior (bottom sheet)**
  deslizable, igual que ya hace `ModuleCatalog` (`items-end … sm:items-center`)
  — patrón ya validado en el proyecto.
- El "modo estudio" en móvil colapsa a **una sola columna con navegación por
  pasos**: 1) elegir sección (lista) → 2) ajustar controles → 3) ver vista
  previa (pantalla dedicada, alternable con un tab "Editar / Vista previa").
- El buscador de personalización se mantiene fijo arriba en todas las
  resoluciones — es el atajo más valioso cuando el espacio es reducido.
- Las acciones globales (`Guardar` / `Descartar` / `Restaurar`) se anclan al
  pie de la pantalla, siempre visibles, sin necesidad de hacer scroll.

---

## 4. Secciones del panel

Agrupación recomendada para no abrumar (principio "simple al inicio, avanzado
cuando el usuario lo pida"):

**Bloque "Esencial"** (siempre visible primero): Inicio, Marca, Apariencia,
Dashboard, Navegación, Módulos, Accesibilidad.

**Bloque "Más opciones"** (un clic más adentro, no escondido): Fondos e
imágenes, Tipografías, Widgets, Iconos, Interacciones, Portal, Plantillas.

**Bloque "Avanzado"** (declarado como tal, con su propio acceso): Avanzado, IA.

---

## 5. Detalle por sección

Para cada sección: qué ve el usuario, controles básicos vs. avanzados, qué
queda "Próximamente", qué requiere motor futuro / permisos admin / backend.

### A. Inicio
- **Ve**: una "tarjeta de identidad" de su espacio — captura visual de su
  dashboard actual, resumen de su tema/branding activo, accesos directos a
  "Marca", "Apariencia" y "Dashboard", y una invitación a "Explorar
  plantillas".
- **Básico**: accesos directos, resumen de estado, atajo a plantillas.
- **Avanzado**: comparación "antes / después" de la última sesión de cambios.
- **Próximamente**: panel de sugerencias ("la IA recomienda…").
- **Requiere motor futuro**: el resumen real (hoy no hay nada que resumir —
  sería mockup/placeholder con un mensaje "así se vería tu resumen").
- **Requiere admin**: nada — la portada es universal.
- **Requiere backend**: el resumen necesita leer preferencias guardadas.

### B. Marca
- **Ve**: subir/cambiar logo e isotipo, definir nombre visible, elegir paleta
  corporativa, escribir una "firma visual" (lema/frase corta), previsualización
  de cómo se ve la marca en topbar/portal/PDF.
- **Básico**: nombre visible, selección de paleta entre opciones curadas.
- **Avanzado**: paleta 100% personalizada, banco de assets múltiples, firma
  visual con variantes por contexto (interno/portal).
- **Próximamente**: subir logo real (en preview local sería un selector de
  "logos de muestra" tipo galería, no un upload real).
- **Requiere motor futuro**: persistir y aplicar el branding en toda la app.
- **Requiere admin**: toda la sección — el branding es de organización, no
  personal.
- **Requiere backend**: almacenamiento de assets (`uploaded_brand_assets`),
  `organization_theme_settings`.

### C. Apariencia
- **Ve**: tema claro/oscuro/automático, galería de estilos curados
  (profesional, clínico, creativo, glass, minimalista, premium), control de
  intensidad visual (sobrio ↔ expresivo), vista previa en vivo del lienzo.
- **Básico**: tema claro/oscuro/automático, elegir un estilo curado.
- **Avanzado**: ajustar intensidad de sombras, estilo de bordes, escala de
  radios dentro del estilo elegido.
- **Próximamente**: nada — esta sección es la candidata ideal para el primer
  preview local real (1A), porque puede vivir 100% en tokens CSS.
- **Requiere motor futuro**: persistir la elección entre sesiones.
- **Requiere admin**: el estilo *de organización* (default para todos);
  el tema personal (claro/oscuro) es universal.
- **Requiere backend**: para persistencia más allá de la sesión.

### D. Fondos e imágenes
- **Ve**: galería curada de fondos/patrones/gradientes, selector de imagen
  "hero", controles de opacidad/blur, vista previa con validación de contraste
  visible ("este fondo podría afectar la legibilidad").
- **Básico**: elegir entre fondos/gradientes curados.
- **Avanzado**: ajustar opacidad/blur, combinar imagen + overlay de color.
- **Próximamente**: subir imagen propia (en preview local: galería de
  "imágenes de muestra").
- **Requiere motor futuro**: persistencia + aplicación real por contexto
  (dashboard / módulo / portal).
- **Requiere admin**: fondos de alcance organización/portal; fondos
  *personales* podrían no requerir admin.
- **Requiere backend**: `uploaded_brand_assets`, validación de contraste server-side.

### E. Tipografías
- **Ve**: selector de familia (set curado), escala de tamaño, pesos
  disponibles, "personalidad" tipográfica (corporativo/creativo/clínico),
  muestra en vivo con texto real de la app (KPI, título, párrafo).
- **Básico**: elegir familia entre opciones curadas, tamaño base.
- **Avanzado**: escala completa, tracking, line-height, fuente para cifras.
- **Próximamente**: subir fuente propia (fuera de alcance por calidad/legibilidad).
- **Requiere motor futuro**: persistencia y aplicación global vía tokens.
- **Requiere admin**: tipografía de organización; tamaño/accesibilidad personal
  no requiere admin (vive en sección N).
- **Requiere backend**: para persistencia entre sesiones/dispositivos.

### F. Dashboard
- **Ve**: lienzo del dashboard con sus widgets/KPIs actuales, controles para
  mostrar/ocultar, reordenar (lista con flechas/asas — no drag real todavía),
  elegir entre layouts predefinidos (1, 2 o 3 columnas), seleccionar "vista por
  rol" si aplica.
- **Básico**: mostrar/ocultar widgets, elegir layout predefinido.
- **Avanzado**: vistas por rol/sucursal/profesión, orden fino.
- **Próximamente**: drag and drop real, canvas libre, redimensionar.
- **Requiere motor futuro**: persistir `dashboard_layouts` / `widget_preferences`.
- **Requiere admin**: vistas *recomendadas u obligatorias* por rol/sucursal;
  el propio dashboard personal no requiere admin.
- **Requiere backend**: toda persistencia más allá de la sesión.

### G. Widgets
- **Ve**: lista de widgets disponibles con su estado (visible/oculto,
  bloqueado, en preparación), controles para renombrar, elegir color/ícono,
  ajustar tamaño, ver su fuente de datos.
- **Básico**: mostrar/ocultar, reordenar en lista.
- **Avanzado**: renombrar, color/ícono propio, tamaño.
- **Próximamente**: redimensionar libremente, widgets de terceros.
- **Requiere motor futuro**: `widget_preferences`.
- **Requiere admin**: widgets marcados "solo admin" (p. ej. financieros
  sensibles) — el resto es personal.
- **Requiere backend**: persistencia de configuración por widget.

### H. Navegación
- **Ve**: vista de sidebar/topbar/dock con sus elementos actuales, controles
  para mostrar/ocultar accesos, reordenar, elegir si el dock abre por defecto,
  configurar el alcance del buscador, marcar favoritos/recientes.
- **Básico**: mostrar/ocultar accesos del dock y del sidebar, orden básico.
- **Avanzado**: configuración fina de topbar, comportamiento del buscador,
  favoritos/recientes personalizados.
- **Próximamente**: reordenar por arrastre, posiciones alternativas del dock.
- **Requiere motor futuro**: `dock_preferences`, `sidebar_preferences`,
  `topbar_preferences`.
- **Requiere admin**: reglas de navegación *por rol* (qué ve cada quién por
  defecto); la personalización individual no requiere admin.
- **Requiere backend**: persistencia entre sesiones/dispositivos.

### I. Módulos
- **Ve**: la "Biblioteca de módulos" integrada aquí (hoy vive separada en
  `ModuleCatalog`) — lista agrupada por categoría con su estado declarado
  (Activo / Ya en tu dock / En preparación / Próximamente), controles para
  mostrar/ocultar, agrupar, marcar favorito, agregar/quitar del dock.
- **Básico**: mostrar/ocultar, marcar favorito, agregar/quitar del dock
  (vista previa local, como ya existe).
- **Avanzado**: agrupar, renombrar, cambiar ícono/color/fondo por módulo.
- **Próximamente**: módulos recomendados por IA, estilos de tarjeta custom.
- **Requiere motor futuro**: `module_display_settings`.
- **Requiere admin**: ocultar módulos *para todos* / bloquear por plan; la
  preferencia personal de mostrar/ocultar no requiere admin.
- **Requiere backend**: persistencia de la configuración elegida.

### J. Iconos y estilo visual
- **Ve**: galería de íconos (lineales/rellenos/glass), selector de emojis,
  iniciales como alternativa, controles de color/tamaño/forma del contenedor,
  vista previa aplicada a un módulo de muestra.
- **Básico**: elegir entre sets curados de íconos, color del contenedor.
- **Avanzado**: combinaciones por módulo/widget/portal, formas de contenedor.
- **Próximamente**: subir SVG propio.
- **Requiere motor futuro**: persistencia y aplicación real.
- **Requiere admin**: íconos de alcance organización/portal.
- **Requiere backend**: para guardar selección y, eventualmente, assets propios.

### K. Interacciones
- **Ve**: selector de "movimiento" (estático/sutil/expresivo), toggle de
  "reducir movimiento", vista previa de microinteracciones (hover, transición),
  explicación de qué activa cada modo.
- **Básico**: estático/interactivo, reducir movimiento.
- **Avanzado**: ajuste fino de animaciones/transiciones por superficie.
- **Próximamente**: drag and drop, resize, paneles flotantes configurables.
- **Requiere motor futuro**: persistencia de la preferencia.
- **Requiere admin**: nada — es enteramente personal/de accesibilidad.
- **Requiere backend**: solo para persistir entre sesiones (podría vivir en
  `localStorage` antes de tener motor real).

### L. Portal cliente/paciente
- **Ve**: vista previa del portal con su branding actual, controles de
  logo/colores/tipografía/fondo propios del portal, mensaje de bienvenida,
  selector de tono (formal/amigable/clínico/premium), checklist de qué
  información es visible (citas, documentos, pagos, avances, presupuestos).
- **Básico**: mensaje de bienvenida, tono, qué información mostrar
  (dentro de lo que el rol y el plan permiten).
- **Avanzado**: branding completo del portal, vista móvil dedicada.
- **Próximamente**: todo lo que implique aplicar branding real al portal.
- **Requiere motor futuro**: `portal_branding`.
- **Requiere admin**: la sección completa — superficie de marca pública.
- **Requiere backend**: almacenamiento de branding y reglas de visibilidad.

### M. Plantillas
- **Ve**: galería de plantillas por profesión/estilo (dental, veterinaria,
  legal, belleza, arquitectura, contable, clínica premium, despacho formal,
  negocio creativo, minimalista…), cada una con preview "antes/después",
  acciones de aplicar/guardar/duplicar/exportar/importar/restaurar.
- **Básico**: explorar y aplicar una plantilla curada (preview antes de aplicar).
- **Avanzado**: guardar variantes propias, duplicar, exportar/importar.
- **Próximamente**: crear plantillas desde cero, compartir entre sucursales.
- **Requiere motor futuro**: `personalization_versions` + almacenamiento de
  plantillas guardadas.
- **Requiere admin**: guardar/exportar plantillas de organización; explorar y
  aplicar plantillas curadas podría no requerir admin (a definir por plan).
- **Requiere backend**: toda persistencia de plantillas propias.

### N. Accesibilidad
- **Ve**: tamaño de letra, alto contraste, reducir movimiento, modo lectura,
  botones grandes, densidad cómoda/compacta, atajos de teclado, validación de
  contraste con explicación clara.
- **Básico**: tamaño de letra, alto contraste, reducir movimiento, densidad.
- **Avanzado**: modo lectura, atajos de teclado personalizados.
- **Próximamente**: nada — esta sección debería estar **disponible y funcional
  desde el primer MVP visual** (es la más alineada con "preview local real").
- **Requiere motor futuro**: persistencia entre sesiones/dispositivos (mientras
  tanto puede vivir en `localStorage`).
- **Requiere admin**: nada — universal por principio de inclusión (ver
  auditoría de producto en el documento maestro).
- **Requiere backend**: solo para sincronizar entre dispositivos.

### O. Avanzado
- **Ve**: modo edición / layout libre, reglas de personalización por
  rol/sucursal/usuario, historial de versiones, auditoría ("quién cambió
  qué"), restaurar versión anterior, límites por plan, exportar/importar
  configuración completa, mención de API futura de temas.
- **Básico**: nada — toda la sección es, por definición, avanzada.
- **Avanzado**: todo lo listado.
- **Próximamente**: layout libre / canvas, API de temas.
- **Requiere motor futuro**: `personalization_versions`,
  `personalization_audit_logs`, reglas por capa.
- **Requiere admin**: la sección completa.
- **Requiere backend**: toda ella — es, esencialmente, la superficie de
  administración del motor de personalización.

### P. IA de personalización
- **Ve**: un campo conversacional ("hazlo más premium…", "organiza mi
  dashboard…", "recomiéndame widgets…"), con ejemplos sugeridos y una
  explicación honesta de que es un adelanto de hacia dónde va nelzzon.
- **Básico**: nada — toda la sección es "Próximamente" en esta etapa.
- **Avanzado**: comandos complejos multi-sección.
- **Próximamente**: la sección completa.
- **Requiere motor futuro**: integración real con un asistente + aplicación de
  sus sugerencias sobre el motor de personalización.
- **Requiere admin**: a definir — probablemente disponible para cualquier
  usuario en su alcance personal, y solo admin para alcance organización.
- **Requiere backend**: integración de IA + todo el motor de personalización
  como prerrequisito.

---

## 6. Experiencia única — "este sistema es mío"

El wireframe construye la sensación de pertenencia mediante una cadena de
pequeños reconocimientos, no un solo "gran efecto":

- **Fondos e imágenes**: el lienzo de vista previa muestra de inmediato cómo
  el fondo elegido envuelve *su* dashboard real — no una maqueta genérica.
- **Tipografías**: la muestra en vivo usa textos reales de la app (el saludo
  del dashboard, un KPI, un nombre de módulo) — el usuario ve su propio
  contenido vestido con la tipografía elegida, no un "Lorem ipsum".
- **Iconos**: la galería se prueba sobre un módulo real de su dock/sidebar —
  "así se vería *tu* acceso a Pacientes con este ícono".
- **Módulos**: la sección "Módulos" (heredera de la Biblioteca) marca con
  honestidad qué ya vive en *su* dock — refuerza "esto ya es tuyo, esto
  podrías sumarlo".
- **Dashboard**: el lienzo es su dashboard de verdad (con datos de muestra
  donde aún no hay datos reales) — reordenar widgets se siente como ordenar
  *su* escritorio, no un demo ajeno.
- **Dock / Sidebar / Topbar**: la sección "Navegación" deja ver y tocar
  exactamente los accesos que *él* usa cada día — el reconocimiento es
  inmediato ("ahí está mi Agenda, ahí está mi Cobros").
- **Portal**: previsualizar el portal con *su* nombre, *su* color, *su* tono —
  es el momento de mayor impacto emocional: "así me ven mis pacientes".
- **Plantillas**: explorar una plantilla "Clínica dental premium" y verla
  aplicada sobre *su* contenido (no un mockup de stock) hace que la elección
  se sienta como un traje a medida, no un disfraz.
- **IA** (a futuro): cuando el asistente diga "organicé tu dashboard así
  porque veo que entras primero a Agenda", el reconocimiento deja de ser
  visual y se vuelve *personal* — el sistema demuestra que entiende cómo
  trabaja *ese* usuario.

El hilo conductor: **todo lo que se previsualiza usa el contexto real del
usuario** (su contenido, su contenido de muestra, sus accesos) — nunca un
demo genérico. Esa es la diferencia entre "elegir un tema" y "hacer mío mi
sistema".

---

## 7. Estados visuales obligatorios

Todo control del Design Studio debe declarar uno de estos estados, con un
componente de badge único y reconocible en toda la experiencia (evitando lo
detectado en la auditoría técnica: cada componente improvisando su propio
estilo de "deshabilitado"):

| Estado | Significado | Ejemplo de uso |
|---|---|---|
| **Activo** | El cambio se aplica de verdad, ahora | Tema claro/oscuro |
| **Vista previa local** | Se puede probar; no persiste fuera de la sesión | Selección de paleta (hoy) |
| **Próximamente** | No existe todavía; no accionable | Subir logo real |
| **Requiere motor** | Depende de persistencia futura (backend) | Guardar layout de dashboard |
| **Bloqueado por plan** | Visible como aspiración; no accionable en el plan actual | Branding completo del portal |
| **Solo admin** | Solo owner/admin puede verlo o accionarlo | Sección "Marca" completa |
| **Afecta a todos** | Cambia algo de alcance amplio (org/sucursal/portal); requiere confirmación | Cambiar paleta de organización |
| **Afecta solo a mí** | Cambio puramente personal, sin impacto en otros | Tema claro/oscuro propio |

Estos ocho estados cubren — y simplifican para el wireframe — los diez
declarados en el documento maestro (los dos de alcance "Solo organización" /
"Solo usuario" y "Afecta portal" quedan representados por la combinación de
"Afecta a todos" / "Afecta solo a mí" + el contexto de la sección).

---

## 8. Primer MVP visual recomendado

Para que Personalizar **deje de sentirse maqueta sin tocar backend todavía**,
el primer MVP visual debería entregar, en este orden de impacto/esfuerzo:

1. **La "casa" nueva**: reemplazar el popover por el drawer lateral grande
   (con badge de alcance, buscador de personalización, rail de secciones) —
   aunque la mayoría de las secciones empiecen mostrando "Próximamente". El
   simple cambio de continente ya eleva la percepción de "esto es serio".
2. **Sección Apariencia con preview local real** (fase 1A del documento
   maestro): tema claro/oscuro/automático y 3–4 estilos curados que **sí**
   cambien tokens CSS en vivo sobre la app real — el primer control que de
   verdad hace lo que dice.
3. **Sección Accesibilidad funcional**: tamaño de letra, alto contraste,
   reducir movimiento, densidad — controles de bajo riesgo técnico, alto
   impacto de inclusión, y candidatos perfectos para vivir en `localStorage`
   sin esperar al motor de persistencia.
4. **Sección Inicio con resumen honesto**: aunque no haya datos que resumir
   todavía, una portada que muestre "así se ve tu nelzzon hoy" (captura del
   tema/estilo activo) y atajos a Apariencia/Accesibilidad — ancla narrativa
   del conjunto.
5. **Integrar "Módulos" como sección** (no flujo aparte): mover el contenido
   de `ModuleCatalog` dentro del Design Studio, conservando exactamente su
   lógica actual de vista previa local y sus badges de estado — unifica la
   experiencia sin reescribir nada que ya funciona bien.

Con estos cinco elementos, el usuario tendría: una casa que se siente a la
altura de la promesa, al menos una sección que cambia su nelzzon de verdad en
vivo, una sección de accesibilidad genuinamente útil desde el día uno, y una
portada que cuenta la historia del conjunto — sin haber tocado backend.

---

## 9. Qué NO implementar todavía

Declarado con la misma honestidad que pide el documento maestro — para no
repetir el patrón de "botones que aparentan funcionar":

- **No** drag and drop real todavía — usar listas con controles de
  orden (subir/bajar) como preview de la idea.
- **No** upload real de archivos (logos, imágenes, fuentes) todavía — usar
  galerías curadas de "muestras" que simulan la experiencia.
- **No** guardar en base de datos todavía — toda persistencia, si se ofrece en
  esta etapa, vive como mucho en `localStorage`/sessionStorage del navegador,
  y se declara así explícitamente.
- **No** IA real todavía — la sección P se presenta como "Próximamente", sin
  campo conversacional funcional (o, a lo sumo, un campo que muestra
  respuestas de muestra explícitamente etiquetadas como demostración).
- **No** permisos reales nuevos todavía — ningún control debe otorgar ni
  restringir acceso a datos; los badges "Solo admin" / "Bloqueado por plan"
  son **declarativos** (comunican intención futura), no aplican RBAC nuevo.
- **No** rediseñar `DashboardKpiGrid` / `DashboardWidgetGrid` ni ningún
  componente operativo — el lienzo de vista previa del Design Studio usa
  *copias/mockups* de esos componentes, nunca los componentes reales en modo
  edición (evita el riesgo de romper pantallas productivas).

---

## 10. Fase siguiente recomendada

**`NELZZON-PERSONALIZAR-MASTER-0C` — Rediseño visual del panel sin
funcionalidad real.**

Alcance sugerido para esa fase (a confirmar con Oscar antes de iniciar):
- Construir la nueva "casa" (drawer lateral grande + modo estudio) descrita en
  la sección 1 y 3 de este wireframe, **sustituyendo visualmente** al popover
  actual de `PersonalizationPanel`.
- Implementar el rail de navegación interna con las 16 secciones agrupadas
  (Esencial / Más opciones / Avanzado), cada una declarando su estado con el
  componente de badge unificado de la sección 7.
- Cablear el buscador de personalización (búsqueda local sobre la lista de
  secciones/controles, sin backend).
- Mover `ModuleCatalog` a vivir como la sección "Módulos" del nuevo Design
  Studio, conservando su lógica y badges actuales.
- Dejar el lienzo de vista previa como un **mockup estático** por ahora (sin
  preview en vivo todavía — eso llega con 1A).

Esta fase sigue siendo "sin funcionalidad real": construye el continente y la
estructura, declara honestamente el estado de cada pieza, y prepara el terreno
para que las fases 1A en adelante empiecen a conectar controles reales de
preview local.

---

## 11. Resumen ejecutivo

Este wireframe propone convertir Personalizar de un popover de dos controles a
un **Design Studio en drawer lateral con modo estudio expandible**, organizado
en 16 secciones agrupadas por nivel (Esencial / Más opciones / Avanzado), cada
una con estados declarados de forma honesta y consistente. La experiencia
"esto es mío" se logra usando siempre el contexto real del usuario como lienzo
de vista previa — nunca demos genéricos. El primer MVP visual no requiere
backend: una nueva casa, una sección de Apariencia con preview real en vivo,
una sección de Accesibilidad funcional, una portada narrativa, y la integración
de la Biblioteca de módulos como sección — cinco piezas que, juntas, hacen que
Personalizar deje de sentirse maqueta sin haber tocado una sola tabla.
