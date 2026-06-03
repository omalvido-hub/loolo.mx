import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests respaldados por la MISMA base de datos: correr archivos en serie evita
    // que el reseed de catálogo de un archivo pise a otro.
    fileParallelism: false,
  },
});
