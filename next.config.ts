import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "localhost:3001"] },
  },
  // Paquetes de servidor (DB, auth) corren en Node.js nativo, fuera del bundle webpack.
  serverExternalPackages: [
    "better-auth",
    "@better-auth/prisma-adapter",
    "@better-auth/kysely-adapter",
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "kysely",
    "pg",
  ],
  webpack(config) {
    // El backend usa importaciones estilo NodeNext (.js → .ts).
    // Webpack necesita esta alias para resolverlas correctamente.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
