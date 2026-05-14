import { loadEnvFile } from "node:process";
import { defineConfig } from "prisma/config";

try {
  loadEnvFile(".env");
} catch {
  // The app can still build without a local .env; database commands require DATABASE_URL.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
