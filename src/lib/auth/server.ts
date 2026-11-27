import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db";
import { createAuth } from "./config";

export const getAuth = cache(async () => {
  // Better Auth generates random IDs on setup; mark this as request-time so Cache Components
  // never tries to prerender it.
  await connection();
  const { env } = await getCloudflareContext({ async: true });
  return createAuth(await getDb(), env);
});

// Server Components can't set cookies, so this read must not roll the session either: if it bumped
// expiresAt in D1, <SessionRefresher />'s /api/auth call would see nothing to refresh and the cookie
// would still expire. Only SessionRefresher rolls the session (DB row and cookie together).
export const getSession = cache(async () => {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers(), query: { disableRefresh: true } });
});
