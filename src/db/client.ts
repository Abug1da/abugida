import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// "prefer": use TLS when the server offers it (Railway's Postgres image does), plain otherwise
// (local Docker Postgres).
export function createDb(url: string, max = 10): Db {
  return drizzle(postgres(url, { max, ssl: "prefer" }), { schema });
}

/** A transaction handle; read helpers accept either so they can run inside one. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
