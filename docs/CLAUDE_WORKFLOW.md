# Reglas de trabajo con Claude Code en LOOLO/nelzzon

> Objetivo de este documento: avanzar más rápido sin perder control. Define
> en qué modo opera Claude Code según el tipo de tarea, y las reglas
> permanentes que aplican siempre, sin importar el modo.

---

## 0. Regla no negociable

**Claude Code debe actuar siempre como auditor senior, mejor desarrollador,
programador experto y responsable de producción antes de tocar cualquier
archivo.** La velocidad no elimina auditoría; solo reduce pasos cuando el
riesgo es bajo.

---

## 1. Modos de trabajo

Cada fase se anuncia indicando (explícita o implícitamente) en qué modo opera.
Si no queda claro, Claude Code debe preguntar antes de avanzar.

### Modo 1 — Auditoría pura
**Cuándo:** DB, Prisma, migraciones, autenticación, permisos/RBAC, RLS,
producción/infraestructura, ciberseguridad.
**Cómo opera:** **auditar y detenerse.** Solo investiga y reporta. No edita
código, no propone cambios en el mismo turno salvo que se le pida
explícitamente una propuesta. Entrega hallazgos + riesgos + propuesta mínima,
y espera aprobación antes de tocar nada — incluso si el cambio parece trivial.

### Modo 2 — Ejecución controlada
**Cuándo:** cambios de bajo riesgo y alcance acotado (UI, lectura de datos,
funciones nuevas sobre backend ya probado, ajustes de componentes existentes).
**Cómo opera:** **auditar primero; si el riesgo es bajo, implementar y
validar; detenerse antes de commit.** Puede auditar + implementar + validar
(`tsc`, `npm test`, `npm run build`) en un solo turno aprobado, pero **se
detiene antes de `git add`/commit/push** y reporta para que el dueño decida
si cierra. Saltarse la auditoría inicial no es una opción válida — la
velocidad viene de no repetir pasos de validación, no de omitirlos.

### Modo 3 — Cierre rápido
**Cuándo:** documentación o cambios triviales ya validados (p. ej. el propio
cierre de una fase anterior).
**Cómo opera:** **incluso en docs o cambios triviales, revisar alcance y
archivos antes de modificar.** Prepara y ejecuta commit/push **solo con
autorización explícita** que indique exactamente qué archivos, mensaje de
commit y si incluye push. "Trivial" describe el riesgo del cambio, no el
cuidado con que se revisa.

---

## 2. Reglas permanentes (aplican en los 3 modos)

- **No `git add .`** — solo archivos nombrados explícitamente.
- **No incluir `.claude/settings.local.json`** en ningún commit (tiene cambios
  locales propios del dueño, ajenos al trabajo de Claude Code).
- **No tocar `.env`** ni archivos de credenciales.
- **No DB / Prisma / migraciones** sin aprobación explícita — son cambios de
  esquema que requieren revisión del dueño antes de tocarse (regla NO
  NEGOCIABLE de `CLAUDE.md`).
- **No deploy** sin aprobación explícita.
- **No commit / push** sin aprobación explícita — ni siquiera tras validar
  todo en verde.
- **Siempre reportar al cerrar una tarea:** archivos tocados, qué cambió,
  resultado de pruebas (`tsc`/`npm test`/`npm run build` según aplique),
  `git status --short`, y siguiente paso sugerido.

---

## 3. Objetivo actual

**Terminar Odontología lo antes posible** — premium, robusta, superior a la
competencia. Esto guía las prioridades: cuando haya que elegir qué construir
primero, se prefiere lo que acerca la cadena agenda → consulta → odontograma
→ plan → presupuesto → cobro a un estado usable y pulido en producción.

---

## 4. Separación de fases — qué queda pendiente y por qué

Estas líneas de trabajo tienen su propio momento; no se mezclan con el avance
diario de Odontología salvo que se decida explícitamente lo contrario:

- **Personalizar** — queda pendiente (UI de personalización del espacio).
- **Buscador global** — queda pendiente (búsqueda multi-entidad futura, más
  allá de pacientes).
- **Seguridad profunda / ciberseguridad** — tendrá su propia fase dedicada,
  separada del ritmo de construcción de producto.
- **Finanzas / fiscal / facturación** — en fases propias, dado su nivel de
  sensibilidad y rigor regulatorio (CFDI, datos fiscales, dinero).

Mantener esta separación evita que una fase de "avanzar rápido" termine
tocando, sin querer, un área que requiere su propio nivel de cuidado.
