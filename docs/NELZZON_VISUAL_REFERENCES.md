# NELZZON_VISUAL_REFERENCES.md — Registro de referencias visuales aprobadas

> Estado: **BORRADOR — plantilla vacía, sin referencias registradas todavía.**
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
| | | | | | | | |

> Tabla vacía por ahora. Cada fila nueva se agrega solo cuando Oscar aprueba explícitamente una referencia.

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

- [ ] Existe al menos una referencia aprobada y registrada para Dashboard.
- [ ] Existe al menos una referencia aprobada y registrada para AppShell / navegación.
- [ ] Existe al menos una referencia aprobada y registrada para tarjetas (cards).
- [ ] Existe al menos una referencia aprobada y registrada para tablas/listados.
- [ ] Existe al menos una referencia aprobada y registrada para formularios.
- [ ] Existe al menos una referencia aprobada y registrada para drawer/modal.
- [ ] Cada referencia anterior tiene fecha de aprobación y "aprobado por" llenos en la tabla de la sección 3.

---

## 6. Regla de avance

**No se avanza a la Fase 1 (style guide) hasta que Oscar haya aprobado, como mínimo, las referencias de:**
Dashboard, AppShell/navegación, tarjetas, tablas, formularios y drawer.

Las demás pantallas (Pacientes, Expediente clínico, Odontograma, Agenda, Presupuestos/Cobros, Documentos, Portal paciente, Personalizar) pueden aprobarse después, antes de su fase correspondiente — no son requisito para iniciar Fase 1, pero sí para construir cada una de esas pantallas.
