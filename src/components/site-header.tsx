import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b">
      {/* Wraps to two rows on narrow phones instead of overflowing. */}
      <div className="mx-auto flex min-h-14 w-full max-w-page flex-wrap items-center justify-between gap-x-3 gap-y-2 px-gutter py-3">
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-baseline gap-2 font-heading text-lg font-semibold">
            Abugida
            <span lang="am" className="font-ethiopic text-base font-medium text-primary">
              አቡጊዳ
            </span>
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
