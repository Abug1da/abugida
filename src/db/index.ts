import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "./schema";

// D1 is only reachable through the request's Cloudflare env, so build the client per request.
export const getDb = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
});

export type Db = Awaited<ReturnType<typeof getDb>>;
