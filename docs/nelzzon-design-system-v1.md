# NELZZON — Documento Maestro de Diseño UX/UI Global (DS-0 · v1)

> Este documento es **solo diseño**. No implementa nada, no toca código, no
> toca el Dashboard actual, no toca Personalizar actual, no toca backend, no
> hace commit/push/deploy. Es el mapa de referencia para las fases de
> implementación que vendrán después (DS-1, DS-2, …).

---

## 1. Resumen ejecutivo

Nelzzon debe sentirse **como un producto de Apple**: simple por fuera, potente
por dentro. La promesa es que **cualquier persona, sin capacitación**, pueda
abrir el sistema, entender qué hace cada pantalla, y — si quiere — hacerlo
"suyo" en minutos, sin tocar nada técnico.

Dos ideas sostienen todo este documento:

1. **El Dashboard base ya está aprobado** (sección 2) y es el punto de partida
   visual de todo el sistema. No se redibuja desde cero: se **generaliza** —
   las mismas reglas visuales que hoy aplican al Dashboard deben poder
   aplicarse a cualquier otra pantalla (Pacientes, Agenda, Cobros, etc.).

2. **Personalizar deja de ser "el panel de ajustes del Dashboard"** y se
   convierte en **el centro de control visual de todo Nelzzon**: un lugar
   único donde el usuario elige cómo se ve y se siente su sistema completo,
   con la opción de aplicar esos cambios "Solo al Dashboard" o "A todo el
   sistema".

El reto de diseño no es "agregar más opciones" — es exactamente lo contrario:
**ordenar el poder existente (y el que viene) detrás de una capa simple,
visual, con vista previa en vivo**, de forma que la potencia nunca se sienta
como complejidad para quien usa el sistema día a día.

---

## 2. Dashboard base aprobado (referencia visual congelada)

Esta es la base visual **aprobada y congelada**. Cualquier regla nueva de
Personalizar debe poder describirse en términos de "esto cambia tal o cual
parte de esta base" — nunca debe contradecirla ni reemplazarla por otra
estructura.

### 2.1 Topbar

- Botón de menú a la izquierda, con flecha (abre/colapsa la navegación
  lateral).
- Icono de sol (saludo / indicador de momento del día).
- Texto de saludo: **"Buenos días, Oscar"** (u otro saludo según la hora,
  personalizado con el nombre del usuario).
- Buscador.
- Botón **Personalizar**.
- Bloque de usuario a la derecha (avatar / nombre / organización).

### 2.2 Dashboard — cuerpo

- **Primera fila**: 4 KPIs principales, en formato de tarjeta vertical
  (icono + número + etiqueta).
- **Segunda zona**: 4 tarjetas secundarias, en formato horizontal/ancho,
  distribuidas en **2 columnas × 2 filas**.
- **Sin textos de "ir a"**: se eliminan textos tipo "Ver agenda", "Ver
  cobros", "Ver tratamientos", etc. La intención de navegación se comunica
  solo con el contenido de la tarjeta (título, icono, dato).
- **Toda la tarjeta es clickeable**: el área completa de cada tarjeta (KPI o
  secundaria) es un destino de navegación, sin necesidad de un botón o enlace
  visible dentro de ella.

### 2.3 "Mostrar accesos"

- Un botón **centrado**, con el texto "Mostrar accesos", debajo del cuerpo del
  Dashboard.
- Al activarse, despliega una zona tipo **cápsula/tarjeta curva**: bordes muy
  redondeados, aspecto casual y limpio, **no ocupa toda la pantalla** (es un
  panel compacto, no una página nueva).
- Dentro de la cápsula viven los **accesos rápidos** (módulos): cada acceso es
  **icono arriba + texto abajo**, con iconos **pequeños y de trazo fino**
  (no iconos grandes ni "macizos").
- Incluye un botón **"+ Agregar"** para sumar más accesos/módulos a la
  cápsula.
- La cápsula debe **soportar crecimiento**: si se agregan más módulos de los
  que entran en una fila/pantalla, la zona debe permitir **deslizar/scroll**
  sin romper el diseño ni "explotar" de tamaño.

### 2.4 Por qué esta base es el ancla del sistema

Esta estructura (Topbar + KPIs + tarjetas secundarias + cápsula de accesos) es
el "lenguaje visual" mínimo de Nelzzon. Cuando una pantalla nueva (Pacientes,
Agenda, Cobros…) reciba el mismo tratamiento de "Todo el sistema" desde
Personalizar, debe reconocerse como **familia del mismo sistema**: misma
forma de tarjeta, mismo tipo de sombra/borde/redondez, misma paleta, misma
tipografía, mismos iconos — aunque el contenido sea distinto.

---

## 3. Reglas de lo que NO se toca (marco de seguridad de diseño)

Estas reglas existen para que Personalizar pueda crecer sin poner en riesgo
nada del producto ya construido y probado.

1. **Estructura del Dashboard base (sección 2) no se redibuja.** Personalizar
   cambia *apariencia* (color, forma, sombra, iconos, tipografía, fondo,
   tamaño/orden de tarjetas existentes) — nunca *estructura* (no agrega ni
   quita las 4 zonas: Topbar, KPIs, secundarias, cápsula de accesos).
2. **No se inventan datos.** Ningún cambio visual puede traer consigo datos,
   cifras, textos clínicos o financieros que no vengan del backend. Lo que
   cambia es cómo se ve la información, no cuál es la información.
3. **No se toca el motor de dominio.** Citas, pacientes, odontograma, planes
   de tratamiento, presupuestos, pagos, permisos, RLS, auditoría — nada de
   esto se modifica por una preferencia visual. Personalizar es una capa de
   presentación, 100% independiente del dominio.
4. **No se toca RBAC.** Lo que un rol puede ver o hacer no cambia por
   personalización. Si un usuario no tiene permiso para ver "Cobros", ningún
   ajuste visual le da acceso a esa información; como mucho, el módulo/acceso
   correspondiente simplemente no aparece para él.
5. **Nada de "Próximamente" / "bloqueado" / textos de espera visibles.** Si
   una opción de Personalizar todavía no tiene un efecto real en una pantalla
   (por ejemplo, una pantalla que aún no fue adaptada a "Todo el sistema"),
   esa opción **no se muestra** para esa pantalla, en lugar de mostrarse
   deshabilitada o con un aviso técnico.
6. **Guardado 100% local en este navegador** (continuación del patrón actual:
   `localStorage`), salvo que una fase futura decida — con aprobación
   explícita — sincronizar preferencias por organización en el backend. Eso
   sería un cambio de alcance mayor (nueva tabla, RLS, migración) y **no está
   incluido** en este documento.
7. **Sin librerías nuevas, sin imágenes externas.** Todo el sistema de
   iconos, fondos, paquetes y paletas se construye con lo que el proyecto ya
   tiene disponible (SVG/iconos propios, gradientes/CSS, imágenes
   prediseñadas servidas localmente).
8. **Nada de nombres de categoría de negocio dentro de Personalizar.**
   "Dental", "clínico", "estética", "taller", etc. pueden existir como
   *plantillas iniciales* (paso de bienvenida / onboarding por tipo de
   negocio), pero las **opciones de estilo, color, icono, fondo y tarjeta
   deben tener nombres universales** (ver secciones 4–7), válidos para
   cualquier vertical.

---

## 4. Secciones de Personalizar (mapa general)

Personalizar se organiza en 9 secciones. Cada sección es una "estación" con
su propia vista previa en vivo; el usuario puede entrar a cualquiera sin
seguir un orden obligatorio (excepto el flujo de bienvenida inicial, que sigue
sí un orden guiado).

| # | Sección | En una frase |
|---|---------|--------------|
| 1 | Estilo general | Elige el "carácter" visual completo del sistema con un clic. |
| 2 | Colores y fondos | Elige paleta, color principal/secundario/acentos y fondo. |
| 3 | Tipografía | Elige cómo se ve el texto: tamaño, peso, estilo de letra. |
| 4 | Tarjetas y widgets | Elige forma, tamaño, sombra, borde y textura de las tarjetas. |
| 5 | Iconos | Elige el paquete de iconos y cómo se muestran. |
| 6 | Accesos rápidos | Elige qué módulos aparecen en "Mostrar accesos" y cómo se ven. |
| 7 | Menús | Elige el estilo del menú lateral / inferior / navegación. |
| 8 | Acomodo del dashboard | Ordena, redimensiona, oculta y restaura tarjetas. |
| 9 | Guardar / restaurar | Aplica, cancela, guarda como "mi estilo", restaura predeterminado, deshace. |

Cada sección, salvo la 9 (que es transversal), tiene el mismo patrón de
interacción:

- **Vista previa en vivo** arriba (siempre visible mientras se elige).
- **Opciones grandes con nombre simple** (nunca un control técnico suelto).
- Un **interruptor de alcance** ("Solo Dashboard" / "Todo el sistema") visible
  cuando la opción aplica a más de una pantalla (ver sección 6).
- Acceso opcional a **"Ajustes avanzados"** (colapsado, "potente por dentro"),
  para quien quiera ir más allá de las opciones simples.

---

## 5. Qué incluye cada sección

### 5.1 Estilo general

La forma más rápida de cambiar "todo de una vez". Una galería de **estilos
completos**, cada uno una combinación coherente de tipografía + color +
forma de tarjeta + iconos + fondo + menú. Aplicar un estilo es un solo clic;
cada control individual de las otras secciones queda disponible después para
ajustar detalles sin perder el estilo base.

**Estilos visuales soportados (15):**

| Estilo | Sensación |
|---|---|
| Limpio | Blanco, espacioso, fácil de leer. |
| Moderno | Translúcido, suave, "app actual". |
| Elegante | Sobrio, líneas finas, mucho aire. |
| Colorido | Vivo, expresivo, acentos fuertes. |
| Minimalista | Mínimo posible: casi sin adornos. |
| Suave / pastel | Colores tenues, formas redondeadas. |
| Fuerte | Sólido, directo, alto contraste, operativo. |
| Oscuro | Fondo oscuro tipo vidrio, acentos brillantes. |
| Premium | Profundidad, sombra elevada, detalle fino. |
| Glass | Vidrio translúcido, blur, bordes de luz. |
| 3D suave | Volumen sutil, sombras suaves tipo "soft UI". |
| Cute | Redondo, amigable, colores alegres. |
| Peluche / fuzzy | Texturas suaves, muy redondeado, "abrazable". |
| Clay / plastilina | Volumen tipo arcilla, sombras internas suaves. |
| Profesional | Serio, neutro, orientado a negocios. |

Cada estilo define, internamente, valores para: tipografía, paleta base,
forma/sombra de tarjeta, paquete de iconos sugerido, fondo sugerido y estilo
de menú. El usuario solo ve el nombre y una vista previa grande — nunca los
valores internos.

### 5.2 Colores y fondos

**Colores:**
- **Paletas listas**: combinaciones predefinidas con nombre amigable (ej.
  "Cielo", "Bosque", "Atardecer" — nombres universales, no por vertical).
- **Selector avanzado tipo rueda de color**, para quien quiera ir más allá de
  las paletas: permite elegir libremente.
- Controles de **brillo, intensidad y opacidad** sobre el color elegido.
- Asignación de rol de color: **principal, secundario, acentos, botones,
  estados** (éxito/alerta/error/información) — cada uno con su propio control,
  pero con valores por defecto sensatos para que nunca sea obligatorio
  tocarlos.

**Fondos:**
- Fondos de color liso.
- Degradados (con control de intensidad).
- Fondos prediseñados (galería curada).
- Patrones suaves (texturas sutiles, no distractoras).
- Imágenes prediseñadas (biblioteca local).
- Imagen personal (subida por el usuario).
- Controles de **opacidad** y **blur/difuminado** sobre cualquier fondo, para
  que el contenido siga siendo legible.

### 5.3 Tipografía

- Tamaño general del texto (afecta densidad de toda la interfaz: compacto /
  cómodo / amplio).
- Peso/grosor del texto (más fino / normal / más marcado).
- Estilo de letra: un conjunto curado de familias tipográficas con nombres
  descriptivos por sensación (ej. "Clásica", "Redondeada", "Técnica",
  "Elegante") — nunca el nombre técnico de la fuente como opción principal
  (puede aparecer en "ajustes avanzados").

### 5.4 Tarjetas y widgets

Controla la "piel" de cada tarjeta (KPI, secundaria, módulo, acceso rápido):

- **Tamaño**: compacto / normal / grande.
- **Forma**: cuadrado / redondo (radio de esquina).
- **Redondez**: de "casi recta" a "muy redondeada".
- **Sombra**: ninguna / suave / elevada / glass.
- **Borde**: ninguno / suave / de acento / superior / lateral.
- **Textura/estilo de superficie**: glass, pastel, sólido.
- Atajos directos a combinaciones frecuentes: "Compacto", "Grande",
  "Cuadrado", "Redondo" — para no tener que tocar 4 controles por separado.

### 5.5 Iconos

**Paquetes de iconos (12):**

| Paquete | Sensación |
|---|---|
| Lineal limpio | Trazo fino, minimalista. |
| Sólido minimal | Formas simples y rellenas. |
| Pastel app | Colores suaves, estilo app móvil. |
| 3D suave | Volumen sutil, sombra suave. |
| Peluche / fuzzy | Muy redondeado, textura suave. |
| Clay / plastilina | Volumen tipo arcilla. |
| Glass | Translúcido, con brillo. |
| Premium elegante | Fino, detallado, sobrio. |
| Cute | Redondo, expresivo, alegre. |
| Tech | Anguloso, técnico, moderno. |
| Bold | Grueso, alto contraste. |
| Ilustrado | Estilo dibujo/ilustración. |

**Controles disponibles:**
- Aplicar un paquete completo a **todo el sistema** de un clic.
- Editar **icono por icono** (opcional, "ajustes avanzados").
- Composición: **icono + texto**, **solo icono**, **texto abajo**, **texto al
  lado**.
- Tamaño: **icono grande** / **icono pequeño**.
- Por icono o por paquete: **fondo, color, sombra, borde y redondez** del
  contenedor del icono.

### 5.6 Accesos rápidos

Controla la cápsula "Mostrar accesos" (sección 2.3):

- Qué módulos aparecen (según los módulos habilitados/permitidos del usuario).
- Orden de los accesos.
- Estilo visual de cada acceso (hereda de Iconos + Tarjetas, pero puede tener
  variantes propias: tamaño de icono, si se muestra texto, etc.).
- Botón "+ Agregar" para sumar accesos disponibles que no estén ya en la
  cápsula.
- Comportamiento de overflow (deslizable) cuando hay más accesos de los que
  caben.

### 5.7 Menús

Controla el menú lateral (sidebar), el menú inferior (dock móvil/táctil si
aplica) y cualquier navegación secundaria:

- Estilo visual (heredado de "Estilo general", con variantes propias: simple,
  glass, flotante, compacto, moderno, sin texto, iconos grandes — mismo
  vocabulario que ya existe para el dock).
- Tamaño y densidad.
- Visibilidad de etiquetas de texto.

### 5.8 Acomodo del dashboard

- **Mover** tarjetas (reordenar).
- **Cambiar tamaños** (chico/mediano/grande/ancho, como ya existe).
- **Ocultar/mostrar** tarjetas.
- **Ordenar widgets** dentro de cada zona.
- **Restaurar acomodo** a la configuración original.
- Garantía: nunca rompe la estructura base de la sección 2 (no se pueden
  eliminar las 4 zonas, solo reordenar/ocultar/redimensionar su contenido).

### 5.9 Guardar / restaurar

Acciones transversales, siempre visibles mientras se personaliza:

- **Aplicar**: confirma los cambios actuales (vista previa → real).
- **Cancelar**: descarta cambios no aplicados, vuelve al último estado
  aplicado.
- **Guardar estilo**: guarda la combinación actual con un nombre propio, para
  poder volver a ella o compararla con otra.
- **Restaurar predeterminado**: vuelve al estilo de fábrica de Nelzzon.
- **Deshacer**: revierte el último cambio aplicado (un paso atrás), útil tras
  un "Aplicar" que no convenció.

---

## 6. Cómo se aplica: "Solo Dashboard" vs "Todo el sistema"

Cada cambio de Personalizar se hace con un **interruptor de alcance** de dos
posiciones:

- **Solo Dashboard**: el cambio afecta únicamente la pantalla de Dashboard
  (comportamiento equivalente al que ya existe hoy).
- **Todo el sistema**: el cambio se propaga a todas las pantallas que
  comparten el lenguaje visual de Nelzzon:
  - Dashboard
  - Pacientes (lista y ficha)
  - Perfil del paciente (Ficha Viva)
  - Agenda
  - Consultas (encounter, odontograma, plan de tratamiento)
  - Cobros
  - Presupuestos
  - Documentos
  - Portal del paciente
  - Fiscal / administrativo
  - Configuración
  - Personalizar (el propio panel también se ve afectado por su estilo)

**Reglas del interruptor:**

1. El valor por defecto es **"Todo el sistema"** para las secciones que son
   inherentemente globales (Estilo general, Colores y fondos, Tipografía,
   Iconos, Menús) — porque cambiar solo el Dashboard rompería la coherencia
   visual del resto.
2. **"Solo Dashboard"** tiene sentido sobre todo para **Acomodo del
   dashboard** (sección 5.8) y para ajustes específicos de Tarjetas/Widgets
   que el usuario quiera distintos en su Dashboard frente al resto (caso de
   uso: "mi Dashboard lo quiero compacto, pero el resto del sistema normal").
3. Si una pantalla de "Todo el sistema" **todavía no ha sido adaptada** para
   recibir un tipo de cambio (por ejemplo, una pantalla que aún no usa
   tarjetas del sistema de diseño), ese cambio **simplemente no se aplica
   ahí** — sin avisos, sin "Próximamente". La meta de las fases de
   implementación (sección 9) es ir cerrando esas brechas pantalla por
   pantalla.
4. El interruptor se recuerda por sección: el usuario puede tener "Colores y
   fondos → Todo el sistema" y "Acomodo del dashboard → Solo Dashboard" al
   mismo tiempo.

---

## 7. Reglas visuales globales

Estas reglas garantizan que, sin importar qué combine el usuario, el
resultado siga siendo "Nelzzon":

1. **Jerarquía constante**: KPIs principales siempre más prominentes que
   tarjetas secundarias; tarjetas secundarias siempre más prominentes que
   accesos rápidos. El estilo puede cambiar el "cómo se ve" cada nivel, pero
   nunca invierte la jerarquía.
2. **Contraste mínimo garantizado**: cualquier combinación de color de
   fondo + color de texto debe mantener legibilidad. Las paletas y
   selectores avanzados deben advertir (visualmente, sin tecnicismos) cuando
   una combinación es difícil de leer, y ofrecer ajuste automático.
3. **Toda tarjeta clickeable es clickeable en cualquier estilo**: ningún
   estilo, fondo o icono puede ocultar o estorbar el área de clic de una
   tarjeta.
4. **Coherencia de redondez**: si las tarjetas tienen radio "redondo", los
   botones, iconos y la cápsula de accesos también usan una redondez
   coherente (no se mezclan "muy cuadrado" con "muy redondo" dentro del mismo
   estilo).
5. **Una sola fuente de verdad por preferencia**: cada aspecto visual
   (color, tipografía, forma de tarjeta, iconos, fondo, menú, acomodo) vive en
   un único lugar de configuración; "Estilo general" escribe sobre esos
   mismos lugares, no crea una capa paralela.
6. **Vista previa = realidad**: lo que se ve en la vista previa en vivo de
   Personalizar es exactamente lo que se verá al aplicar — sin sorpresas al
   pasar de "previsualizar" a "aplicar".
7. **Accesibilidad básica**: tamaños de texto mínimos, áreas de toque
   mínimas para iconos/accesos, y combinaciones de color con contraste
   suficiente, independientemente del estilo elegido.

---

## 8. Componentes globales afectados

Mapa de qué partes del sistema están "bajo el paraguas" de Personalizar
cuando el alcance es "Todo el sistema". Esto es un mapa de **diseño**, no una
lista de archivos a tocar.

| Componente global | Qué controla Personalizar ahí |
|---|---|
| Topbar | Color/estilo de fondo, tipografía del saludo, estilo del buscador y botones. |
| Menú lateral (sidebar) | Estilo de menú (sección 5.7), iconos, tipografía. |
| Tarjetas (KPI, secundarias, módulo) | Forma, tamaño, sombra, borde, textura (sección 5.4). |
| Cápsula "Mostrar accesos" | Accesos visibles, orden, estilo de cada acceso (sección 5.6). |
| Iconografía general | Paquete de iconos y composición icono/texto (sección 5.5). |
| Fondo general de cada pantalla | Color/degradado/imagen/patrón (sección 5.2). |
| Tipografía general | Tamaño, peso, familia (sección 5.3). |
| Listas y tablas (Pacientes, Agenda, etc.) | Densidad, redondez de filas/tarjetas, color de acentos. |
| Portal del paciente | Mismo lenguaje visual que el sistema interno (versión orientada al paciente). |
| Estados (éxito/alerta/error/info) | Colores de estado definidos en "Colores y fondos". |
| Botones y controles | Forma, redondez, color de acento — coherente con tarjetas. |

**No afectados por Personalizar (siempre constantes):**
- Estructura de navegación (qué módulos existen y a qué corresponden).
- Permisos / RBAC.
- Datos clínicos, financieros y de auditoría.
- Reglas de negocio (cadena conversación → cita → consulta → hallazgo → plan →
  presupuesto → cobro).

---

## 9. Fases recomendadas de implementación

Orden sugerido para minimizar riesgo y entregar valor visible pronto. Cada
fase debe poder probarse y revertirse de forma independiente.

**DS-1 — Cimentación del sistema de diseño**
Formalizar, sin cambiar la apariencia actual, los "tokens" visuales que hoy
ya existen de forma dispersa (color, tipografía, forma, sombra, espaciado) en
un vocabulario único y documentado. Sin cambios visibles para el usuario.

**DS-2 — Generalizar el Dashboard base a "Todo el sistema" (alcance)**
Introducir el interruptor "Solo Dashboard / Todo el sistema" en Personalizar
y conectar las secciones que **ya existen hoy** (Estilo general, Colores,
Tarjetas, Iconos, Menús) para que, en modo "Todo el sistema", se reflejen
también en 1–2 pantallas piloto (ej. Pacientes y Agenda).

**DS-3 — Estilo general ampliado**
Sumar los estilos nuevos de la galería (3D suave, cute, peluche/fuzzy,
clay/plastilina, glass, premium) a "Estilo general", reutilizando el motor de
plantillas existente.

**DS-4 — Iconos: paquetes ampliados + composición**
Sumar los paquetes de iconos nuevos (3D suave, peluche/fuzzy, clay, glass,
premium, cute, tech, bold, ilustrado) y los controles de composición
(icono+texto, solo icono, texto abajo/al lado, tamaño).

**DS-5 — Colores y fondos avanzados**
Selector tipo rueda de color, controles de brillo/intensidad/opacidad,
asignación de color por rol (principal/secundario/acentos/botones/estados),
fondos con blur y opacidad, imagen personal.

**DS-6 — Tipografía**
Tamaño/peso/familia con nombres por sensación, aplicado primero a Dashboard,
luego a "Todo el sistema".

**DS-7 — Accesos rápidos y menús ampliados**
Reordenar/agregar accesos en la cápsula, overflow deslizable, estilos de menú
ampliados aplicados a sidebar además del dock.

**DS-8 — Acomodo avanzado + Guardar/Restaurar**
"Guardar estilo" con nombre propio, "Deshacer", y extender Acomodo del
dashboard (sección 5.8) con el interruptor de alcance cuando tenga sentido.

**DS-9 — Cobertura de "Todo el sistema"**
Ir cerrando, pantalla por pantalla (Cobros, Presupuestos, Documentos, Portal
del paciente, Fiscal/administrativo, Configuración), la adaptación al
lenguaje visual común, hasta que "Todo el sistema" cubra el 100% del mapa de
la sección 8.

Cada fase debe mantener: `npx tsc --noEmit` limpio, `npm run build` exitoso,
`npm test` en verde, sin tocar backend/migraciones/permisos salvo aprobación
explícita.

---

## 10. Riesgos y cómo evitarlos

| Riesgo | Cómo se evita |
|---|---|
| Que "Todo el sistema" se sienta a medias (algunas pantallas cambian, otras no). | Cobertura incremental explícita (DS-9), y regla de "si no aplica, no se muestra" (sección 3.5) en vez de mostrar algo roto o "Próximamente". |
| Que demasiadas opciones generen parálisis ("¿cuál elijo?"). | Estilo general (5.1) como atajo de un clic; el resto de secciones son para quien quiera profundizar, siempre con "ajustes avanzados" colapsados por defecto. |
| Que un usuario elija una combinación poco legible (texto sobre fondo del mismo color). | Regla de contraste mínimo garantizado (sección 7.2) con ajuste automático. |
| Que cambios de "Todo el sistema" rompan tablas/listas densas (Pacientes, Agenda) por exceso de redondez/sombra. | Coherencia de redondez (7.4) con límites sensatos por tipo de componente (una tabla nunca adopta el mismo radio extremo que una tarjeta KPI). |
| Que el usuario pierda su personalización al actualizar el sistema. | Guardado local persistente + "Guardar estilo" con nombre propio (5.9), y "Restaurar predeterminado" siempre disponible como red de seguridad. |
| Que personalizar "Todo el sistema" se confunda con cambiar permisos o datos. | Reglas de lo que NO se toca (sección 3) — Personalizar es 100% presentación, nunca dominio ni permisos. |
| Que se rompa la estructura base del Dashboard (sección 2) por accidente al generalizar. | Acomodo (5.8 y 7.1) opera solo sobre contenido dentro de las 4 zonas fijas; nunca elimina ni reordena las zonas mismas. |
| Que se introduzcan nombres de categoría de negocio (dental, clínico, etc.) dentro de las opciones de estilo. | Glosario de nombres universales (secciones 5.1 y 5.5) revisado en cada fase antes de implementar. |
| Que crecer Personalizar implique nuevas dependencias o imágenes externas. | Regla de "sin librerías nuevas, sin imágenes externas" (sección 3.7) — todo se construye con recursos propios del proyecto. |
| Que el alcance "Todo el sistema" termine requiriendo cambios de backend (sincronizar preferencias entre dispositivos). | Se documenta como decisión futura explícita (sección 3.6), fuera de alcance de este documento y de las fases DS-1…DS-9. |

---

*Fin del documento DS-0. Próximo paso sugerido: revisión y aprobación de este
mapa antes de iniciar DS-1.*
