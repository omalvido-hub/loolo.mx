// Ejemplo de configuración PM2 para producción.
// NO versionar ecosystem.config.cjs — contiene credenciales reales.
// El VPS mantiene su propio ecosystem.config.cjs con los valores reales.
//
// Para crear el archivo real en el VPS:
//   cp ecosystem.config.example.cjs ecosystem.config.cjs
//   # Luego editar ecosystem.config.cjs con las credenciales reales.
//
// NOTA: Usar la extensión .cjs (no .js) porque el proyecto tiene
// "type": "module" en package.json. El sufijo .cjs fuerza modo CommonJS.

module.exports = {
  apps: [{
    name: 'loolo',
    script: '/ruta/absoluta/al/proyecto/start.sh',
    cwd: '/ruta/absoluta/al/proyecto',
    // autorestart: false previene el loop de EADDRINUSE causado por Next.js 15.
    // Ver start.sh para el contexto completo.
    autorestart: false,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      RUNTIME_DATABASE_URL: process.env.RUNTIME_DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    },
  }],
};
