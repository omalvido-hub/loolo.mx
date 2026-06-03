import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env.DATABASE_URL as string });
    },
  },
});
