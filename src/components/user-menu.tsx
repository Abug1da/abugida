import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/server";
import { SessionRefresher } from "./session-refresher";
import { SignOutButton } from "./sign-out-button";

async function readSession() {
  try {
    return await getSession();
  } catch (error) {
    // Auth or D1 trouble shouldn't take down every page through the header.
    console.error("Header session read failed", error);
    return null;
  }
}

// Reads the session at request time, so render it inside <Suspense>.
export async function UserMenu() {
  const session = await readSession();
  if (!session) {
    return (
      <div className="flex gap-2">
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Sign up
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <SessionRefresher />
      <span className="text-sm text-muted-foreground">{session.user.name}</span>
      <SignOutButton />
    </div>
  );
}
