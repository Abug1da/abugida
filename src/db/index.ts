import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// Created on first use so `next build` doesn't need DATABASE_URL. Kept on globalThis so dev hot
// reloads reuse one connection pool instead of opening a new one per reload.
const globalForDb = globalThis as unknown as { abugidaDb?: Db };

export function getDb(): Db {
  if (!globalForDb.abugidaDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.abugidaDb = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.abugidaDb;
}
