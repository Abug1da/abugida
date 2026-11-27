import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same .env / .env.local loading as Next.js, so drizzle-kit sees DATABASE_URL locally.
loadEnvConfig(process.cwd());

// `bun run db:generate` writes SQL to ./drizzle; `bun run db:migrate` applies it to DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
