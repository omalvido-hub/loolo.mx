# CLAUDE.md — Instrucciones del proyecto LOOLO

> Este archivo le da contexto a Claude Code cada vez que trabaja en este proyecto.
> Léelo completo antes de hacer cambios. Las reglas marcadas como **NO NEGOCIABLE** no se tocan sin aprobación explícita del dueño del proyecto (Oscar).

---

## 1. Qué es LOOLO

LOOLO es un **SaaS multi-tenant** tipo "sistema operativo" para PyMEs de servicios. El piloto es **odontología**, pero la arquitectura está diseñada para convertirse en una **fábrica de verticales** (medicina, fisioterapia, veterinaria, estética, taller mecánico, etc.).

Filosofía: **poderoso por dentro, simple por fuera**. El backend ya está construido y probado; ahora se construye la interfaz (UI).

Cadena de valor central (memorízala, todo gira alrededor de esto):
**conversación → cita → consulta → hallazgo (diagrama de inspección) → plan de tratamiento → presupuesto → cobro**, todo trazable y auditable.

---

## 2. Estado actual (qué YA está construido y probado)

El backend está terminado en 6 grandes fases (F1–F6B), con **182/182 pruebas verde** y 14 migraciones SQL aplicadas. NO hay que reconstruirlo. Resumen:

- **F1** — Backbone: organizaciones, usuarios, roles, permisos, contactos, conversaciones, eventos, auditoría.
- **F2A** — Seguridad: autenticación, selector de organización, accesos de soporte.
- **F2B** — Módulos/plantillas por tipo de negocio + dashboard configurable + preferencias de usuario.
- **F3A** — Identidad operativa: deduplicación de contactos (teléfono E.164 MX), fusión de contactos.
- **F3B** — "Follow": bandeja de conversaciones, asignación, tareas, clasificación.
- **F4A** — Agenda: recursos (profesional/sillón/sala), citas, reglas de disponibilidad, anti-solapamiento.
- **F5A** — Consulta clínica (encounters) + notas clínicas.
- **F5B** — Odontograma: hallazgos por pieza/superficie (FDI 11–48), append-only.
- **F5C** — Plan de tratamiento: ítems por estado, transiciones controladas, un plan ACTIVE por paciente.
- **F6A** — Presupuestos: líneas con snapshot, totales, estados, dinero en centavos MXN.
- **F6B** — Pagos: ledger append-only (PAYMENT/REVERSAL), saldos, anti-sobrepago.

---

## 3. Stack técnico

- **Framework:** Next.js + TypeScript
- **Base de datos:** PostgreSQL 16 (local en desarrollo, puerto 5432)
- **ORM/migraciones:** Prisma 7 (driver-adapter `pg`). Las migraciones reales son **SQL escritas a mano** en `prisma/migrations/00XX_*.sql`. El `schema.prisma` es la fuente de diseño.
- **Auth:** Better Auth 1.6
- **Validación:** Zod 4
- **Pruebas:** Vitest (corren contra Postgres real)

### Scripts (package.json)
- `npm test` — corre las pruebas (vitest run)
- `npm run db:push` — aplica el schema Prisma
- `npm run seed` — carga datos de prueba
- `npm run seed:modules` — carga catálogo de módulos
- `npm run rls:apply` — aplica políticas RLS

### Base de datos — dos roles (NO NEGOCIABLE)
- `app_admin` — migraciones e identidad. Tiene BYPASSRLS y puede instalar extensiones.
- `app_user` — runtime de la aplicación. Sujeto a RLS (aislamiento por tenant). **Toda consulta de la app corre como app_user.**
- Credenciales en `.env`: `DATABASE_URL` (app_admin) y `RUNTIME_DATABASE_URL` (app_user).

---

## 4. Reglas que NO se tocan sin aprobación (NO NEGOCIABLE)

1. **Aislamiento multi-tenant por RLS.** Cada tabla con datos de cliente filtra por `organizationId` vía Row Level Security (FORCE). El patrón es `NULLIF(current_setting('app.current_tenant_id', true),'')::uuid`. Nunca exponer datos de un tenant a otro. Nunca confiar solo en la aplicación: la seguridad vive en la base de datos.
2. **Dinero en CENTAVOS enteros (BIGINT), nunca float/decimal flotante.** Moneda MXN. Redondeo half-up por línea; el encabezado es la suma de líneas. Los totales se recalculan SIEMPRE en el servidor, nunca se confía en montos que manda el cliente.
3. **Inmutabilidad financiera y clínica.** Pagos = ledger append-only (un error se corrige con un asiento REVERSAL, jamás editando el original). Odontograma y notas clínicas = append-only. Presupuestos = editables solo en estado DRAFT.
4. **Permisos por rol (RBAC).** Convención `recurso.accion` (con punto). Roles: owner, admin, front_desk, clinician, billing, accountant. Toda operación sensible verifica permiso antes de escribir y registra `permission.denied` en auditoría si se niega.
5. **Tres bitácoras.** `events` (eventos versionados con Zod), `audit_logs` (auditoría), y logs específicos. **Nunca** poner en eventos ni en auditoría: texto clínico libre, montos sensibles fuera de lo permitido, datos de tarjeta/PAN/CLABE, notas o diagnósticos.
6. **Datos de salud y dinero = máximo rigor.** Acceso estrecho por permisos; sin contenido sensible en eventos; auditoría sin texto libre.
7. **No modificar las 14 migraciones existentes (0001–0014).** Cualquier cambio de esquema es una migración NUEVA y aditiva, y requiere aprobación.

---

## 5. Requisito de producto: "diagrama de inspección" por profesión (NO NEGOCIABLE)

Cada profesión/vertical debe incluir **de fábrica** su propio **diagrama de inspección visual** — el equivalente al odontograma: un dibujo + zonas marcables con un estado. Más sus especialidades ya cubiertas dentro de la profesión.

- **Odontología** → boca con piezas (FDI). Especialidades incluidas: endodoncia, ortodoncia, periodoncia, etc. (usan el mismo odontograma).
- **Mecánico** → coche con zonas (verde/amarillo/rojo).
- **Fisioterapia** → cuerpo humano con zonas.
- **Dermatología/estética** → silueta facial/corporal.
- **Veterinaria** → animal + carnet de vacunas.
- **Nutrición** → mediciones + gráfica de progreso.

Técnicamente es **el mismo motor** (hallazgos → plan → presupuesto → cobro); lo único que cambia por profesión es **el dibujo y el catálogo de zonas/términos**. NO es opcional: toda profesión nueva se diseña ya con su diagrama y sus especialidades.

---

## 6. Cómo construir la UI (fase actual)

### Objetivo del mes
Llevar a **una clínica dental operando al 100% en producción**: agenda → consulta → odontograma → plan → presupuesto → cobro, con UI usable, desplegado. WhatsApp/IA/dashboards avanzados y multi-vertical quedan para después.

### Orden de construcción (no saltarse)
1. **Esqueleto:** login, layout con menú lateral, conexión de la UI con el backend existente.
2. **Pacientes + Agenda.**
3. **Consulta + odontograma visual** (pantalla estrella).
4. **Plan de tratamiento + presupuesto + cobro** (la cadena del dinero).
5. **Dashboard + onboarding dental.**

### Principios de construcción
- **Reusar el backend tal cual.** No reescribir lógica de dominio ya probada. La UI consume el dominio existente en `src/server/domain/`.
- **Velocidad con librería de componentes.** Usar un design system / librería de componentes profesional (no diseñar cada pantalla desde cero a mano). Tailwind + componentes prehechos.
- **UI en español** (mercado México). Tono simple, profesional, claro. Fechas en zona horaria America/Mexico_City.
- **Cada pantalla respeta los permisos del rol.** Si un rol no tiene permiso, no ve ni puede ejecutar la acción.
- **No inventar campos ni montos.** Los datos vienen del backend; los totales los calcula el servidor.

---

## 7. Deploy PM2 / Next.js 15 (producción en VPS)

### Archivos de infra en el repo
- **`start.sh`** — wrapper de arranque; versionado, sin secretos.
- **`ecosystem.config.example.cjs`** — plantilla PM2; versionada, sin secretos.
- **`ecosystem.config.cjs`** — configuración real con credenciales; **NO versionado**, vive solo en el VPS. Ignorado por `.gitignore`.

### Deploy normal
```bash
git pull
npm run build
pm2 restart loolo
```

### Por qué existe `start.sh`
Next.js 15 puede renombrar su proceso a `next-server` y en algunos entornos PM2 pierde el rastro del PID padre. En el siguiente reinicio PM2 intenta arrancar en el puerto 3000 que ya está ocupado → EADDRINUSE. `start.sh` mata cualquier proceso en puerto 3000 (`fuser -k 3000/tcp`) antes de cada inicio, rompiendo ese ciclo.

### Si PM2 entra en loop EADDRINUSE
```bash
pm2 stop loolo
pm2 delete loolo
fuser -k 3000/tcp
# esperar 2 segundos
pm2 start ecosystem.config.cjs
```

### Reglas de infraestructura
- Nunca subir `ecosystem.config.cjs` al repo — contiene credenciales reales.
- No usar `ecosystem.config.js` — falla porque `package.json` tiene `"type": "module"`. Usar siempre `.cjs`.
- El archivo real en el VPS se genera copiando el ejemplo y rellenando credenciales: `cp ecosystem.config.example.cjs ecosystem.config.cjs`.

---

## 8. Modo de trabajo con Claude Code

- Antes de un bloque grande de UI: proponer un plan corto (qué pantallas, qué componentes) y esperar OK.
- Cambios pequeños y no arquitectónicos: hacerlos y reportar.
- Cambios que tocan esquema, RLS, permisos, eventos, auditoría o migraciones: **DETENERSE y pedir aprobación** antes de implementar.
- Correr `npm test` después de cambios que toquen el backend, y confirmar que siguen 182/182 (o el nuevo total si se agregan pruebas).
- Reportes cortos, en español, sin tecnicismos innecesarios.
- Nunca degradar la seguridad ni la inmutabilidad para "ir más rápido".

---

## 8. Glosario rápido

- **Tenant / organización:** una clínica. Todo dato pertenece a una `organizationId`.
- **Odontograma:** mapa visual de la dentadura donde se marcan hallazgos por pieza/superficie.
- **Hallazgo (finding):** algo encontrado sobre una pieza (caries, corona, etc.). Append-only.
- **Plan de tratamiento:** conjunto de procedimientos propuestos, con estados.
- **Presupuesto (quote):** cotización con líneas y totales; editable solo en DRAFT.
- **Pago (payment):** asiento en el ledger; PAYMENT o REVERSAL; inmutable.
- **FDI:** numeración dental internacional (11–48 para dientes permanentes).
