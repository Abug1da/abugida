import "server-only";
import { createDb, type Db } from "./client";

export type { Db };

// Created on first use so `next build` doesn't need DATABASE_URL. Kept on globalThis so dev hot
// reloads reuse one connection pool instead of opening a new one per reload.
const globalForDb = globalThis as unknown as { abugidaDb?: Db };

export function getDb(): Db {
  if (!globalForDb.abugidaDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.abugidaDb = createDb(url);
  }
  return globalForDb.abugidaDb;
}
