# Nelzzon — Línea base de producción

> Última actualización: 2026-06-06  
> Commit HEAD (origin/main): `127aa1c`

Este documento marca el punto en el que el proyecto pasa a operar bajo la marca
**nelzzon** y el dominio principal **https://nelzzon.com**, dejando **loolo.mx**
como respaldo temporal. Es la referencia para cualquier sesión futura que necesite
saber "cuál es la producción real hoy".

---

## Estado validado

| Punto | Valor |
|---|---|
| Sistema público | nelzzon |
| Dominio principal | https://nelzzon.com — HTTP 200 en `/login` ✅ |
| Dominio anterior (respaldo temporal) | https://loolo.mx — HTTP 200 en `/login` ✅ (vivo, NO redirigir todavía) |
| GitHub / rama | `origin/main` @ `127aa1c` |
| Login real validado | `omalvido@gmail.com` en https://nelzzon.com ✅ |
| VPS — ruta del proyecto | `~/Desktop/SAAS/loolo` |
| VPS — proceso PM2 | `loolo` — online, build OK |
| VPS — working tree | limpio (backups archivados fuera del repo) |

### Variables de entorno activas en PM2 (VPS)

```
BETTER_AUTH_URL=https://nelzzon.com
NEXT_PUBLIC_APP_URL=https://nelzzon.com
BETTER_AUTH_TRUSTED_ORIGINS=https://nelzzon.com,https://www.nelzzon.com,https://loolo.mx,https://www.loolo.mx
```

`loolo.mx`/`www.loolo.mx` se mantienen en `BETTER_AUTH_TRUSTED_ORIGINS` precisamente
para que el dominio de respaldo siga funcionando mientras está vivo.

---

## Nombres técnicos que siguen diciendo "loolo" (a propósito)

Estos NO se tocan todavía — son identificadores técnicos internos, no marca visible.
Cambiarlos sin coordinación puede romper el deploy (rutas, PM2, git remoto):

| Elemento | Valor actual | Por qué se queda así por ahora |
|---|---|---|
| Carpeta del proyecto en el VPS | `~/Desktop/SAAS/loolo` | Renombrar implica reconfigurar rutas/symlinks/cron en el VPS |
| Proceso PM2 | `loolo` | Renombrar implica `pm2 delete` + recrear; riesgo de downtime |
| Repositorio GitHub | `omalvido-hub/loolo.mx` | Renombrar repo cambia URLs remotas; coordinar antes de tocar |
| `package.json` `"name"` | `"loolo"` | Nombre técnico del paquete npm; no afecta marca visible |
| Comentarios de cabecera en `src/server/**` y similares | `// LOOLO — ...` | Texto interno de desarrollo, no visible al usuario final |

La marca visible (UI, login, sidebar, metadata, buscador) ya usa la constante
`APP_NAME` (`"nelzzon"`) en `src/lib/brand.ts` — ver commits `16c7bad` y `0ae283d`.

---

## Qué SÍ cambió ya (marca visible y config pública)

- `src/lib/brand.ts` — `APP_NAME = "nelzzon"`, `APP_URL = NEXT_PUBLIC_APP_URL ?? "https://nelzzon.com"`
- Login, sidebar, `<title>`/metadata y placeholder del buscador global usan `APP_NAME`/`APP_URL`
- `.env.example` documenta `NEXT_PUBLIC_APP_URL`

## Qué falta (próximos pasos, NO autónomos — requieren autorización explícita)

- Decidir cuándo redirigir `loolo.mx` → `nelzzon.com` (hoy ambos sirven 200, por diseño)
- Eventual renombrado coordinado de carpeta VPS / proceso PM2 / repo (no urgente)
- Actualizar `docs/LOOLO_ODONTOLOGIA_STATE.md` y `NEXT_CHAT_STARTER.md` por completo
  cuando `loolo.mx` deje de ser el nombre de referencia histórico (hoy documentan
  ambos estados: el legado y el nuevo principal)

---

## Referencia rápida de comandos (sin tocar nada — solo para diagnóstico)

```bash
# Ver estado de producción (en VPS)
cd ~/Desktop/SAAS/loolo
git rev-parse --short HEAD
pm2 status
curl -sI https://nelzzon.com/login | head -5
curl -sI https://loolo.mx/login | head -5
```
