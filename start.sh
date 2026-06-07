#!/bin/bash
# Wrapper de arranque para PM2 en producción con Next.js 15.
#
# Por qué existe: Next.js 15 renombra su proceso a "next-server" y en algunos
# entornos PM2 pierde el rastro del PID padre, causando EADDRINUSE en el
# siguiente reinicio. Este script libera el puerto 3000 antes de cada inicio
# para romper ese ciclo.
#
# Uso: pm2 start ecosystem.config.cjs
# (ecosystem.config.cjs apunta a este script como script de inicio)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fuser -k 3000/tcp 2>/dev/null || true
sleep 1
node "$SCRIPT_DIR/node_modules/next/dist/bin/next" start -p 3000
