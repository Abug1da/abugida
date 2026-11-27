"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

// Server Components read the session but can't write cookies, so without this the session cookie
// would expire a fixed 7 days after login. A client call through /api/auth lets Better Auth roll it.
export function SessionRefresher() {
  useEffect(() => {
    void authClient.getSession();
  }, []);
  return null;
}
