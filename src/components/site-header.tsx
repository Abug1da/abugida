import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Abugida <span className="font-ethiopic">አቡጊዳ</span>
          </Link>
          <Link href="/lessons" className="text-sm text-muted-foreground hover:text-foreground">
            Lessons
          </Link>
        </nav>
        <Suspense fallback={<div className="h-8 w-32" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
