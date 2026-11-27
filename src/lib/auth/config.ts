import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";

type AuthEnv = { BETTER_AUTH_SECRET?: string; BETTER_AUTH_URL?: string };

// Pure factory with no request or server-only imports, so the Better Auth CLI can load it too.
export function createAuth(db: DrizzleD1Database<typeof schema>, env: AuthEnv = {}) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: { enabled: true },
    // Workers isolates don't share memory, so keep rate-limit counters in D1. Rate limiting only
    // covers requests through /api/auth, so auth forms must call that endpoint (authClient), not auth.api.
    rateLimit: { storage: "database" },
    // Cloudflare sets cf-connecting-ip and overwrites any client-sent value.
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    // nextCookies must stay last: it lets server actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
