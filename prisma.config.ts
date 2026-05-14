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
    url: getDatabaseUrl(),
  },
});

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRE_SQL_POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    ""
  );
}
