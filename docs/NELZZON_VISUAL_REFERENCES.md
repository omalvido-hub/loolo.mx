# NELZZON_VISUAL_REFERENCES.md — Registro de referencias visuales aprobadas

> Estado: **BORRADOR — REF-001 a REF-006 registradas; ubicaciones de imágenes pendientes.**
> Este documento no autoriza código, commits, push ni deploy.

---

## 1. Propósito de este documento

Este documento es el **registro oficial de referencias visuales aprobadas** para el rebuild de UX de Nelzzon (ver `docs/NELZZON_UX_REBUILD_PLAN.md`, sección 0.1).

Cada vez que Oscar apruebe una imagen, mockup o referencia visual para una pantalla o elemento del sistema, se registra aquí: qué es, dónde vive, qué representa, qué se debe tomar de ella, qué no se debe copiar, y cuándo/quién la aprobó.

Este registro es el **único insumo válido** para:
- La Fase 1 (style guide aislado en `/dev/styleguide`).
- Cada fase de pantalla (Fases 3 en adelante del plan de rebuild).

---

## 2. Regla: no se diseña "a ojo"

- Ninguna pantalla ni componente nuevo se construye sin una referencia aprobada y registrada en la tabla de la sección 3.
- Si para una pantalla o elemento no existe fila correspondiente en la tabla (o existe pero sin fecha de aprobación), **esa pantalla no se construye todavía**.
- Ante esa falta, se regresa con Oscar a definir/aprobar la referencia faltante antes de avanzar — no se improvisa ni se interpreta libremente.
- Esta regla aplica a estilo, layout, componentes, navegación y cualquier decisión visual — no solo a "pantallas completas".

---

## 3. Tabla de referencias aprobadas

| ID | Archivo / imagen | Ubicación | Pantalla o elemento que representa | Qué se debe tomar de esta referencia | Qué NO se debe copiar | Fecha de aprobación | Aprobado por |
|---|---|---|---|---|---|---|---|
| REF-001 | dashboard_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | Dashboard | Layout general del dashboard; jerarquía visual; estilo de tarjetas/cards; distribución de KPIs; sensación visual general premium/limpia | Textos exactos si no corresponden a Nelzzon; datos inventados; logos/marcas ajenas; elementos que contradigan permisos, RBAC o datos reales del backend | 2026-06-14 | Oscar |
| REF-002 | appshell_nav_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | AppShell / navegación | Estructura general del sistema; navegación principal; jerarquía entre topbar, sidebar/nav y área de contenido; sensación de SaaS premium, limpio y profesional; claridad para cambiar de módulos sin saturar la pantalla | Logos/marcas ajenas; menús o módulos que no existan en Nelzzon; textos exactos si no corresponden; accesos que contradigan permisos/RBAC; navegación duplicada tipo dock + sidebar si genera saturación | 2026-06-14 | Oscar |
| REF-003 | cards_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | Tarjetas / cards | Estilo visual de tarjetas; bordes, radios, sombras y separación; jerarquía interna: título, dato principal, subtítulo/estado y acción; apariencia premium, limpia y ligera; uso de tarjetas para KPIs, módulos y resúmenes sin saturar | Datos inventados; iconos/marcas ajenas si no corresponden; colores que no encajen con Nelzzon; tarjetas demasiado grandes o pesadas que parezcan maqueta; efectos visuales que afecten legibilidad o rendimiento | 2026-06-14 | Oscar |
| REF-004 | tables_lists_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | Tablas / listados | Estilo visual de tablas y listados; encabezados claros; filas legibles y clickeables; separación limpia entre registros; estados/badges fáciles de entender; estados vacíos elegantes; apariencia profesional sin parecer hoja de cálculo vieja | Datos inventados; columnas que no correspondan a Nelzzon; textos exactos de otra app; colores que no encajen con la identidad visual de Nelzzon; tablas saturadas o difíciles de leer; acciones visibles que contradigan permisos/RBAC | 2026-06-14 | Oscar |
| REF-005 | forms_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | Formularios | Estilo visual de formularios; campos limpios, claros y fáciles de llenar; jerarquía entre título, secciones, campos, ayudas y acciones; separación correcta entre grupos de información; estados de error, requerido, opcional y éxito fáciles de entender; sensación premium, profesional y ligera; formularios útiles para pacientes, expediente, agenda, presupuestos, documentos y configuración | Campos que no correspondan a Nelzzon; textos exactos de otra app; datos inventados; formularios saturados o difíciles de usar; acciones que contradigan permisos/RBAC; validaciones falsas que no existan en backend; diseños que oculten información clínica, financiera o legal importante | 2026-06-14 | Oscar |
| REF-006 | drawer_modal_v1.png | [PENDIENTE: ruta exacta donde guardaré la imagen] | Drawer / modal lateral | Patrón visual para drawer/modal lateral; que no tape innecesariamente todo el sistema; jerarquía clara entre encabezado, contenido, acciones y cierre; uso para Personalizar, detalles de paciente, filtros, edición rápida y configuración; sensación premium, limpia y ligera; buena lectura en desktop y adaptación razonable a pantallas pequeñas | Modales pesados que bloqueen toda la experiencia sin necesidad; acciones que contradigan permisos/RBAC; formularios o textos que no correspondan a Nelzzon; datos inventados; animaciones o efectos que afecten rendimiento; diseños que oculten información importante o confundan al usuario | 2026-06-14 | Oscar |

> Las referencias REF-001 a REF-006 fueron registradas como referencias mínimas aprobadas para evaluar el inicio de Fase 1. Las ubicaciones exactas de las imágenes siguen pendientes y deberán completarse antes de implementar UI real basada en esas referencias.

---

## 4. Referencias pendientes por definir

Las siguientes pantallas/elementos todavía **no tienen referencia aprobada**. Ninguna de ellas se construye hasta que tenga al menos una fila en la tabla de la sección 3 con fecha de aprobación:

- [ ] Dashboard
- [ ] AppShell / navegación
- [ ] Pacientes
- [ ] Expediente clínico
- [ ] Odontograma
- [ ] Agenda
- [ ] Presupuestos / Cobros
- [ ] Documentos
- [ ] Portal paciente
- [ ] Personalizar (drawer)

---

## 5. Checklist para poder iniciar Fase 1 (style guide)

- [x] Existe al menos una referencia aprobada y registrada para Dashboard. (REF-001)
- [x] Existe al menos una referencia aprobada y registrada para AppShell / navegación. (REF-002)
- [x] Existe al menos una referencia aprobada y registrada para tarjetas (cards). (REF-003)
- [x] Existe al menos una referencia aprobada y registrada para tablas/listados. (REF-004)
- [x] Existe al menos una referencia aprobada y registrada para formularios. (REF-005)
- [x] Existe al menos una referencia aprobada y registrada para drawer/modal. (REF-006)
- [x] Cada referencia anterior tiene fecha de aprobación y "aprobado por" llenos en la tabla de la sección 3.

> **Nota:** las 6 referencias mínimas (REF-001 a REF-006) ya están aprobadas y registradas, pero sus **ubicaciones exactas (rutas de archivo) siguen pendientes**. NO se debe implementar UI final basada en estas referencias hasta que esas ubicaciones se completen en la tabla de la sección 3.

---

## 6. Regla de avance

**No se avanza a la Fase 1 (style guide) hasta que Oscar haya aprobado, como mínimo, las referencias de:**
Dashboard, AppShell/navegación, tarjetas, tablas, formularios y drawer.

Las demás pantallas (Pacientes, Expediente clínico, Odontograma, Agenda, Presupuestos/Cobros, Documentos, Portal paciente, Personalizar) pueden aprobarse después, antes de su fase correspondiente — no son requisito para iniciar Fase 1, pero sí para construir cada una de esas pantallas.
