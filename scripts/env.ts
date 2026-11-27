import { loadEnvConfig } from "@next/env";
import { createDb } from "../src/db/client";

// Scripts load .env / .env.local the same way Next.js does, then talk to DATABASE_URL directly.
export function scriptDb() {
  loadEnvConfig(process.cwd());
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return createDb(url, 1);
}
