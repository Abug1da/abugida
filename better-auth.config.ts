// Only for `bun run auth:generate`: the Better Auth CLI reads this to emit src/db/auth-schema.ts.
import { drizzle } from "drizzle-orm/d1";
import { createAuth } from "./src/lib/auth/config";

export const auth = createAuth(drizzle({} as D1Database));
