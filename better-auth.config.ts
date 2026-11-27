// Only for `bun run auth:generate`: the Better Auth CLI reads this to emit src/db/auth-schema.ts.
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./src/db/schema";
import { createAuth } from "./src/lib/auth/config";

export const auth = createAuth(drizzle.mock({ schema }));
