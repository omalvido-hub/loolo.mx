# NELZZON_UX_REBUILD_PLAN.md — Plan maestro de reconstrucción visual/UX

> Estado: **BORRADOR — solo planeación, sin implementar.**
> Nada de este documento autoriza código, commits, push ni deploy.
> Cada fase descrita aquí requiere aprobación explícita por separado antes de tocar código.

---

## 0. Punto de partida

- **Estado actual validado: 1467/1467 pruebas verdes**, 20 migraciones aplicadas, RLS + RBAC + ledger inmutable funcionando.
- Capa visual actual: AppShell con sidebar + topbar + dock inferior + "Personalizar" (modal de 6 bloques, recién rediseñado).
- Veredicto previo (confirmado por Oscar): **el backend se queda. La UI/UX se rehace completa.**
- Pendiente crítico antes de iniciar Fase 1: **Oscar debe entregar la maqueta/dirección visual nueva aprobada** (imágenes de referencia). Sin esa maqueta no se diseña nada "a ojo" — este plan define el proceso, no el estilo final.

---

## 0.1 Registro de referencias aprobadas (obligatorio antes de Fase 1)

- La dirección visual maestra (punto 3) **no se define por interpretación libre**: debe basarse en referencias concretas (imágenes/mockups) que Oscar apruebe explícitamente.
- Antes de iniciar la Fase 1 (style guide), se debe crear un registro simple en este mismo documento (o en un archivo anexo, ej. `docs/NELZZON_VISUAL_REFERENCES.md`) que liste:
  - Nombre de archivo de cada referencia aprobada.
  - Ubicación (ruta local donde vive el archivo).
  - Qué pantalla/elemento representa (ej. "dashboard", "navegación", "tarjeta de paciente").
  - Fecha de aprobación.
- **No se diseña "a ojo".** Si para alguna pantalla no existe referencia aprobada en este registro, esa pantalla no se construye todavía — se regresa con Oscar a definir/aprobar la referencia faltante antes de avanzar.
- Este registro es el único insumo válido para la Fase 1 (style guide) y para cada fase de pantalla (3 en adelante).

---

## 1. Backend que se conserva intacto (NO se toca)

Todo lo que vive en `src/server/domain/` y capas inferiores, sin cambios de lógica:

- `identity/` — organizaciones, usuarios, roles, permisos (RBAC), membresías.
- `agenda/` — recursos, citas, disponibilidad, anti-solapamiento.
- `clinical/` — encounters, notas clínicas, odontograma (hallazgos FDI).
- `patient-record/` — Ficha Viva (FVO): datos demográficos, contactos de emergencia, tutores, consentimientos, documentos.
- `billing/` — plan de tratamiento, presupuestos (quotes), pagos (ledger append-only).
- `contacts/`, `conversations/`, `follow/` — bandeja, deduplicación, tareas.
- `config/` — módulos, plantillas, preferencias.
- `dashboard/` — agregación de KPIs (las queries, NO los componentes visuales).
- `audit/`, `events/` — bitácoras.
- Toda la capa de RLS, migraciones (0001–0020), `prisma/schema.prisma`, scripts de seed/RBAC.
- Server actions existentes en `src/app/**/actions.ts` (o equivalentes) que ya envuelven el dominio — se **reutilizan**, no se reescriben, salvo que una nueva pantalla necesite una acción nueva (aditiva, no destructiva).

**Regla dura:** ninguna fase de este plan modifica `src/server/domain/**`, migraciones, RLS, RBAC ni esquemas. Si una pantalla nueva necesita un dato que el dominio no expone, se propone como cambio aparte (con plan, riesgo, pruebas) — no se mezcla con trabajo visual.

---

## 2. Capa visual que se elimina o se ignora

Se retiran/sustituyen (no se "arreglan", se reemplazan):

- `src/components/shell/AppShell.tsx`, `AppTopbar.tsx`, `AppDock.tsx` — shell completo.
- `src/components/shell/PersonalizationPanel.tsx` y todo su ecosistema (`BackgroundCustomizer`, `BrandCustomizer`, `ModuleIdentityCustomizer`, `ModuleCatalog`, `PersonalizationPreviewCanvas/Toggle`, `VisualPresetSelector`, `VisualStylePreview`).
- `src/lib/visual-preferences.tsx` y `src/lib/module-identity.tsx` — sistema de personalización profunda (plantillas de negocio, galería de fondos, estilos de dock, etc.) — se sustituye por un "Personalizar" simple (ver punto 20).
- Componentes UI genéricos actuales (`module-card`, `stat-card`, `kpi-widget`, `chart-preview-card`, `section-card`, etc.) — se evalúan uno por uno: los que sirvan como base de un nuevo design system se adaptan, el resto se reemplaza.
- Páginas existentes (`dashboard`, `pacientes`, `pacientes/[id]`, `agenda`, `presupuestos`, `cobros`, `consultas/[encounterId]`) — se **reconstruyen visualmente** sobre los mismos datos/acciones, sin tocar el fetching de datos del servidor más de lo necesario.

**No se borra nada de golpe.** Cada pantalla se sustituye cuando su fase correspondiente esté lista y validada — la app debe seguir funcionando en todo momento (sin pantallas rotas a medio camino).

**Orden obligatorio: sustituir → validar → limpiar.** `AppShell`, `AppTopbar`, `AppDock`, `PersonalizationPanel` y los demás componentes/archivos listados arriba **NO se borran** al iniciar una fase — siguen activos y funcionando en paralelo (o como respaldo) hasta que su reemplazo esté:
1. Visualmente validado contra la referencia aprobada (punto 0.1), y
2. Funcionalmente validado (`npm test` + `tsc` + `build` verdes, permisos correctos).

Solo entonces, en la **Fase 10 (limpieza)** o al cierre de la fase correspondiente con aprobación explícita de Oscar, se elimina el código viejo ya sustituido.

---

## 3. Nueva dirección visual maestra

- Se define **exclusivamente** a partir del registro de referencias aprobadas (punto 0.1) — no por interpretación, gusto o inventiva del momento.
- Antes de tocar una sola pantalla real, se construye una **página de estilo ("style guide") aislada** con: paleta de colores, tipografía, espaciados, tarjeta base, botón, input, tabla, modal/drawer, badge de estado. Esa página es lo primero que se aprueba visualmente.
  - **`/dev/styleguide` (o ruta equivalente) NO se expone públicamente en producción.** Mientras exista, debe estar protegida (requiere sesión autenticada, igual que el resto de `(app)`), marcada como temporal/interna, y solo se mantiene mientras dure el rebuild — no se publica ni se enlaza desde la navegación real hasta que Oscar autorice explícitamente lo contrario.
- Una vez aprobado el style guide, **todas** las fases siguientes lo usan como única fuente de verdad — nada de "voy inventando sobre la marcha".
- El nuevo "Personalizar" (punto 20) se diseña *después* de tener el estilo base aprobado, no antes.

---

## 4. Nuevo AppShell

- Estructura mínima: barra superior (logo + nombre org + usuario) + navegación lateral (o el patrón que diga la maqueta) + área de contenido.
- Sin dock inferior "tipo app móvil" salvo que la maqueta lo pida explícitamente.
- Navegación basada en permisos (`hasPermission`) igual que hoy — **no se cambia RBAC**, solo cómo se ve la lista de accesos.
- Responsive: al menos validar en 1440px (laptop) y 768px (tablet/iPad) — no se promete mobile-first todavía a menos que se acuerde.

---

## 5. Nuevo Dashboard

- Mismas fuentes de datos (`dashboard` domain) — mismos KPIs reales (citas de hoy, cobrado, tratamientos activos, ingresos, por cobrar, presupuestos pendientes), **sin inventar métricas nuevas**.
- Placeholders "—" se mantienen donde el backend no calcula el dato (no se inventan montos, regla NO NEGOCIABLE).
- Layout, tarjetas y jerarquía visual nuevos, según maqueta aprobada.

---

## 6. Nuevo sistema de navegación

- Un único patrón de navegación (lateral o el que diga la maqueta), sin duplicar accesos en dock + sidebar como hoy.
- Lista de módulos visibles = intersección de "módulos habilitados para la org" (config/templates) y "permisos del rol" — misma regla de negocio actual, nueva presentación.
- Indicador claro de "Próximamente" para módulos no implementados (Documentos, Reportes, Portal) — sin links rotos.

---

## 7. Nuevo patrón para pantallas internas

- Plantilla única para "pantalla de módulo": encabezado (título + acciones principales) + cuerpo + (opcional) panel lateral de detalle.
- Aplica igual para Pacientes, Agenda, Presupuestos, Cobros, etc. — un solo layout reutilizable, no uno distinto por pantalla.

---

## 8. Nuevo patrón para formularios

- Un solo conjunto de componentes de formulario (input, select, textarea, fecha, checkbox, radio, mensajes de error/validación) usados en todo el sistema.
- Validación visual conectada a los esquemas Zod existentes (no se cambian las reglas de validación, solo cómo se muestran los errores).
- Estados: vacío, con datos, error de validación, guardando, éxito.

---

## 9. Nuevo patrón para tablas/listados

- Un componente de tabla/lista reutilizable: encabezados, filas clickeables, estados vacíos, paginación si aplica, badges de estado con el vocabulario ya traducido (ya logrado en fases UI-7A-UX2: FINALIZED→"Finalizada", etc.).
- Mismo patrón para: lista de pacientes, agenda (si aplica vista de lista), presupuestos, cobros, documentos.

---

## 10. Nuevo patrón para drawers/modales

- Un solo componente base de modal/drawer (overlay + panel), con variante "centro" (como el nuevo Personalizar de 6 bloques) y variante "lateral" (drawer deslizante).
- Usado para: detalle de hallazgo en odontograma, confirmaciones de acciones (cancelar cita, anular hallazgo, etc.), Personalizar simple.
- Reemplaza los popovers/paneles ad-hoc actuales.

---

## 11. Nuevo flujo — Pacientes

- Lista de pacientes (búsqueda, fila clickeable → ficha).
- Ficha de paciente: cabecera con datos esenciales + pestañas/secciones para Ficha Viva (FVO): demografía, contacto de emergencia, tutores, consentimientos, documentos — mismas 6 secciones ya construidas en UI-7A, con nuevo empaque visual.
- Próxima cita visible en cabecera (ya corregido en fixes recientes — se conserva el dato, cambia el contenedor).

---

## 12. Nuevo flujo — Expediente clínico (consulta)

- Vista de consulta (`encounters`) solo lectura igual que hoy, nuevo layout.
- Acceso desde Pacientes → historial de consultas.
- Visible solo para roles con `clinical.view` — sin cambios de permisos.

---

## 13. Nuevo flujo — Agenda

- Vista de citas del recurso/profesional, creación/edición/cancelación de citas (server actions existentes).
- Nuevo calendario/lista visual; misma lógica de disponibilidad y anti-solapamiento del backend.

---

## 14. Nuevo flujo — Odontograma

- Pantalla estrella: diagrama dental FDI 11–48 interactivo (clic en pieza/superficie → panel de detalle con hallazgos y ciclo de vida: registrar, tratar, resolver, anular).
- Se conserva toda la lógica de `odontogram.ts` (append-only, lifecycle) — solo nuevo dibujo/interacción visual.

---

## 15. Nuevo flujo — Plan de tratamiento

- Lista de ítems del plan ACTIVE del paciente, estados traducidos, transiciones controladas por backend.
- Nuevo layout de lista/tarjetas según patrón del punto 9.

---

## 16. Nuevo flujo — Presupuestos

- Lista de presupuestos por paciente/estado, detalle con líneas y totales (servidor calcula todo, dinero en centavos → formateado a MXN en UI).
- Flujo DRAFT → PROPOSED → ACCEPTED conservado; edición solo en DRAFT.

---

## 17. Nuevo flujo — Cobros

- Ledger de pagos (PAYMENT/REVERSAL) por presupuesto/paciente, saldo calculado por servidor.
- Registrar pago / reversar pago con los mismos server actions.

---

## 18. Nuevo flujo — Documentos

- Hoy es "Próximamente" en el dock. Si se decide activarlo en esta reconstrucción, se diseña sobre `patient_documents` (ya existe en FVO: ver/subir documentos).
- Si no se activa todavía, se mantiene como "Próximamente" con el nuevo estilo visual — sin prometer funcionalidad nueva sin acordarlo antes.

---

## 19. Nuevo flujo — Portal paciente

- Hoy "Próximamente", sin backend dedicado. **No se construye en este rebuild** salvo que se acuerde como fase aparte — fuera del alcance de "rehacer visual sobre lo existente", porque requeriría diseño de acceso/autenticación de pacientes (decisión de producto + seguridad, no solo UI).
- Se deja como entrada de navegación deshabilitada/"Próximamente" con el nuevo estilo.

---

## 20. Nuevo "Personalizar" — simple, lateral, sin tapar el sistema

- Sustituye el modal de 6 bloques actual (que el dueño calificó de "saturado").
- Formato propuesto: **panel lateral (drawer)**, no overlay de pantalla completa — el usuario puede ver el sistema mientras personaliza.
- Alcance reducido a lo que realmente aporta valor (a decidir con Oscar tras ver el style guide): por ejemplo, tema claro/oscuro, color de acento, tamaño de fuente. Se elimina la complejidad de "plantillas de negocio", galería de 30+ fondos, estilos de dock, etc., salvo que se pida explícitamente recuperarlos.
- Persistencia: se evalúa si sigue siendo `localStorage` (como hoy) o pasa a preferencia de usuario en BD (`user_preferences`, ya existe en dominio) — **decisión a tomar antes de implementar**, no implícita.

---

## 21. Fases de implementación propuestas

| Fase | Entregable | Depende de |
|---|---|---|
| **0** | Recibir maqueta(s) aprobadas + acuerdo de alcance de "Personalizar simple" | Oscar |
| **1** | Style guide aislado (`/dev/styleguide`): paleta, tipografía, botón, input, tarjeta, tabla, modal/drawer, badges | Fase 0 |
| **2** | Nuevo AppShell + navegación (sin contenido nuevo aún, páginas actuales montadas dentro del shell nuevo) | Fase 1 |
| **3** | Nuevo Dashboard | Fase 2 |
| **4** | Pacientes (lista + ficha + FVO) | Fase 2 |
| **5** | Expediente clínico + Odontograma | Fase 2 |
| **6** | Plan de tratamiento + Presupuestos + Cobros | Fase 2 |
| **7** | Agenda | Fase 2 |
| **8** | Documentos (si se activa) + Portal (placeholder) | Fase 2 |
| **9** | Nuevo "Personalizar" simple lateral | Fase 1 + 2 |
| **10** | Limpieza: borrar componentes/archivos viejos ya sustituidos, barrido final | Todas las anteriores validadas |

Cada fase es un commit (o pocos commits) independiente, con su propia validación y aprobación — **no se avanza a la siguiente fase sin aprobación de la anterior**.

---

## 22. Qué se valida visualmente en cada fase

- Captura de la(s) pantalla(s) nuevas junto a la maqueta de referencia, lado a lado.
- Verificación de que los datos mostrados son reales (vienen del backend), no inventados.
- Verificación de que los roles sin permiso no ven lo que no deben (re-chequeo rápido con el rol Recepción, igual que en fases anteriores).
- Verificación de que no se rompió ninguna pantalla ya migrada (regresión visual rápida).

---

## 23. Screenshots a entregar antes de cada commit

Por cada fase, antes de pedir aprobación de commit:
1. Screenshot de la pantalla nueva (estado vacío y con datos reales si aplica).
2. Screenshot comparativo contra la maqueta/referencia aprobada de esa fase.
3. Si la fase toca navegación o permisos: screenshot con el rol Recepción (front_desk) para confirmar que la visibilidad de módulos sigue siendo correcta.
4. Reporte de archivos modificados (lista exacta).

---

## 23.1 Checklist obligatorio por fase (antes de pedir aprobación de commit)

Toda fase debe entregar, sin excepción, lo siguiente antes de que Oscar evalúe el commit:

- [ ] Screenshot de la pantalla nueva contra la maqueta/referencia aprobada (punto 0.1).
- [ ] Screenshot de la pantalla nueva con datos reales (no inventados).
- [ ] Si la fase toca navegación/permisos: screenshot con el rol Recepción (front_desk).
- [ ] `npm test` → resultado completo (X/X).
- [ ] `npx tsc --noEmit` → limpio.
- [ ] `npm run build` → exitoso.
- [ ] `git diff --stat` del cambio propuesto.
- [ ] Lista exacta de archivos tocados (creados/modificados/eliminados).
- [ ] Propuesta de rollback específica para esa fase (qué commit(s) revertir y qué queda intacto).

Sin este checklist completo, no se solicita ni se realiza commit.

---

## 24. Qué pruebas deben correr en cada fase

- `npm test` → confirmar 1467/1467 (o el total vigente) sin caídas.
- `npx tsc --noEmit` → limpio.
- `npm run build` → exitoso.
- Si la fase agrega componentes nuevos con lógica (no solo presentación), se evalúa si necesitan pruebas estructurales nuevas (siguiendo el patrón `tests/phase-1m-*.test.ts`), a decidir por fase.

---

## 25. Riesgos

- **Riesgo de alcance**: "rehacer todo visualmente" es grande — mitigado por fases pequeñas, una pantalla a la vez, con aprobación entre fases.
- **Riesgo de regresión funcional**: al reemplazar componentes, se puede romper una acción (crear cita, registrar pago, etc.) — mitigado por mantener los server actions intactos y solo cambiar la presentación, más `npm test` en cada fase.
- **Riesgo de permisos**: una navegación nueva podría exponer accidentalmente un módulo a un rol sin permiso — mitigado por el checklist obligatorio de la sección 23.1 en cada fase que toque navegación.
- **Riesgo de "deriva de diseño"**: sin maqueta aprobada de antemano, cada pantalla puede verse distinta — mitigado por el style guide de la Fase 1, usado como única referencia.
- **Riesgo de tiempo/costo**: 9 flujos + shell + personalizar es trabajo sustancial — mitigado por priorizar (Dashboard + Pacientes + Agenda + Odontograma + dinero primero, según "objetivo del mes" de CLAUDE.md).

---

## 26. Rollback

- Cada fase vive en su propio commit (o serie corta de commits) sobre `main`, sin tocar backend — revertir una fase es un `git revert` de esos commits puntuales, sin afectar datos ni esquema.
- Mientras una fase nueva no esté aprobada, la pantalla/componente viejo sigue activo y funcional (no se elimina hasta que lo nuevo esté validado) — así nunca hay una ventana sin pantalla funcionando.
- El backup `nelzzon back up.zip` (commit `401efa3`) sirve como punto de referencia "antes del rebuild visual" si se necesitara comparar o recuperar algo del diseño anterior.
- Ningún paso de este plan incluye `git push` ni deploy — el rollback en este repo local siempre es posible mientras no se haya hecho push de la fase en cuestión.

---

## 27. Reglas no negociables de este rebuild (vigentes en todas las fases)

- **NO tocar RBAC.**
- **NO agregar `clinical.view` a Recepción** (front_desk) ni dar acceso clínico a roles que no lo tienen, bajo ningún pretexto visual.
- **NO tocar migraciones** (existentes ni crear nuevas) como parte de este rebuild.
- **NO tocar `.env` ni `.env.example`.**
- **NO tocar producción** (VPS, PM2, dominio) en ninguna fase de este plan.
- **NO push.**
- **NO deploy.**

Estas reglas aplican a todas las fases (0–10) sin excepción. Cualquier necesidad real de tocar alguno de estos puntos se detiene, se documenta como propuesta aparte (con plan/riesgo/pruebas/rollback propios) y se espera aprobación explícita — nunca se mezcla con trabajo visual.

---

## Siguiente paso

Esperar a que Oscar entregue la maqueta/dirección visual aprobada y complete el registro de referencias (punto 0.1) antes de iniciar la Fase 1 (style guide). No se escribe código de UI nueva hasta tener eso.
