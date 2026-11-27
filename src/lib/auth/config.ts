import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";

// Pure factory with no server-only imports, so the Better Auth CLI can load it too.
export function createAuth(db: PostgresJsDatabase<typeof schema>) {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        // "admin" can use /admin. Never settable from sign-up or the API (input: false); granted
        // only by `bun run admin:grant <email>`.
        role: { type: "string", required: false, defaultValue: "learner", input: false },
      },
    },
    // Rate limiting only covers requests through /api/auth, so auth forms must call that endpoint
    // (authClient), not auth.api. Counters live in Postgres so they survive restarts and replicas.
    rateLimit: { storage: "database" },
    // Railway's edge overwrites X-Real-IP with the client IP (from CF-Connecting-IP when Cloudflare
    // proxies in front). Re-check after the first deploy that it isn't a proxy address.
    advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
    // nextCookies must stay last: it lets server actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
