import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db";
import { createAuth, type Auth } from "./config";

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth(getDb());
  return auth;
}

// Server Components can't set cookies, so this read must not roll the session either: if it bumped
// expiresAt in the database, <SessionRefresher />'s /api/auth call would see nothing to refresh and
// the cookie would still expire. Only SessionRefresher rolls the session (row and cookie together).
export const getSession = cache(async () => {
  return getAuth().api.getSession({ headers: await headers(), query: { disableRefresh: true } });
});
