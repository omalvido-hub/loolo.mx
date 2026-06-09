# Nelzzon — Deploy Runbook de Producción

> Versión: 1.0  
> Última actualización: 2026-06-09  
> HEAD validado en producción: `792ebc9`  
> Responsable del proceso: Oscar (dueño del proyecto)

Este runbook es la referencia obligatoria para cualquier deploy de Nelzzon en producción.
No se ejecuta ningún paso sin leer primero las **Reglas no negociables**.

---

## 1. Estado de referencia de producción

| Punto | Valor |
|---|---|
| Dominio principal | https://nelzzon.com |
| Dominio alternativo | https://www.nelzzon.com |
| VPS path | `/root/Desktop/SAAS/nelzzon` |
| PM2 process | `nelzzon` |
| Puerto | `3000` |
| HEAD validado | `792ebc9` |
| Health esperado | `GET /login` → HTTP 200 (local y público) |
| Base de datos | PostgreSQL 16 — `app_user` (runtime, RLS) / `app_admin` (migrations) |
| Almacenamiento | Cloudflare R2 (cuando `DOCUMENT_STORAGE_DRIVER=r2`) |
| Auth | Better Auth 1.6 — tablas `users`, `sessions`, `verifications` |
| Archivos sensibles | `.env`, `ecosystem.config.cjs` — nunca trackeados, `chmod 600` |

### Arquitectura del arranque PM2

```
ecosystem.config.cjs (VPS, no versionado)
  └── exec_file: start.sh
        ├── fuser -k 3000/tcp   ← mata proceso previo en puerto 3000
        ├── sleep 1
        └── node .../next start -p 3000
```

`autorestart: false` en `ecosystem.config.cjs` previene loops de EADDRINUSE.
Si el proceso muere, se queda muerto — no reinicia solo. Esto es correcto e intencional.

---

## 2. Reglas NO negociables

1. **No deploy sin preflight completo.** Nunca `git pull` sin haber verificado el estado de producción antes.
2. **No reiniciar PM2 si el build falla.** Si `npm run build` termina con error, producción sigue corriendo con el build anterior intacto. No tocar PM2.
3. **No tocar `.env` durante el deploy.** Las variables de entorno solo se modifican de forma explícita y coordinada, no como efecto secundario de un deploy.
4. **No tocar DB ni migraciones en deploy estándar.** Las migraciones son una fase separada con aprobación explícita de Oscar. Un deploy que no incluye migración no toca Prisma ni SQL.
5. **No imprimir secretos en consola ni en reportes.** `DATABASE_URL`, `RUNTIME_DATABASE_URL`, `BETTER_AUTH_SECRET`, `R2_SECRET_ACCESS_KEY` nunca se pegan en chats ni logs visibles.
6. **Guardar `PRE_DEPLOY_COMMIT` antes de cualquier `git pull`.** Es el ancla del rollback. Sin él, el rollback no es fiable.
7. **Rollback documentado y obligatorio** si PM2 entra en estado degradado después del restart.
8. **No modificar código en el VPS.** El VPS solo ejecuta `git pull` de código ya testeado y pusheado desde local. Nunca editar archivos directamente en producción.
9. **No usar `git reset --hard` salvo rollback explícito** con `PRE_DEPLOY_COMMIT` ya guardado.
10. **No usar `pm2 restart all` ni `pm2 reload all`.** Solo `pm2 restart nelzzon --update-env` para el proceso específico.

---

## 3. Preflight antes de cualquier deploy

Ejecutar **en el VPS** en este orden exacto:

```bash
cd /root/Desktop/SAAS/nelzzon

echo "=== PWD ===" && pwd

echo "=== GIT STATUS ===" && git status --short

echo "=== LOCAL HEAD ===" && git log --oneline -5

echo "=== PM2 ===" && pm2 status nelzzon

echo "=== PUERTO 3000 ===" && ss -ltnp | grep ':3000' || echo "(sin proceso en 3000)"

echo "=== HEALTH LOCAL ===" && curl -sI http://127.0.0.1:3000/login | head -3 || true
echo "=== HEALTH PÚBLICO ===" && curl -sI https://nelzzon.com/login | head -3 || true

# Guardar ancla de rollback — OBLIGATORIO antes de continuar
PRE_DEPLOY_COMMIT=$(git rev-parse HEAD)
echo "PRE_DEPLOY_COMMIT=$PRE_DEPLOY_COMMIT"

echo "=== FETCH ===" && git fetch origin main

echo "=== COMMITS A DESPLEGAR ===" && git log --oneline HEAD..origin/main

echo "=== ARCHIVOS CAMBIADOS ===" && git diff --name-only HEAD..origin/main
```

---

## 4. Criterios para DETENERSE (no continuar con el deploy)

Detener si cualquiera de estos se cumple:

| Condición | Acción |
|---|---|
| `git status` muestra archivos inesperados trackeados | Investigar antes de continuar |
| `git status` muestra `.env`, `ecosystem.config.cjs` como modified/staged | ALTO — revisar, nunca commitear |
| Los commits a desplegar incluyen migraciones no autorizadas | DETENERSE, escalar a Oscar |
| Los commits a desplegar incluyen cambios fuera del scope acordado | DETENERSE, revisar |
| `npm run build` previo falló (`.next/` incompleto o ausente) | Resolver antes de continuar |
| Producción no responde (health local o público falla) antes del deploy | Diagnosticar primero |
| PM2 está en `errored`, `stopped` o unstable antes del deploy | Estabilizar antes de continuar |
| `git log HEAD..origin/main` muestra commits no conocidos | DETENERSE, verificar con Oscar |

---

## 5. Deploy seguro (paso a paso)

Solo ejecutar si el preflight pasó todos los criterios.

### Paso 1 — Pull

```bash
git pull --ff-only origin main

echo "=== HEAD AFTER PULL ===" && git log --oneline -3
echo "=== STATUS AFTER PULL ===" && git status --short
```

`--ff-only` garantiza que no hay merge commit accidental. Si falla, hay divergencia — no continuar.

### Paso 2 — Build

```bash
npm run build
```

**Si el build falla:**
- NO tocar PM2.
- Producción sigue corriendo con el build anterior.
- Reportar el error.
- El siguiente restart de PM2 (si ocurriera) usaría el `.next/` roto — no hay `.next/` roto si no se restartó.

**Verificar que el build terminó limpio:**

```bash
echo "BUILD_EXIT=$?" # debe ser 0
ls -la .next/BUILD_ID && echo "BUILD_ID OK"
```

### Paso 3 — Restart PM2

Solo si BUILD_EXIT=0 y BUILD_ID existe:

```bash
pm2 restart nelzzon --update-env
sleep 5
```

`--update-env` aplica variables de entorno actualizadas desde `ecosystem.config.cjs`.

---

## 6. Validación post-deploy

```bash
echo "=== PM2 STATUS ===" && pm2 status nelzzon

echo "=== LOGS (últimas 40 líneas) ===" && pm2 logs nelzzon --lines 40 --nostream

echo "=== PUERTO 3000 ===" && ss -ltnp | grep ':3000' || echo "(sin proceso en 3000)"

echo "=== HEALTH LOCAL ===" && curl -sI http://127.0.0.1:3000/login | head -3
echo "=== HEALTH PÚBLICO ===" && curl -sI https://nelzzon.com/login | head -3

echo "=== HEAD FINAL ===" && git log --oneline -3
```

### Criterios de éxito

| Criterio | Esperado |
|---|---|
| PM2 `nelzzon` | `online` |
| PM2 unstable restarts | `0` |
| Puerto 3000 | activo |
| `GET /login` local | HTTP 200 |
| `GET /login` público | HTTP 200 |
| Logs | Sin `Could not find a production build` ni `EADDRINUSE` ni crash loop |
| HEAD | Igual al commit esperado |

---

## 7. Rollback

### Cuándo aplica

- PM2 entra en crash loop o `errored` después del restart.
- `GET /login` devuelve 500 o no responde.
- Logs muestran `Could not find a production build in the '.next' directory`.
- Error crítico de aplicación no presente antes del deploy.

### Procedimiento de rollback

```bash
# Usar el PRE_DEPLOY_COMMIT guardado en el preflight
git reset --hard "$PRE_DEPLOY_COMMIT"

# Rebuild con el código anterior
npm run build

# Solo si build termina con exit 0
pm2 restart nelzzon --update-env
sleep 5

pm2 status nelzzon
pm2 logs nelzzon --lines 40 --nostream
curl -sI http://127.0.0.1:3000/login | head -3
curl -sI https://nelzzon.com/login | head -3
```

### Si PM2 entra en loop EADDRINUSE (independiente del deploy)

```bash
pm2 stop nelzzon
pm2 delete nelzzon
fuser -k 3000/tcp
sleep 2
pm2 start ecosystem.config.cjs
sleep 5
pm2 status nelzzon
```

> Por qué ocurre: Next.js 15 puede renombrar su proceso a `next-server`. Si PM2 pierde el PID padre y tiene `autorestart: true`, intenta reiniciar en un puerto ya ocupado. Con `autorestart: false` en `ecosystem.config.cjs` el proceso muere limpiamente. `start.sh` hace `fuser -k 3000/tcp` antes de cada inicio para romper el ciclo.

---

## 8. Manejo de archivos sensibles

| Archivo | Regla |
|---|---|
| `.env` | Nunca se versionará. Solo existe en VPS. `chmod 600`. No imprimir contenido. |
| `ecosystem.config.cjs` | Nunca se versionará. Solo existe en VPS. `chmod 600`. Contiene credenciales reales. |
| `ecosystem.config.example.cjs` | Versionado. Sin credenciales reales. Plantilla para crear el `.cjs` real. |
| `.env.example` | Versionado. Solo valores `CHANGE_ME`. Plantilla pública. |
| `.env.local.disabled-*` | Backups históricos. Nunca stagear, nunca pushear, mantener fuera del repo. |

**Cómo crear `ecosystem.config.cjs` desde cero (si se pierde):**

```bash
cp ecosystem.config.example.cjs ecosystem.config.cjs
chmod 600 ecosystem.config.cjs
# Editar ecosystem.config.cjs con las credenciales reales del VPS
# Nunca usar ecosystem.config.js — package.json tiene "type":"module", falla
```

**Verificación de permisos:**

```bash
stat -c "%a %n" .env ecosystem.config.cjs
# Debe mostrar: 600 .env  600 ecosystem.config.cjs
```

---

## 9. Checklist de reporte post-deploy

Copiar y completar en el chat al terminar cada deploy:

```
VALIDADO:
NO VALIDADO:
PRE_DEPLOY_COMMIT:
POST_DEPLOY_COMMIT:
COMMITS DESPLEGADOS:
ARCHIVOS CAMBIADOS:
BUILD:           [ OK / FALLÓ ]
PM2:             [ online / errored / stopped ]
UNSTABLE RESTARTS: [ 0 / N ]
HEALTH LOCAL:    [ HTTP 200 / FALLO ]
HEALTH PÚBLICO:  [ HTTP 200 / FALLO ]
LOGS:            [ sin errores críticos / errores encontrados: ]
ROLLBACK:        [ no / sí — motivo: ]
QUÉ NO SE TOCÓ:
DICTAMEN:        [ DEPLOY EXITOSO / ROLLBACK EJECUTADO / PENDIENTE ]
```

---

## 10. Notas de riesgo y observabilidad pendiente

Estas notas no requieren acción inmediata pero deben considerarse antes de escalar en usuarios:

| Ítem | Descripción | Prioridad |
|---|---|---|
| Sin log rotation | Los logs de PM2 crecen sin límite. Configurar `pm2 install pm2-logrotate` antes de superar ~100 usuarios activos. | Media |
| Sin alertas de caída | No hay monitoreo externo que notifique si producción cae. Considerar UptimeRobot o similar. | Media |
| Server Action IDs no deterministas | Los IDs de Server Actions cambian en cada `npm run build`. Browsers con HTML cacheado pueden recibir "Failed to find Server Action" hasta refrescar. No es bug — es comportamiento de Next.js App Router. | Informativo |
| Tokens de reset de contraseña sin activar | `sendResetPassword` no está configurado. El endpoint `/api/auth/forget-password` existe pero devuelve error. Activar requiere proveedor de email (Resend recomendado). | Baja (MVP) |
| Email verification no activo | `requireEmailVerification: false` (default). Cualquier email puede registrar cuenta. Aceptable en fase piloto. | Baja (MVP) |
| `verifications` table sin RLS | Better Auth opera con `adminDb` (BYPASSRLS). La tabla no tiene datos de tenant, solo tokens temporales de auth. No aplica RLS. Intencional. | Informativo |
| Observabilidad de errores | No hay Sentry ni equivalente. Errores no capturados solo aparecen en `pm2 logs`. Considerar antes de abrir a múltiples clínicas. | Media |

---

## 11. Referencia rápida de comandos (diagnóstico, sin deploy)

```bash
# Desde VPS — solo lectura, sin modificar nada

cd /root/Desktop/SAAS/nelzzon

# Estado general
git log --oneline -5
git status --short
pm2 status nelzzon
ss -ltnp | grep ':3000' || true

# Health
curl -sI http://127.0.0.1:3000/login | head -5
curl -sI https://nelzzon.com/login | head -5

# Logs en tiempo real (Ctrl+C para salir)
pm2 logs nelzzon

# Logs histórico sin streaming
pm2 logs nelzzon --lines 100 --nostream

# Ver BUILD_ID actual en producción
cat .next/BUILD_ID

# Ver variables de entorno activas en el proceso PM2
pm2 env 0 | grep -E "BETTER_AUTH|NEXT_PUBLIC|DATABASE|DOCUMENT"
```

---

*Runbook generado en sesión SECURITY-1. Actualizar HEAD validado y fecha después de cada deploy exitoso.*
